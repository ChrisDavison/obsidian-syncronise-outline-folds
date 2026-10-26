import type { MarkdownView, View } from 'obsidian';
import type { FoldInfo } from './folds';

/** Undocumented core interfaces, isolated here and checked before use. */
export interface FoldMode {
  getFoldInfo(): unknown;
  applyFoldInfo(info: FoldInfo): void;
}
export interface OutlineItem {
  heading: { position: { start: { line: number }; end: { line: number } }; level: number };
  collapsed: boolean;
  collapsible: boolean;
  setCollapsed(value: boolean, animate?: boolean): unknown;
  setCollapsible(value: boolean): void;
  vChildren: { children: unknown[] };
}
export interface Outline extends View {
  file: { path: string } | null;
  cachedHeadingDom: OutlineItem[];
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function line(value: unknown): boolean {
  return record(value) && Number.isInteger(value.line) && Number(value.line) >= 0;
}
export function getMode(view: MarkdownView): FoldMode | null {
  const mode: unknown = (view as unknown as Record<string, unknown>).currentMode;
  return record(mode) && typeof mode.getFoldInfo === 'function' && typeof mode.applyFoldInfo === 'function'
    ? mode as unknown as FoldMode : null;
}
export function readFolds(mode: FoldMode): FoldInfo | null {
  const info = mode.getFoldInfo();
  if (!record(info) || !Number.isInteger(info.lines) || Number(info.lines) < 1 || !Array.isArray(info.folds)) return null;
  if (!info.folds.every((fold: unknown) => record(fold) && Number.isInteger(fold.from) && Number.isInteger(fold.to)
    && Number(fold.from) >= 0 && Number(fold.to) >= Number(fold.from) && Number(fold.to) < Number(info.lines))) return null;
  return { lines: Number(info.lines), folds: (info.folds as FoldInfo['folds']).map(fold => ({ ...fold })) };
}
export function getOutline(view: View): Outline | null {
  const outline = view as unknown as Record<string, unknown>;
  const items = outline.cachedHeadingDom;
  if (!Array.isArray(items) || !items.every((item: unknown) => {
    if (!record(item) || !record(item.heading) || !record(item.heading.position)) return false;
    return line(item.heading.position.start) && line(item.heading.position.end) && Number.isInteger(item.heading.level)
      && typeof item.collapsed === 'boolean' && typeof item.collapsible === 'boolean'
      && typeof item.setCollapsed === 'function' && typeof item.setCollapsible === 'function'
      && record(item.vChildren) && Array.isArray(item.vChildren.children);
  })) return null;
  return view as Outline;
}
