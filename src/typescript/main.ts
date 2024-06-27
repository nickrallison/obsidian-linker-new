import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, Vault } from 'obsidian';

import rustPlugin from "../../pkg/obsidian_linker_plugin_bg.wasm";
import * as plugin from "../../pkg/obsidian_linker_plugin.js";
import { prependListener } from 'process';

// Remember to rename these classes and interfaces!

interface RustPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: RustPluginSettings = {
	mySetting: 'default'
}

export default class RustPlugin extends Plugin {
	settings: RustPluginSettings;

	async onload() {
		await this.loadSettings();

		const buffer = Buffer.from(rustPlugin, 'base64')
		await plugin.default(Promise.resolve(buffer));
		plugin.onload(this);

		this.addCommand({
			id: "parse",
			name: "Parse",
			callback: () => {
				new ParseModal(this.app).open();
			}
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


}

class ParseModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	async onOpen() {
		const { contentEl } = this;
		let filelist: TFile[] = this.app.vault.getMarkdownFiles();
		let file_paths: string[] = filelist.map(file => file.path);
		let file_contents: string[] = await Promise.all(filelist.map(async file => await this.app.vault.cachedRead(file)));
		let linker_obj: plugin.JsLinker = new plugin.JsLinker(file_paths, file_contents);
		let bad_parse_file_errors: string[] = linker_obj.get_bad_parse_files();

		// for (let error of bad_parse_file_errors) {
		// 	console.log(`${error}`);
		// }

		let links: plugin.JsLink[] = linker_obj.get_links();

		for (let link of links) {
			console.log(`${link.debug()}`);
		}

		let text = 'Hi there!';
		contentEl.setText(text);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class RustPluginSettingTab extends PluginSettingTab {
	plugin: RustPlugin;

	constructor(app: App, plugin: RustPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Settings for my awesome plugin.' });

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}

class TFileWrapper {
	contents: string;
	path: string;
	name: string;

	constructor(file: TFile) {
		this.initialize(file);
	}

	async initialize(file: TFile) {
		this.contents = await file.vault.cachedRead(file);
		this.path = file.path;
		this.name = file.name;
	}

	get_name() {
		return this.name;
	}

	get_path() {
		return this.path;
	}

	get_contents() {
		return this.contents;
	}

	set_name(name: string) {
		this.name = name;
	}

	set_path(path: string) {
		this.path = path;
	}

	set_contents(contents: string) {
		this.contents = contents;
	}
}

class PrinterObject {
	constructor() {

	}

	print(str: string) {
		console.log
	}
}

