// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;

use numbat::markup::{FormatType, FormattedString, Formatter};
use numbat::module_importer::BuiltinModuleImporter;
use numbat::pretty_print::PrettyPrint;
use numbat::resolver::CodeSource;
use numbat::InterpreterResult;

pub struct HtmlFormatter;

use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};

pub fn html_format(class: Option<&str>, content: &str) -> String {
    if content.is_empty() {
        return "".into();
    }

    let content = html_escape::encode_text(content);

    if let Some(class) = class {
        format!("<span class=\"numbat-{class}\">{content}</span>")
    } else {
        content.into()
    }
}

impl Formatter for HtmlFormatter {
    fn format_part(
        &self,
        FormattedString(_output_type, format_type, s): &FormattedString,
    ) -> String {
        let css_class = match format_type {
            FormatType::Whitespace => None,
            FormatType::Emphasized => Some("emphasized"),
            FormatType::Dimmed => Some("dimmed"),
            FormatType::Text => None,
            FormatType::String => Some("string"),
            FormatType::Keyword => Some("keyword"),
            FormatType::Value => Some("value"),
            FormatType::Unit => Some("unit"),
            FormatType::Identifier => Some("identifier"),
            FormatType::TypeIdentifier => Some("type-identifier"),
            FormatType::Operator => Some("operator"),
            FormatType::Decorator => Some("decorator"),
        };
        html_format(css_class, s)
    }
}

#[tauri::command]
fn calculate(state: tauri::State<State>, query: &str) -> String {
    let formatter = HtmlFormatter;

    let mut ctx = state.ctx.lock().unwrap();
    let result = ctx.interpret(query, CodeSource::Text);
    match result {
        Ok((statements, iresult)) => {
            let s: Vec<String> = statements
                .iter()
                .map(|s| {
                    let s = formatter.format(&s.pretty_print(), false);
                    s
                })
                .collect();

            let registry = ctx.dimension_registry();
            let markup = iresult.to_markup(statements.last(), registry, true);
            let s = s.join("<br>");
            format!("{s}<br>{}\n", formatter.format(&markup, true))
        }
        Err(e) => {
            return format!("{:}\n", e);
        }
    }
}

struct State {
    ctx: Mutex<numbat::Context>,
}

fn main() {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let file_submenu = Submenu::new("File", Menu::new().add_item(quit));

    let metre = CustomMenuItem::new("metre".to_string(), "Metre");
    let inch = CustomMenuItem::new("inch".to_string(), "Inch");
    let length_submenu = Submenu::new("Length", Menu::new().add_item(metre).add_item(inch));
    let second = CustomMenuItem::new("second".to_string(), "Second");
    let minute = CustomMenuItem::new("minute".to_string(), "Minute");
    let time_submenu = Submenu::new("Time", Menu::new().add_item(second).add_item(minute));
    let units_submenu = Submenu::new(
        "Units",
        Menu::new()
            .add_submenu(length_submenu)
            .add_submenu(time_submenu),
    );

    let menu = Menu::new()
        .add_submenu(file_submenu)
        .add_submenu(units_submenu);

    let importer = BuiltinModuleImporter::default();

    let mut ctx = numbat::Context::new(importer);
    ctx.load_currency_module_on_demand(true);
    let _ = ctx.interpret("use prelude", numbat::resolver::CodeSource::Text);
    let state = State {
        ctx: Mutex::new(ctx),
    };

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|event| match event.menu_item_id() {
            "quit" => {
                std::process::exit(0);
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![calculate])
        .manage(state)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
