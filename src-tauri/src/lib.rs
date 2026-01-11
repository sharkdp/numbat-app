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
        .invoke_handler(tauri::generate_handler![calculate, reset])
        .manage(state)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
