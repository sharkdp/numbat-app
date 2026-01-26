const { invoke } = window.__TAURI__.core;
const { openUrl } = window.__TAURI__.opener;
const { load } = window.__TAURI__.store;
const haptics = window.__TAURI__.haptics;

// Prevent iOS double-tap zoom/scroll jump
let lastTouchEnd = 0;
document.addEventListener('touchend', function(e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, { passive: false });

let query_form_el;
let query_el;
let current_el;
let history_el;
let completions_el;
let completions_wrapper_el;

// Store for persistent history
let store = null;
const HISTORY_KEY = "history";

// History entry structure for persistence
// { input: string, statements: string[], output: string, print_output: string, value: string|null }

async function saveHistory() {
    if (!store) return;

    const entries = [];
    const items = history_el.querySelectorAll(".history_item");
    items.forEach(item => {
        entries.push({
            input: item.dataset.input,
            statements: JSON.parse(item.dataset.statements),
            output: item.dataset.output,
            print_output: item.dataset.printOutput || "",
            value: item.dataset.value || null
        });
    });

    await store.set(HISTORY_KEY, entries);
    await store.save();
}

async function loadHistory() {
    if (!store) return;

    const entries = await store.get(HISTORY_KEY);
    if (!entries || !Array.isArray(entries)) return;

    for (const entry of entries) {
        // Re-execute to restore Numbat context
        await invoke("calculate", { query: entry.input, updateContext: true });

        // Render the history entry
        renderHistoryEntry(entry.input, entry.statements, entry.output, entry.print_output || "", entry.value);
    }
}

function renderHistoryEntry(input, statements, output, print_output, value) {
    let history_entry = document.createElement("div");
    let statementsHtml = statements.join("<br>");
    let printHtml = print_output ? `<span class="print-output">${print_output}</span>` : "";
    let resultHtml = output ? `<span class="numbat-operator">=</span> ${output}` : "";
    history_entry.innerHTML = statementsHtml + (printHtml || resultHtml ? "<br>" : "") + printHtml + resultHtml;
    history_entry.classList.add("history_item");

    // Store data for persistence
    history_entry.dataset.input = input;
    history_entry.dataset.statements = JSON.stringify(statements);
    history_entry.dataset.output = output;
    history_entry.dataset.printOutput = print_output;
    if (value) {
        history_entry.dataset.value = value;
    }

    history_el.appendChild(history_entry);

    // Capture for event handlers
    let original_input = input;
    let long_press_triggered = false;

    if (value) {
        history_entry.addEventListener("click", (e) => {
            if (long_press_triggered) {
                long_press_triggered = false;
                return;
            }
            insertValueInQueryField(value);
            calculate();
        });
    }

    // Long-press to replace input with original query
    let long_press_timer = null;
    history_entry.addEventListener("pointerdown", (e) => {
        long_press_triggered = false;
        long_press_timer = setTimeout(() => {
            long_press_triggered = true;
            haptics?.impactFeedback({ style: "medium" });
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
}

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

// Debounce state for parse errors
let parse_error_timeout = null;
const PARSE_ERROR_DELAY_MS = 300;

function formatOutput(result) {
    let html = "";
    if (result.print_output) {
        html += `<span class="print-output">${result.print_output}</span>`;
    }
    if (result.output) {
        html += result.output;
    }
    return html;
}

async function calculate() {
    let result = await invoke("calculate", { query: query_el.value, updateContext: false });

    // Clear any pending parse error display
    if (parse_error_timeout) {
        clearTimeout(parse_error_timeout);
        parse_error_timeout = null;
    }

    // Parse errors are debounced (likely incomplete input)
    if (result.error_type === "parse") {
        parse_error_timeout = setTimeout(() => {
            current_el.innerHTML = formatOutput(result);
            query_el.classList.add("query_error");
            parse_error_timeout = null;
        }, PARSE_ERROR_DELAY_MS);
        return;
    }

    // All other results shown immediately
    current_el.innerHTML = formatOutput(result);
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

// Completion chip functions

const WORD_SEPARATORS = /[\s+\-*/^()=<>,.;:]+/;

function getCurrentWordBounds() {
    const text = query_el.value;
    const cursor = query_el.selectionStart;

    // Find start of current word (search backwards from cursor)
    let start = cursor;
    while (start > 0 && !WORD_SEPARATORS.test(text[start - 1])) {
        start--;
    }

    // Find end of current word (search forwards from cursor)
    let end = cursor;
    while (end < text.length && !WORD_SEPARATORS.test(text[end])) {
        end++;
    }

    return { start, end, word: text.substring(start, end) };
}

function applyCompletion(completion) {
    const { start, end } = getCurrentWordBounds();
    const text = query_el.value;

    query_el.value = text.substring(0, start) + completion + text.substring(end);
    const newCursor = start + completion.length;
    query_el.setSelectionRange(newCursor, newCursor);
    query_el.focus();

    // Clear completions and recalculate
    completions_el.innerHTML = "";
    completions_wrapper_el.classList.add("hidden");
    calculate();
}

function updateCompletionsOverflow() {
    const hasOverflow = completions_el.scrollWidth > completions_el.clientWidth;
    const scrolledToEnd = completions_el.scrollLeft + completions_el.clientWidth >= completions_el.scrollWidth - 5;
    completions_wrapper_el.classList.toggle("has-overflow", hasOverflow && !scrolledToEnd);
}

async function updateCompletions() {
    const input = query_el.value;

    if (!input.trim()) {
        completions_el.innerHTML = "";
        completions_wrapper_el.classList.add("hidden");
        completions_wrapper_el.classList.remove("has-overflow");
        return;
    }

    const { word } = getCurrentWordBounds();

    // Fetch both regular completions and Unicode completion in parallel
    const [completions, unicodeChar] = await Promise.all([
        invoke("get_completions", { input }),
        word ? invoke("get_unicode_completion", { word }) : Promise.resolve(null)
    ]);

    // Filter out exact matches - no need to suggest what's already typed
    const filtered = completions.filter(c => c !== word);

    completions_el.innerHTML = "";

    const hasUnicode = unicodeChar !== null;
    const hasCompletions = filtered.length > 0;

    if (!hasUnicode && !hasCompletions) {
        completions_wrapper_el.classList.add("hidden");
        completions_wrapper_el.classList.remove("has-overflow");
        return;
    }

    completions_wrapper_el.classList.remove("hidden");

    // Add Unicode replacement chip first (if available)
    if (hasUnicode) {
        const chip = document.createElement("button");
        chip.className = "completion_chip completion_chip_unicode";
        chip.textContent = unicodeChar;
        chip.title = `Replace "${word}" with ${unicodeChar}`;
        chip.addEventListener("click", (e) => {
            e.preventDefault();
            applyCompletion(unicodeChar);
        });
        completions_el.appendChild(chip);
    }

    // Add regular completion chips
    for (const completion of filtered) {
        const chip = document.createElement("button");
        chip.className = "completion_chip";
        chip.textContent = completion;
        chip.addEventListener("click", (e) => {
            e.preventDefault();
            applyCompletion(completion);
        });
        completions_el.appendChild(chip);
    }

    // Check if chips overflow the container
    updateCompletionsOverflow();
}

async function submit() {
    if (query_el.value.trim() == "") {
        return;
    }

    let input = query_el.value;
    let result = await invoke("calculate", { query: input, updateContext: true });

    if (result.is_error) {
        return;
    }

    renderHistoryEntry(input, result.statements, result.output, result.print_output, result.value);
    await saveHistory();

    current_el.innerHTML = "";
    query_el.value = "";
    completions_el.innerHTML = "";
    completions_wrapper_el.classList.add("hidden");
}

async function reset() {
    await invoke("reset");
    current_el.innerHTML = "";
    query_el.value = "";
    history_el.innerHTML = "";
    completions_el.innerHTML = "";
    completions_wrapper_el.classList.add("hidden");

    // Clear stored history
    if (store) {
        await store.delete(HISTORY_KEY);
        await store.save();
    }
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

window.addEventListener("DOMContentLoaded", async () => {
    query_form_el = document.querySelector("#query_form");
    query_el = document.querySelector("#query");
    current_el = document.querySelector("#current");
    history_el = document.querySelector("#history");
    completions_el = document.querySelector("#completions");
    completions_wrapper_el = document.querySelector("#completions_wrapper");

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

    // Initialize store and load history
    store = await load("history.json", { autoSave: false });
    await loadHistory();

    query_el.addEventListener("input", (e) => {
        calculate();
        updateCompletions();
    });

    completions_el.addEventListener("scroll", updateCompletionsOverflow);

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
