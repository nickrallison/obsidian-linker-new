use js_sys::JsString;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(module = "obsidian")]
extern "C" {
    #[derive(Clone)]
    pub type Plugin;
    #[wasm_bindgen(method, getter)]
    pub fn get_app(this: &Plugin) -> App;
    pub type App;
    #[wasm_bindgen(method, getter)]
    pub fn get_vault(this: &App) -> Vault;
    pub type Vault;
    #[wasm_bindgen(method)]
    pub fn cachedRead(this: &Vault, file: &TFile) -> JsValue;
    pub type TFile;
    pub type TFileWrapper;
    #[wasm_bindgen(method, getter)]
    pub fn get_name(this: &TFileWrapper) -> JsString;
    #[wasm_bindgen(method, getter)]
    pub fn get_path(this: &TFileWrapper) -> JsString;
    #[wasm_bindgen(method, getter)]
    pub fn get_contents(this: &TFileWrapper) -> JsString;
    #[wasm_bindgen(method, setter)]
    pub fn set_contents(this: &TFileWrapper, contents: JsString);
    pub type Notice;

    #[wasm_bindgen(structural, method)]
    pub fn addCommand(this: &Plugin, command: JsValue);

    #[wasm_bindgen(constructor)]
    pub fn new(message: &str) -> Notice;

    #[wasm_bindgen(structural, method)]
    pub fn getFiles(vault: &Vault) -> Vec<TFile>;

    pub type PrinterObject;

    #[wasm_bindgen(method)]
    pub fn printer(this: &PrinterObject, s: &str);

    pub type RustPluginSettings;
    #[wasm_bindgen(method, setter)]
    pub fn set_case_insensitive(this: &RustPluginSettings, case_insensitive: bool);
    #[wasm_bindgen(method, setter)]
    pub fn set_link_to_self(this: &RustPluginSettings, link_to_self: bool);
    #[wasm_bindgen(method, getter)]
    pub fn get_case_insensitive(this: &RustPluginSettings) -> bool;
    #[wasm_bindgen(method, getter)]
    pub fn get_link_to_self(this: &RustPluginSettings) -> bool;

}
