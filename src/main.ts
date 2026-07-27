import { Plugin } from 'obsidian';
import { parseCornell } from './parser';
import { renderCornell } from './renderer';
import { CornellSettings, CornellSettingTab, DEFAULT_SETTINGS } from './settings';

export default class CornellNotesPlugin extends Plugin {
  settings!: CornellSettings;

  /** Track last-rendered source per container element to skip no-op re-renders */
  private lastSourceMap = new WeakMap<HTMLElement, string>();

  /** Track in-flight AbortController per container element so we can cancel stale renders */
  private abortControllerMap = new WeakMap<HTMLElement, AbortController>();

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new CornellSettingTab(this.app, this));

    this.registerMarkdownCodeBlockProcessor(
      'cornell',
      async (source, el, ctx) => {
        // ── Memoization: skip if source hasn't changed ──
        if (this.lastSourceMap.get(el) === source) return;
        this.lastSourceMap.set(el, source);

        // ── Cancel any in-flight render for this element ──
        const prevController = this.abortControllerMap.get(el);
        if (prevController) prevController.abort();

        const controller = new AbortController();
        this.abortControllerMap.set(el, controller);

        // ── Clean old DOM before new render (prevents stale component children) ──
        el.empty();

        const block = parseCornell(source);

        try {
          await renderCornell(
            block, el, this.app, ctx.sourcePath, this, this.settings, controller.signal,
          );
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          throw e;
        }
      },
    );
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()) as CornellSettings;
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
