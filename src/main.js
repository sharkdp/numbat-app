const { invoke } = window.__TAURI__.core;

let query_form_el;
let query_el;
let current_el;
let history_el;
let button_units_el;
let button_constants_el;

async function calculate() {
    let result = await invoke("calculate", { query: query_el.value, updateContext: false });
    console.log(result);
    if (result.output == "") {
        current_el.innerHTML = "&nbsp;";
    } else {
        current_el.innerHTML = result.output;
    }
    if (result.is_error) {
        query_el.classList.add("query_error");
    } else {
        query_el.classList.remove("query_error");
    }
}

async function submit() {
    let result = await invoke("calculate", { query: query_el.value, updateContext: true });

    if (result.is_error) {
        // TODO: give some kind of visual feedback
        return;
    }

    let history_entry = document.createElement("div");
    history_entry.innerHTML = result.output;
    history_entry.classList.add("history_item");
    history_el.appendChild(history_entry);

    history_entry.addEventListener("click", (e) => {
        query_el.value = result.value;
        calculate();
        // focus on query_el, last character:
        query_el.focus();
        query_el.setSelectionRange(query_el.value.length, query_el.value.length);
    });

    current_el.innerHTML = "&nbsp;";
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
