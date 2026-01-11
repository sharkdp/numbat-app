// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;

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
    output: String,
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
        output: writer.to_string(),
        value: None,
        statements: vec![],
    }
}

fn interpret(ctx: &mut numbat::Context, query: &str) -> InterpreterResult {
    let formatter = HtmlFormatter;

    match ctx.interpret(query, CodeSource::Text) {
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
                output: formatter.format(&markup, false).to_string(),
                value,
                statements,
            }
        }
        Err(e) => match *e {
            NumbatError::ResolverError(ref err) => return_diagnostic_error(ctx, err),
            NumbatError::NameResolutionError(
                ref err @ (NameResolutionError::IdentifierClash { .. }
                | NameResolutionError::ReservedIdentifier(_)),
            ) => return_diagnostic_error(ctx, err),
            NumbatError::TypeCheckError(ref err) => return_diagnostic_error(ctx, err),
            NumbatError::RuntimeError(ref err) => InterpreterResult {
                is_error: true,
                output: format!("{}", err),
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

struct State {
    ctx: Mutex<numbat::Context>,
}

fn get_numbat_context() -> numbat::Context {
    let importer = BuiltinModuleImporter::default();

    let mut ctx = numbat::Context::new(importer);
    ctx.load_currency_module_on_demand(true);
    let _ = ctx.interpret("use prelude", numbat::resolver::CodeSource::Text);
    ctx
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = State {
        ctx: Mutex::new(get_numbat_context()),
    };

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![calculate, reset, get_units])
        .manage(state)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
