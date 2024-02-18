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
use numbat::markup::Formatter;
use numbat::module_importer::BuiltinModuleImporter;
use numbat::pretty_print::PrettyPrint;
use numbat::resolver::CodeSource;

#[derive(Serialize)]
struct InterpreterResult {
    is_error: bool,
    output: String,
    statements: Vec<String>,
    value: Option<String>,
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

            let value = result.value_as_string();

            let statements: Vec<String> = statements
                .iter()
                .map(|s| {
                    let s = formatter.format(&s.pretty_print(), false);
                    s
                })
                .collect();

            InterpreterResult {
                is_error: false,
                output: formatter.format(&markup, false),
                value,
                statements,
            }
        }
        Err(NumbatError::ResolverError(e)) => return_diagnostic_error(ctx, &e),
        Err(NumbatError::NameResolutionError(
            e @ (NameResolutionError::IdentifierClash { .. }
            | NameResolutionError::ReservedIdentifier(_)),
        )) => return_diagnostic_error(ctx, &e),
        Err(NumbatError::TypeCheckError(e)) => return_diagnostic_error(ctx, &e),
        Err(NumbatError::RuntimeError(e)) => return_diagnostic_error(ctx, &e),
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

struct State {
    ctx: Mutex<numbat::Context>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let importer = BuiltinModuleImporter::default();

    let mut ctx = numbat::Context::new(importer);
    ctx.load_currency_module_on_demand(true);
    let _ = ctx.interpret("use prelude", numbat::resolver::CodeSource::Text);
    let state = State {
        ctx: Mutex::new(ctx),
    };

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![calculate])
        .manage(state)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
