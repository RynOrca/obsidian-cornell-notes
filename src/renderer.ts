import { App, Component, MarkdownRenderer } from 'obsidian';
import type { CornellBlock } from './parser';
import type { CornellSettings } from './settings';

/**
 * Apply block-level CSS custom properties.
 * Extracted so we can call it once before any async work.
 */
function applyBlockStyles(
  blockEl: HTMLElement,
  effective: { cueWidth: number; borderStyle: string; borderColor?: string; accentBorderThickness?: string; rowBorderThickness?: string },
): void {
  blockEl.style.setProperty('--cornell-cue-width', `${effective.cueWidth}%`);

  if (effective.borderStyle === 'off') {
    blockEl.classList.add('cornell-no-borders');
  } else {
    blockEl.style.setProperty('--cornell-border-style', effective.borderStyle);
    if (effective.borderColor) {
      blockEl.style.setProperty('--cornell-border-color', effective.borderColor);
    }
    if (effective.accentBorderThickness) {
      blockEl.style.setProperty('--cornell-accent-border-thickness', effective.accentBorderThickness);
    }
    if (effective.rowBorderThickness) {
      blockEl.style.setProperty('--cornell-row-border-thickness', effective.rowBorderThickness);
    }
  }
}

export async function renderCornell(
  block: CornellBlock,
  container: HTMLElement,
  app: App,
  sourcePath: string,
  component: Component,
  settings: CornellSettings,
  signal?: AbortSignal,
): Promise<void> {
  // Check abort before any work
  if (signal?.aborted) return;

  const effective = { ...settings, ...block.overrides };

  // ── Step 1: Build full DOM skeleton synchronously ──
  const blockEl = container.createDiv({ cls: 'cornell-block' });
  applyBlockStyles(blockEl, effective);

  if (effective.showHeader) {
    const header = blockEl.createDiv({ cls: 'cornell-header' });
    header.createSpan({ text: effective.cueLabel });
    header.createSpan({ text: effective.noteLabel });
  }

  // Create all rows upfront and collect render tasks
  const renderTasks: Array<Promise<void>> = [];

  for (const row of block.rows) {
    const rowEl = blockEl.createDiv({ cls: 'cornell-row' });
    const cueEl = rowEl.createDiv({ cls: 'cornell-cue' });
    const noteEl = rowEl.createDiv({ cls: 'cornell-note' });

    if (row.cue) {
      renderTasks.push(
        MarkdownRenderer.render(app, row.cue, cueEl, sourcePath, component),
      );
    }
    if (row.note) {
      renderTasks.push(
        MarkdownRenderer.render(app, row.note, noteEl, sourcePath, component),
      );
    }
  }

  // ── Step 2: Fire all MarkdownRenderer calls in parallel ──
  if (renderTasks.length === 0) return;

  if (!signal) {
    await Promise.all(renderTasks);
    return;
  }

  // Race between all renders and the abort signal
  const abortPromise = new Promise<never>((_, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  });

  try {
    await Promise.race([Promise.all(renderTasks), abortPromise]);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    throw e;
  }
}
