const { invoke } = window.__TAURI__.core;

let query_form_el;
let query_el;
let current_el;
let history_el;

// Units modal elements
let units_modal_el;
let units_list_el;
let units_data = null;

async function calculate() {
    let result = await invoke("calculate", { query: query_el.value, updateContext: false });

    if (result.output == "") {
        current_el.innerHTML = "";
    } else {
        current_el.innerHTML = result.output;
    }
    if (result.is_error) {
        query_el.classList.add("query_error");
    } else {
        query_el.classList.remove("query_error");
    }
}

function insertValueInQueryField(value) {
    if (query_el.selectionStart || query_el.selectionStart == '0') {
        let start_pos = query_el.selectionStart;
        let end_pos = query_el.selectionEnd;
        query_el.value = query_el.value.substring(0, start_pos)
            + value
            + query_el.value.substring(end_pos, query_el.value.length);
        
        query_el.setSelectionRange(start_pos + value.length, start_pos + value.length);
    } else {
        query_el.value += value;
        query_el.setSelectionRange(query_el.value.length, query_el.value.length);
    }
    query_el.focus();
}

async function submit() {
    if (query_el.value.trim() == "") {
        return;
    }

    let result = await invoke("calculate", { query: query_el.value, updateContext: true });

    if (result.is_error) {
        return;
    }

    let history_entry = document.createElement("div");
    let statements = result.statements.join("<br>");
    history_entry.innerHTML = statements + "<br><span class=\"numbat-operator\">=</span> " + result.output;
    history_entry.classList.add("history_item");
    history_el.appendChild(history_entry);

    if (result.value) {
        history_entry.addEventListener("click", (e) => {
            insertValueInQueryField(result.value);
            calculate();
        });
    }

    current_el.innerHTML = "";
    query_el.value = "";
}

async function reset() {
    await invoke("reset");
    current_el.innerHTML = "";
    query_el.value = "";
    history_el.innerHTML = "";
}

// Units panel functions
async function openUnitsPanel() {
    if (!units_data) {
        units_data = await invoke("get_units");
    }
    renderUnits(units_data);
    units_modal_el.classList.remove("hidden");
}

function closeUnitsPanel() {
    units_modal_el.classList.add("hidden");
}

function renderUnits(groups) {
    units_list_el.innerHTML = "";

    groups.forEach((group, index) => {
        const section = document.createElement("div");
        section.className = "dimension_group";

        const header = document.createElement("div");
        header.className = "dimension_header";
        header.innerHTML = `<span class="dimension_arrow"></span>${group.dimension} <span class="dimension_count">(${group.units.length})</span>`;
        header.addEventListener("click", () => {
            header.classList.toggle("expanded");
            grid.classList.toggle("hidden");
        });

        const grid = document.createElement("div");
        grid.className = "units_grid hidden";

        group.units.forEach(unit => {
            const btn = document.createElement("button");
            btn.className = "unit_button";
            btn.textContent = unit.display_name;
            btn.title = unit.canonical_name;
            btn.addEventListener("click", () => {
                insertValueInQueryField(unit.canonical_name);
                calculate();
                closeUnitsPanel();
            });
            grid.appendChild(btn);
        });

        section.appendChild(header);
        section.appendChild(grid);
        units_list_el.appendChild(section);
    });
}

window.addEventListener("DOMContentLoaded", () => {
    query_form_el = document.querySelector("#query_form");
    query_el = document.querySelector("#query");
    current_el = document.querySelector("#current");
    history_el = document.querySelector("#history");

    // Units modal elements
    units_modal_el = document.querySelector("#units_modal");
    units_list_el = document.querySelector("#units_list");

    query_el.addEventListener("input", (e) => {
        calculate();
    });

    query_form_el.addEventListener("submit", (e) => {
        e.preventDefault();
        submit();
    });

    document.querySelector("#button_reset").addEventListener("click", (e) => {
        reset();
    });

    // Units button
    document.querySelector("#button_units").addEventListener("click", (e) => {
        openUnitsPanel();
    });

    // Modal close handlers
    units_modal_el.querySelector(".modal_backdrop").addEventListener("click", closeUnitsPanel);
    units_modal_el.querySelector(".modal_close").addEventListener("click", closeUnitsPanel);
});
