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
