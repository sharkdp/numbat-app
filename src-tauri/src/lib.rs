// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};

use numbat::buffered_writer::BufferedWriter;
use numbat::diagnostic::ErrorDiagnostic;
use numbat::NameResolutionError;
use numbat::NumbatError;
use serde::Serialize;

use numbat::html_formatter::HtmlFormatter;
use numbat::html_formatter::HtmlWriter;
use numbat::markup::{plain_text_format, Formatter};
use numbat::module_importer::BuiltinModuleImporter;
use numbat::pretty_print::PrettyPrint;
use numbat::resolver::CodeSource;
use std::collections::BTreeMap;

#[derive(Serialize)]
struct InterpreterResult {
    is_error: bool,
    /// Error type: "parse", "typecheck", "name", "runtime", or null for success
    error_type: Option<String>,
    output: String,
    print_output: String,
    statements: Vec<String>,
    value: Option<String>,
}

#[derive(Serialize)]
struct UnitInfo {
    canonical_name: String,
    display_name: String,
}

#[derive(Serialize)]
struct UnitGroup {
    dimension: String,
    units: Vec<UnitInfo>,
}

fn return_diagnostic_error(
    ctx: &numbat::Context,
    error: &dyn ErrorDiagnostic,
    error_type: &str,
) -> InterpreterResult {
    use codespan_reporting::term::{self, Config};

    let mut writer = HtmlWriter::new();
    let config = Config::default();

    let resolver = ctx.resolver();

    for diagnostic in error.diagnostics() {
        term::emit(&mut writer, &config, &resolver.files, &diagnostic).unwrap();
    }

    InterpreterResult {
        is_error: true,
        error_type: Some(error_type.to_string()),
        output: writer.to_string(),
        print_output: String::new(),
        value: None,
        statements: vec![],
    }
}

fn interpret(ctx: &mut numbat::Context, query: &str) -> InterpreterResult {
    use std::sync::Arc;

    let formatter = HtmlFormatter;

    // Capture print output (needs Arc<Mutex> for Send requirement)
    let print_output = Arc::new(Mutex::new(String::new()));
    let print_output_clone = print_output.clone();

    let mut settings = numbat::InterpreterSettings {
        print_fn: Box::new(move |markup: &numbat::markup::Markup| {
            let formatted = HtmlFormatter.format(markup, false);
            let mut output = print_output_clone.lock().unwrap();
            output.push_str(&formatted);
            output.push('\n');
        }),
    };

    match ctx.interpret_with_settings(&mut settings, query, CodeSource::Text) {
        Ok((statements, result)) => {
            let registry = ctx.dimension_registry();
            let markup = result.to_markup(statements.last(), registry, true, false);

            let value = result.value_as_string().map(|s| s.to_string());

            let statements: Vec<String> = statements
                .iter()
                .map(|s| formatter.format(&s.pretty_print(), false).to_string())
                .collect();

            InterpreterResult {
                is_error: false,
                error_type: None,
                output: formatter.format(&markup, false).to_string(),
                print_output: print_output.lock().unwrap().clone(),
                value,
                statements,
            }
        }
        Err(e) => match *e {
            NumbatError::ResolverError(ref err) => return_diagnostic_error(ctx, err, "parse"),
            NumbatError::NameResolutionError(
                ref err @ (NameResolutionError::IdentifierClash { .. }
                | NameResolutionError::ReservedIdentifier(_)),
            ) => return_diagnostic_error(ctx, err, "name"),
            NumbatError::TypeCheckError(ref err) => return_diagnostic_error(ctx, err, "typecheck"),
            NumbatError::RuntimeError(ref err) => InterpreterResult {
                is_error: true,
                error_type: Some("runtime".to_string()),
                output: format!("{}", err),
                print_output: print_output.lock().unwrap().clone(),
                value: None,
                statements: vec![],
            },
        },
    }
}

#[tauri::command]
fn calculate(state: tauri::State<State>, query: &str, update_context: bool) -> InterpreterResult {
    let mut ctx = state.ctx.lock().unwrap();

    if update_context {
        interpret(&mut ctx, query)
    } else {
        let mut throwaway_ctx = ctx.clone();
        interpret(&mut throwaway_ctx, query)
    }
}

#[tauri::command]
fn reset(state: tauri::State<State>) {
    let mut ctx = state.ctx.lock().unwrap();

    *ctx = get_numbat_context();
}

#[tauri::command]
fn get_units(state: tauri::State<State>) -> Vec<UnitGroup> {
    let ctx = state.ctx.lock().unwrap();

    let mut groups: BTreeMap<String, Vec<UnitInfo>> = BTreeMap::new();

    for (_unit_name, (_base_rep, metadata)) in ctx.unit_representations() {
        let dimension = plain_text_format(&metadata.readable_type, false).to_string();

        // Skip dimensionless/scalar units
        if dimension == "Scalar" || dimension.is_empty() {
            continue;
        }

        // Get the canonical name (first alias, preferring short form)
        let canonical_name = metadata
            .aliases
            .first()
            .map(|(name, _)| name.to_string())
            .unwrap_or_default();

        if canonical_name.is_empty() {
            continue;
        }

        // Get the display name
        let display_name = metadata
            .name
            .as_ref()
            .map(|n| n.to_string())
            .unwrap_or_else(|| canonical_name.clone());

        let unit = UnitInfo {
            canonical_name,
            display_name,
        };

        groups.entry(dimension).or_default().push(unit);
    }

    // Priority dimensions (SI base units + common ones)
    let priority_dimensions = [
        "Length",
        "Mass",
        "Time",
        "ElectricCurrent",
        "Temperature",
        "AmountOfSubstance",
        "LuminousIntensity",
        "DigitalInformation",
        "Money",
    ];

    fn dimension_priority(dim: &str, priority_list: &[&str]) -> usize {
        priority_list
            .iter()
            .position(|&d| d == dim)
            .unwrap_or(usize::MAX)
    }

    // Convert to Vec<UnitGroup> and sort
    let mut result: Vec<UnitGroup> = groups
        .into_iter()
        .map(|(dimension, mut units)| {
            units.sort_by(|a, b| a.display_name.cmp(&b.display_name));
            // Remove duplicates by display_name
            units.dedup_by(|a, b| a.display_name == b.display_name);
            UnitGroup { dimension, units }
        })
        .collect();

    // Sort by priority, then alphabetically
    result.sort_by(|a, b| {
        let pa = dimension_priority(&a.dimension, &priority_dimensions);
        let pb = dimension_priority(&b.dimension, &priority_dimensions);
        pa.cmp(&pb).then_with(|| a.dimension.cmp(&b.dimension))
    });

    result
}

