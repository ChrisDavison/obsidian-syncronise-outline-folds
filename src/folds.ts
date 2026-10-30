export interface Fold { from: number; to: number }
export interface FoldInfo { folds: Fold[]; lines: number }
export interface Heading { line: number; endLine: number; level: number }

export function headingRanges(headings: readonly Heading[], lines: number): Map<number, Fold> {
  const ranges = new Map<number, Fold>();
  const pending: Heading[] = [];
  const close = (heading: Heading, to: number): void => {
    if (to > heading.endLine) ranges.set(heading.line, { from: heading.line, to });
  };
  for (const heading of headings) {
    while (pending.length && pending[pending.length - 1]!.level >= heading.level) close(pending.pop()!, heading.line - 1);
    pending.push(heading);
  }
  while (pending.length) close(pending.pop()!, lines - 1);
  return ranges;
}

/** Only changed headings are replaced; nested headings, lists and frontmatter survive. */
export function mergeFolds(info: FoldInfo, ranges: ReadonlyMap<number, Fold>, changes: ReadonlyMap<number, boolean>): FoldInfo {
  const folds = info.folds.filter(fold => !ranges.has(fold.from) || !changes.has(fold.from));
  for (const [line, collapsed] of changes) {
    const range = ranges.get(line);
    if (collapsed && range) folds.push({ ...range });
  }
  folds.sort((a, b) => a.from - b.from);
  return { lines: info.lines, folds };
}

export function changedFolds(before: ReadonlyMap<number, boolean>, after: ReadonlyMap<number, boolean>): Map<number, boolean> {
  return new Map([...after].filter(([line, collapsed]) => before.has(line) && before.get(line) !== collapsed));
}

export function sameFolds(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
  return a.size === b.size && [...a].every(line => b.has(line));
}

export interface NamedHeading extends Heading { text: string }

/** Identify headings by level, title and repeat count so saved folds survive edits elsewhere in the note. */
export function headingKeys(headings: readonly NamedHeading[]): Map<number, string> {
  const seen = new Map<string, number>();
  return new Map(headings.map(heading => {
    const base = JSON.stringify([heading.level, heading.text]);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return [heading.line, `${base}#${count}`];
  }));
}

export type SavedFolds = Record<string, string[]>;

/** Accept only a path → heading-key list map; anything else from disk is discarded. */
export function readSaved(data: unknown): SavedFolds {
  const folds = typeof data === 'object' && data !== null ? (data as Record<string, unknown>).folds : null;
  if (typeof folds !== 'object' || folds === null) return {};
  const saved: SavedFolds = {};
  for (const [path, keys] of Object.entries(folds)) {
    if (Array.isArray(keys) && keys.every(key => typeof key === 'string')) saved[path] = [...keys];
  }
  return saved;
}
