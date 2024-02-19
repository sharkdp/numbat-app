const { invoke } = window.__TAURI__.core;

let query_form_el;
let query_el;
let current_el;
let history_el;
let button_units_el;
let button_constants_el;

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

window.addEventListener("DOMContentLoaded", () => {
    query_form_el = document.querySelector("#query_form");
    query_el = document.querySelector("#query");
    current_el = document.querySelector("#current");
    history_el = document.querySelector("#history");

    query_el.addEventListener("input", (e) => {
        calculate();
    });

    query_form_el.addEventListener("submit", (e) => {
        e.preventDefault();
        submit();
    });

});
