import { MarkdownView, Notice, Plugin } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { getMode, getOutline, readFolds, type FoldMode, type OutlineItem } from './compat';
import { changedFolds, headingRanges, mergeFolds, sameFolds } from './folds';

interface Baseline {
  context: string;
  mode: FoldMode;
  document: Set<number>;
  outline: Map<number, boolean>;
}

export default class SynchroniseOutlineFolds extends Plugin {
  private timer: number | null = null;
  private stopped = false;
  private warned = false;
  private baselines = new WeakMap<object, Baseline>();
  private observers = new Map<HTMLElement, MutationObserver>();
  private addedControls = new Set<OutlineItem>();

  onload(): void {
    this.registerEditorExtension(EditorView.updateListener.of(update => {
      if (update.docChanged || update.transactions.some(transaction => transaction.effects.length > 0)) this.schedule();
    }));
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.schedule()));
    this.registerEvent(this.app.workspace.on('layout-change', () => this.schedule()));
    this.registerEvent(this.app.workspace.on('file-open', () => this.schedule()));
    this.registerEvent(this.app.metadataCache.on('changed', () => this.schedule()));
    this.addCommand({ id: 'synchronise-now', name: 'Synchronise folds from document', callback: () => {
      this.baselines = new WeakMap();
      this.schedule();
    } });
    this.app.workspace.onLayoutReady(() => { if (!this.stopped) this.schedule(); });
    this.register(() => {
      this.stopped = true;
      if (this.timer !== null) window.clearTimeout(this.timer);
      for (const observer of this.observers.values()) observer.disconnect();
      this.observers.clear();
      for (const item of this.addedControls) {
        // Core may have rebuilt the tree since we added the control.
        if (item.vChildren.children.length === 0) item.setCollapsible(false);
      }
      this.addedControls.clear();
      this.baselines = new WeakMap();
    });
  }

  private schedule(): void {
    if (this.stopped || this.timer !== null) return;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      try { this.synchronise(); } catch (error) {
        if (!this.warned) console.error('Synchronise Outline Folds: incompatible core folding interface', error);
        this.warn();
      }
    }, 0);
  }

  private warn(): void {
    if (this.warned) return;
    this.warned = true;
    new Notice('Synchronise outline folds: folding is unavailable in this view or Obsidian version.');
  }

  private synchronise(): void {
    const workspace = this.app.workspace;
    const recent = workspace.getMostRecentLeaf()?.view;
    const active = workspace.activeEditor;
    const document = active instanceof MarkdownView ? active : workspace.getActiveViewOfType(MarkdownView)
      ?? (recent instanceof MarkdownView ? recent : null);
    const leaves = workspace.getLeavesOfType('outline');
    const elements = new Set(leaves.map(leaf => leaf.view.containerEl));
    if (document) elements.add(document.containerEl);
    this.observe(elements);
    // Do not retain tree nodes removed by a core Outline rebuild.
    const currentItems = new Set(leaves.flatMap(leaf => getOutline(leaf.view)?.cachedHeadingDom ?? []));
    for (const item of this.addedControls) if (!currentItems.has(item)) this.addedControls.delete(item);
    if (!document?.file) return;
    const mode = getMode(document);
    const info = mode && readFolds(mode);
    if (!mode || !info) { this.warn(); return; }
    const text = document.getViewData();
    if (text.split('\n').length !== info.lines) return;
    const cache = this.app.metadataCache.getFileCache(document.file)?.headings;
    if (!cache) return;
    const headings = cache.map(heading => ({ line: heading.position.start.line, endLine: heading.position.end.line, level: heading.level }));
    const ranges = headingRanges(headings, info.lines);
    const context = JSON.stringify([document.file.path, text, headings]);
    let documentFolds = new Set(info.folds.filter(fold => ranges.has(fold.from)).map(fold => fold.from));
    let currentInfo = info;

    for (const leaf of leaves) {
      const outline = getOutline(leaf.view);
      if (!outline) { this.warn(); continue; }
      // Pinned/linked Outlines for another file must never affect the active document.
      if (outline.file?.path !== document.file.path) continue;
      const items = outline.cachedHeadingDom;
      if (items.length !== headings.length || items.some((item, index) => item.heading.position.start.line !== headings[index]?.line
        || item.heading.level !== headings[index]?.level)) continue;
      const states = new Map(items.filter(item => ranges.has(item.heading.position.start.line))
        .map(item => [item.heading.position.start.line, item.collapsed]));
      const previous = this.baselines.get(outline);
      if (previous?.context === context && previous.mode === mode && sameFolds(previous.document, documentFolds)) {
        const changes = changedFolds(previous.outline, states);
        if (changes.size) {
          currentInfo = mergeFolds(currentInfo, ranges, changes);
          mode.applyFoldInfo(currentInfo);
          documentFolds = new Set(currentInfo.folds.filter(fold => ranges.has(fold.from)).map(fold => fold.from));
        }
      }
      for (const item of items) {
        const line = item.heading.position.start.line;
        if (!ranges.has(line)) continue;
        if (!item.collapsible) {
          item.setCollapsible(true);
          this.addedControls.add(item);
        }
        const collapsed = documentFolds.has(line);
        if (item.collapsed !== collapsed) void item.setCollapsed(collapsed, false);
        states.set(line, collapsed);
      }
      this.baselines.set(outline, { context, mode, document: documentFolds, outline: states });
    }
  }

  private observe(elements: Set<HTMLElement>): void {
    for (const [element, observer] of this.observers) {
      if (!elements.has(element)) { observer.disconnect(); this.observers.delete(element); }
    }
    for (const element of elements) {
      if (this.observers.has(element)) continue;
      // Use each pane's owner window to support desktop pop-out windows.
      const Observer = (element.win as Window & { MutationObserver: typeof MutationObserver }).MutationObserver;
      const observer = new Observer(() => this.schedule());
      observer.observe(element, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
      this.observers.set(element, observer);
    }
  }
}
