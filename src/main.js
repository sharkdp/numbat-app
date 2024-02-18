const { invoke } = window.__TAURI__.tauri;

let query_el;
let results_el;

async function calculate() {
  // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
  results_el.innerHTML = await invoke("calculate", { query: query_el.value });
}

window.addEventListener("DOMContentLoaded", () => {
  query_el = document.querySelector("#query");
  results_el = document.querySelector("#results");
  query_el.addEventListener("input", (e) => {
    calculate();
  });

  calculate();
});