#[derive(Serialize)]
struct ConstantInfo {
    name: String,
}

#[derive(Serialize)]
struct FunctionInfoResponse {
    fn_name: String,
    name: Option<String>,
    signature: String,
    description: Option<String>,
}

#[derive(Serialize)]
struct FunctionGroup {
    module: String,
    functions: Vec<FunctionInfoResponse>,
}

#[tauri::command]
fn get_functions(state: tauri::State<State>) -> Vec<FunctionGroup> {
    use numbat::resolver::CodeSource;

    let ctx = state.ctx.lock().unwrap();

    let mut groups: BTreeMap<String, Vec<FunctionInfoResponse>> = BTreeMap::new();

    for func_info in ctx.functions() {
        let module = match &func_info.code_source {
            CodeSource::Module(path, _) => path.to_string(),
            CodeSource::Text => "User-defined".to_string(),
            CodeSource::Internal => "Internal".to_string(),
            CodeSource::File(path) => path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("File")
                .to_string(),
        };

        let func = FunctionInfoResponse {
            fn_name: func_info.fn_name.to_string(),
            name: func_info.name.as_ref().map(|n| n.to_string()),
            signature: func_info.signature_str.to_string(),
            description: func_info.description.as_ref().map(|d| d.to_string()),
        };

        groups.entry(module).or_default().push(func);
    }

    // Sort functions within each group alphabetically by fn_name
    let mut result: Vec<FunctionGroup> = groups
        .into_iter()
        .map(|(module, mut functions)| {
            functions.sort_by(|a, b| a.fn_name.cmp(&b.fn_name));
            FunctionGroup { module, functions }
        })
        .collect();

    // Sort groups alphabetically by module name
    result.sort_by(|a, b| a.module.cmp(&b.module));

    result
}

#[tauri::command]
fn get_constants(state: tauri::State<State>) -> Vec<ConstantInfo> {
    let ctx = state.ctx.lock().unwrap();

    let mut constants: Vec<ConstantInfo> = ctx
        .variable_names()
        .map(|var_name| ConstantInfo {
            name: var_name.to_string(),
        })
        .collect();

    constants.sort_by(|a, b| a.name.cmp(&b.name));
    constants
}

#[tauri::command]
fn get_completions(state: tauri::State<State>, input: &str) -> Vec<String> {
    let ctx = state.ctx.lock().unwrap();

    // Extract the last word/token being typed
    let word_part = input
        .split(|c: char| c.is_whitespace() || "+-*/^()=<>,.;:".contains(c))
        .last()
        .unwrap_or("");

    if word_part.is_empty() {
        return vec![];
    }

    ctx.get_completions_for(word_part, true)
        .take(6)
        .collect()
}

#[tauri::command]
fn get_unicode_completion(word: &str) -> Option<String> {
    use numbat::unicode_input::UNICODE_INPUT;

    // Find exact match for the word in UNICODE_INPUT
    for (aliases, unicode_char) in UNICODE_INPUT {
        if aliases.contains(&word) {
            return Some(unicode_char.to_string());
        }
    }
    None
}

#[tauri::command]
fn get_version() -> String {
    // Version from numbat's Cargo.toml, updated manually when upgrading
    "1.18.0".to_string()
}

struct State {
    ctx: Arc<Mutex<numbat::Context>>,
}

fn get_numbat_context() -> numbat::Context {
    let importer = BuiltinModuleImporter::default();

    let mut ctx = numbat::Context::new(importer);
    ctx.load_currency_module_on_demand(true);
    let _ = ctx.interpret("use prelude", numbat::resolver::CodeSource::Text);

    // For mobile Numbat, we load a few additional modules by default.
    // Users are less likely to create their own variables/functions, so we
    // are not too concerned about namespace pollution.
    let _ = ctx.interpret("use extra::astronomy", numbat::resolver::CodeSource::Text);
    let _ = ctx.interpret("use units::hartree", numbat::resolver::CodeSource::Text);

    ctx
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ctx = Arc::new(Mutex::new(get_numbat_context()));

    // Prefetch exchange rates and load currency module in background thread
    {
        let ctx = ctx.clone();
        std::thread::spawn(move || {
            numbat::Context::prefetch_exchange_rates();
            let mut ctx = ctx.lock().unwrap();
            let _ = ctx.interpret("use units::currencies", CodeSource::Internal);
        });
    }

    let state = State { ctx };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_haptics::init())
        .invoke_handler(tauri::generate_handler![
            calculate,
            reset,
            get_units,
            get_constants,
            get_functions,
            get_completions,
            get_unicode_completion,
            get_version
        ])
        .manage(state)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
