const { invoke } = window.__TAURI__.core;
const { openUrl } = window.__TAURI__.opener;

let query_form_el;
let query_el;
let current_el;
let history_el;

// Units modal elements
let units_modal_el;
let units_list_el;
let units_data = null;

// Constants modal elements
let constants_modal_el;
let constants_list_el;
let constants_data = null;

// Functions modal elements
let functions_modal_el;
let functions_list_el;
let functions_data = null;

// Help modal element
let help_modal_el;

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

    // Capture the original input for long-press
    let original_input = query_el.value;
    let long_press_triggered = false;

    if (result.value) {
        history_entry.addEventListener("click", (e) => {
            if (long_press_triggered) {
                long_press_triggered = false;
                return;
            }
            insertValueInQueryField(result.value);
            calculate();
        });
    }

    // Long-press to replace input with original query
    let long_press_timer = null;
    history_entry.addEventListener("pointerdown", (e) => {
        long_press_triggered = false;
        long_press_timer = setTimeout(() => {
            long_press_triggered = true;
            query_el.value = original_input;
            query_el.focus();
            calculate();
            long_press_timer = null;
        }, 500);
    });
    history_entry.addEventListener("pointerup", () => {
        if (long_press_timer) {
            clearTimeout(long_press_timer);
            long_press_timer = null;
        }
    });
    history_entry.addEventListener("pointerleave", () => {
        if (long_press_timer) {
            clearTimeout(long_press_timer);
            long_press_timer = null;
        }
    });

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

// Constants panel functions
async function openConstantsPanel() {
    if (!constants_data) {
        constants_data = await invoke("get_constants");
    }
    renderConstants(constants_data);
    constants_modal_el.classList.remove("hidden");
}

function closeConstantsPanel() {
    constants_modal_el.classList.add("hidden");
}

function renderConstants(constants) {
    constants_list_el.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "constants_grid";

    constants.forEach(constant => {
        const btn = document.createElement("button");
        btn.className = "unit_button";
        btn.textContent = constant.name;
        btn.addEventListener("click", () => {
            insertValueInQueryField(constant.name);
            calculate();
            closeConstantsPanel();
        });
        grid.appendChild(btn);
    });

    constants_list_el.appendChild(grid);
}

// Functions panel functions
async function openFunctionsPanel() {
    if (!functions_data) {
        functions_data = await invoke("get_functions");
    }
    renderFunctions(functions_data);
    functions_modal_el.classList.remove("hidden");
}

function closeFunctionsPanel() {
    functions_modal_el.classList.add("hidden");
}

function renderFunctions(groups) {
    functions_list_el.innerHTML = "";

    groups.forEach((group) => {
        const section = document.createElement("div");
        section.className = "dimension_group";

        const header = document.createElement("div");
        header.className = "dimension_header";
        header.innerHTML = `<span class="dimension_arrow"></span>${group.module} <span class="dimension_count">(${group.functions.length})</span>`;
        header.addEventListener("click", () => {
            header.classList.toggle("expanded");
            list.classList.toggle("hidden");
        });

        const list = document.createElement("div");
        list.className = "functions_list hidden";

        group.functions.forEach(func => {
            const item = document.createElement("div");
            item.className = "function_item";

            const nameEl = document.createElement("span");
            nameEl.className = "function_name";
            nameEl.textContent = func.fn_name;

            const sigEl = document.createElement("span");
            sigEl.className = "function_signature";
            sigEl.textContent = func.signature;

            item.appendChild(nameEl);
            item.appendChild(sigEl);

            if (func.description) {
                item.title = func.description;
            }

            item.addEventListener("click", () => {
                insertValueInQueryField(func.fn_name + "(");
                calculate();
                closeFunctionsPanel();
            });

            list.appendChild(item);
        });

        section.appendChild(header);
        section.appendChild(list);
        functions_list_el.appendChild(section);
    });
}

// Help panel functions
async function openHelpPanel() {
    const version = await invoke("get_version");
    document.querySelector("#help_version").textContent = `Numbat v${version}`;
    help_modal_el.classList.remove("hidden");
}

function closeHelpPanel() {
    help_modal_el.classList.add("hidden");
}

window.addEventListener("DOMContentLoaded", () => {
    query_form_el = document.querySelector("#query_form");
    query_el = document.querySelector("#query");
    current_el = document.querySelector("#current");
    history_el = document.querySelector("#history");

    // Units modal elements
    units_modal_el = document.querySelector("#units_modal");
    units_list_el = document.querySelector("#units_list");

    // Constants modal elements
    constants_modal_el = document.querySelector("#constants_modal");
    constants_list_el = document.querySelector("#constants_list");

    // Functions modal elements
    functions_modal_el = document.querySelector("#functions_modal");
    functions_list_el = document.querySelector("#functions_list");

    // Help modal element
    help_modal_el = document.querySelector("#help_modal");

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
    document.querySelector("#button_unit").addEventListener("click", (e) => {
        openUnitsPanel();
    });

    // Modal close handlers
    units_modal_el.querySelector(".modal_backdrop").addEventListener("click", closeUnitsPanel);
    units_modal_el.querySelector(".modal_close").addEventListener("click", closeUnitsPanel);

    // Constants button
    document.querySelector("#button_const").addEventListener("click", (e) => {
        openConstantsPanel();
    });

    // Constants modal close handlers
    constants_modal_el.querySelector(".modal_backdrop").addEventListener("click", closeConstantsPanel);
    constants_modal_el.querySelector(".modal_close").addEventListener("click", closeConstantsPanel);

    // Functions button
    document.querySelector("#button_fn").addEventListener("click", (e) => {
        openFunctionsPanel();
    });

    // Functions modal close handlers
    functions_modal_el.querySelector(".modal_backdrop").addEventListener("click", closeFunctionsPanel);
    functions_modal_el.querySelector(".modal_close").addEventListener("click", closeFunctionsPanel);

    // Help button
    document.querySelector("#button_help").addEventListener("click", (e) => {
        openHelpPanel();
    });

    // Help modal close handlers
    help_modal_el.querySelector(".modal_backdrop").addEventListener("click", closeHelpPanel);
    help_modal_el.querySelector(".modal_close").addEventListener("click", closeHelpPanel);

    // Help links - open URLs in system browser
    document.querySelectorAll(".help_link[data-url]").forEach(link => {
        link.addEventListener("click", () => {
            openUrl(link.dataset.url);
        });
    });
});
