import { debounce, MarkdownView, Notice, Plugin, TFile } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { getMode, getOutline, readFolds, type FoldMode, type OutlineItem } from './compat';
import { changedFolds, headingKeys, headingRanges, mergeFolds, readSaved, sameFolds, type SavedFolds } from './folds';

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
  private saved: SavedFolds = {};
  private restored = new WeakMap<MarkdownView, string>();
  private save = debounce(() => void this.saveData({ folds: this.saved }), 1000, true);

  async onload(): Promise<void> {
    this.saved = readSaved(await this.loadData());
    this.registerEditorExtension(EditorView.updateListener.of(update => {
      if (update.docChanged || update.transactions.some(transaction => transaction.effects.length > 0)) this.schedule();
    }));
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.schedule()));
    this.registerEvent(this.app.workspace.on('layout-change', () => this.schedule()));
    this.registerEvent(this.app.workspace.on('file-open', () => this.schedule()));
    this.registerEvent(this.app.metadataCache.on('changed', () => this.schedule()));
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => this.move(oldPath, file instanceof TFile ? file.path : null, file.path)));
    this.registerEvent(this.app.vault.on('delete', file => this.move(file.path, null, null)));
    this.addCommand({ id: 'synchronise-now', name: 'Synchronise folds from document', callback: () => {
      this.baselines = new WeakMap();
      this.schedule();
    } });
    this.app.workspace.onLayoutReady(() => {
      if (this.stopped) return;
      // Forget notes deleted or renamed while the plugin was not running.
      for (const path of Object.keys(this.saved)) if (!(this.app.vault.getFileByPath(path))) this.forget(path);
      this.schedule();
    });
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
      this.save.run();
    });
  }

  /** Follow renamed notes and folders; a null target forgets the saved folds. */
  private move(oldPath: string, filePath: string | null, folderPath: string | null): void {
    for (const path of Object.keys(this.saved)) {
      const target = path === oldPath ? filePath
        : folderPath !== null && path.startsWith(`${oldPath}/`) ? folderPath + path.slice(oldPath.length)
        : path.startsWith(`${oldPath}/`) ? null : undefined;
      if (target === undefined) continue;
      const keys = this.saved[path]!;
      this.forget(path);
      if (target !== null) this.saved[target] = keys;
    }
  }

  private forget(path: string): void {
    if (!(path in this.saved)) return;
    delete this.saved[path];
    this.save();
  }

  private remember(path: string, keys: string[]): void {
    const previous = this.saved[path] ?? [];
    if (previous.length === keys.length && previous.every((key, index) => key === keys[index])) return;
    if (keys.length) this.saved[path] = keys;
    else delete this.saved[path];
    this.save();
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
    const keys = headingKeys(cache.map(heading => ({ line: heading.position.start.line, endLine: heading.position.end.line,
      level: heading.level, text: heading.heading })));
    const path = document.file.path;

    // Reapply the saved heading folds the first time this view shows the note.
    if (this.restored.get(document) !== path) {
      this.restored.set(document, path);
      const saved = this.saved[path];
      if (saved) {
        const wanted = new Set(saved);
        const changes = new Map([...ranges.keys()].map(line => [line, wanted.has(keys.get(line)!)]));
        currentInfo = mergeFolds(currentInfo, ranges, changes);
        const restored = new Set(currentInfo.folds.filter(fold => ranges.has(fold.from)).map(fold => fold.from));
        if (!sameFolds(restored, documentFolds)) {
          mode.applyFoldInfo(currentInfo);
          documentFolds = restored;
        }
      }
    }

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
    this.remember(path, [...documentFolds].sort((a, b) => a - b).map(line => keys.get(line)!));
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
