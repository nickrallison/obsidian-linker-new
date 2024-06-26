import { App, Component, Editor, MarkdownRenderer, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, Vault } from 'obsidian';

import rustPlugin from "../../pkg/obsidian_linker_plugin_bg.wasm";
import * as plugin from "../../pkg/obsidian_linker_plugin.js";
import { prependListener } from 'process';

// Remember to rename these classes and interfaces!

class RustPluginSettings {
	caseInsensitive: boolean;
	linkToSelf: boolean;
	color: string;

	constructor(caseInsensitive: boolean, linkToSelf: boolean, color: string) {
		this.caseInsensitive = caseInsensitive;
		this.linkToSelf = linkToSelf;
		this.color = color;
	}
	set_case_insensitive(caseSensitive: boolean) {
		this.caseInsensitive = caseSensitive;
	}
	set_link_to_self(linkToSelf: boolean) {
		this.linkToSelf = linkToSelf;
	}
	get_case_insensitive() {
		return this.caseInsensitive;
	}
	get_link_to_self() {
		return this.linkToSelf;
	}

}

const DEFAULT_SETTINGS: RustPluginSettings = new RustPluginSettings(true, false, "red");

interface FileChange {
	file_path: string;
	new_content: string;
	colored_content: string;
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
				this.run_linker()
			}
		});

		this.addSettingTab(new RustPluginSettingTab(this.app, this));
	}

	async run_linker() {
		console.log('Parsing Files');
		let filelist: TFile[] = this.app.vault.getMarkdownFiles();
		let file_paths: string[] = filelist.map(file => file.path);
		let file_map: { [key: string]: string } = {};
		for (let file of filelist) {
			file_map[file.path] = await this.app.vault.cachedRead(file);
		}
		let file_contents: string[] = await Promise.all(filelist.map(async file => await this.app.vault.cachedRead(file)));
		let linker_obj: plugin.JsLinker = new plugin.JsLinker(file_paths, file_contents);
		let bad_parse_file_errors: string[] = linker_obj.get_bad_parse_files();

		let byte_increament_map: { [key: string]: number } = {};
		console.log('Getting Links, One Moment Please...');
		let links: plugin.JsLink[] = linker_obj.get_links(this.settings.caseInsensitive, this.settings.linkToSelf);
		for (let link of links) {
			let slice_start = link.get_start();
			let slice_end = link.get_end();
			let source = link.get_source();
			let target = link.get_target();
			let link_text = link.get_link_text();
			let link_len = link_text.length;
			let content = file_map[source];

			let encoder = new TextEncoder();
			let decoder = new TextDecoder();
			let byteArray = encoder.encode(content);

			let content_as_bytes = encoder.encode(content);

			let slicedArray = byteArray.slice(slice_start, slice_end);
			let slice_str = decoder.decode(slicedArray);
			let replace_str = `[[${target}|${link_text}]]`;

			let replaced_as_bytes = encoder.encode(replace_str);
			let increment = replaced_as_bytes.length - (slice_end - slice_start);
			let color = this.settings.color;
			// <span style=color:#2ecc71>This is a test</span>  
			let colored_content = decoder.decode(content_as_bytes.slice(0, slice_start)) + `<span style="color:${color}">\\[\\[${target}\\|${link_text}\\]\\]</span>` + decoder.decode(content_as_bytes.slice(slice_end));
			let new_content: string = decoder.decode(content_as_bytes.slice(0, slice_start)) + `[[${target}|${link_text}]]` + decoder.decode(content_as_bytes.slice(slice_end));

			let file_change: FileChange = {
				file_path: source,
				new_content: new_content,
				colored_content: colored_content
			}
			console.log(link.debug());

			// create model with file_change
			let modal = new ParseModal(this, file_change);
			modal.open();

			await modal.wait_for_submit();

			if (modal.accepted) {
				console.log('Accepted changes for ' + source);
				let tfile: TFile = this.app.vault.getAbstractFileByPath(source) as TFile;
				file_map[source] = new_content;
				await this.app.vault.modify(tfile, new_content);
				byte_increament_map[source] = increment;
			}

			if (modal.declined) {
				console.log('Declined changes for ' + source);
				// file_map[source] = new_content;
				// byte_increament_map[source] = increment;
			}

			// modal does its this
			// modal.close();

			// MarkdownRenderer.renderMarkdown(new_content, divContainer, "", divContainer);

		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


}

class ParseModal extends Modal {
	plugin: RustPlugin;
	change: FileChange;

	accepted: boolean;
	declined: boolean;

	constructor(plugin: RustPlugin, file_change: FileChange) {
		super(plugin.app);
		this.plugin = plugin;
		this.change = file_change;
		this.accepted = false;
		this.declined = false;
	}

	async onOpen() {

		const { contentEl } = this;

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Accept")
					.setCta()
					.onClick(() => {

						this.close();
						this.accepted = true;
					}));

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Decline")
					.setCta()
					.onClick(() => {

						this.close();
						this.declined = true;
					}));

		await MarkdownRenderer.renderMarkdown(this.change.colored_content, contentEl, "/", this.plugin);;

	}

	onSubmit() {
		console.log('Submitting');
	}

	async wait_for_submit() {
		while (!this.accepted && !this.declined) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
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
			.setName('Case Insensitive')
			.setDesc('Whether to use a case Insensitive search when linking files')
			.addToggle(text => text
				.setValue(this.plugin.settings.caseInsensitive)
				.onChange(async (value) => {
					this.plugin.settings.caseInsensitive = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Link to Self')
			.setDesc('Whether to link to the same file')
			.addToggle(text => text
				.setValue(this.plugin.settings.linkToSelf)
				.onChange(async (value) => {
					this.plugin.settings.linkToSelf = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Color of Links')
			.setDesc('Color to show links in the preview (no effect on the actual file), any supported CSS color is valid. Default is "red", but could also use hex: "#2ecc71".')
			.addText(text => text
				.setValue(this.plugin.settings.color)
				.onChange(async (value) => {
					this.plugin.settings.color = value;
					await this.plugin.saveSettings();
				}));
	}
}

// class TFileWrapper {
// 	contents: string;
// 	path: string;
// 	name: string;

// 	constructor(file: TFile) {
// 		this.initialize(file);
// 	}

// 	async initialize(file: TFile) {
// 		this.contents = await file.vault.cachedRead(file);
// 		this.path = file.path;
// 		this.name = file.name;
// 	}

// 	get_name() {
// 		return this.name;
// 	}

// 	get_path() {
// 		return this.path;
// 	}

// 	get_contents() {
// 		return this.contents;
// 	}

// 	set_name(name: string) {
// 		this.name = name;
// 	}

// 	set_path(path: string) {
// 		this.path = path;
// 	}

// 	set_contents(contents: string) {
// 		this.contents = contents;
// 	}
// }


