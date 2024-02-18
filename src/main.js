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

    history_el.innerHTML = "<div class=\"history_item\" data-result=\"" + result.value + "\">"+ result.output + "</div>" + history_el.innerHTML;
    current_el.innerHTML = "&nbsp;";
    query_el.value = "";

    // Attach event to new .history_item elements
    let history_items = document.querySelectorAll(".history_item");
    history_items.forEach((el) => {
      el.addEventListener("click", (e) => {
        query_el.value = el.attributes["data-result"].value;
        calculate();
        // focus on query_el, last character:
        query_el.focus();
        query_el.setSelectionRange(query_el.value.length, query_el.value.length);
      });
    });
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
