import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changedFolds, headingRanges, mergeFolds, sameFolds } from '../src/folds.ts';
import { getMode, getOutline, readFolds } from '../src/compat.ts';
import type { MarkdownView, View } from 'obsidian';

void test('nested and skipped heading levels end before the next peer or ancestor', () => {
  const ranges = headingRanges([
    { line: 0, endLine: 0, level: 1 }, { line: 3, endLine: 3, level: 3 },
    { line: 8, endLine: 8, level: 2 }, { line: 12, endLine: 12, level: 1 },
  ], 16);
  assert.deepEqual(ranges.get(0), { from: 0, to: 11 });
  assert.deepEqual(ranges.get(3), { from: 3, to: 7 });
  assert.deepEqual(ranges.get(8), { from: 8, to: 11 });
  assert.deepEqual(ranges.get(12), { from: 12, to: 15 });
});

void test('empty headings have no artificial fold and Setext underline is part of the heading', () => {
  const ranges = headingRanges([{ line: 0, endLine: 1, level: 1 }, { line: 2, endLine: 2, level: 1 }], 3);
  assert.equal(ranges.size, 0);
});

void test('outline changes preserve nested heading, list, and frontmatter folds', () => {
  const ranges = headingRanges([{ line: 3, endLine: 3, level: 1 }, { line: 7, endLine: 7, level: 2 }], 20);
  const info = { lines: 20, folds: [{ from: 0, to: 2 }, { from: 3, to: 19 }, { from: 7, to: 19 }, { from: 10, to: 12 }] };
  const result = mergeFolds(info, ranges, new Map([[3, false]]));
  assert.deepEqual(result.folds, [{ from: 0, to: 2 }, { from: 7, to: 19 }, { from: 10, to: 12 }]);
  assert.equal(info.folds.length, 4);
  assert.deepEqual(mergeFolds(result, ranges, new Map([[3, true]])).folds, info.folds);
});

void test('duplicate titles remain independent because state is keyed by source line', () => {
  const before = new Map([[0, false], [4, false], [8, true]]);
  const after = new Map([[0, false], [4, true], [8, true]]);
  assert.deepEqual([...changedFolds(before, after)], [[4, true]]);
});

void test('newly rendered items are not mistaken for user toggles', () => {
  assert.equal(changedFolds(new Map([[0, false]]), new Map([[0, false], [3, true]])).size, 0);
  assert.equal(sameFolds(new Set([1, 3]), new Set([3, 1])), true);
  assert.equal(sameFolds(new Set([1]), new Set([3])), false);
});

void test('invalid private fold interfaces fail closed', () => {
  assert.equal(getMode({ currentMode: {} } as unknown as MarkdownView), null);
  assert.equal(getOutline({ cachedHeadingDom: [{}] } as unknown as View), null);
  for (const info of [{ lines: 2, folds: [{ from: 0, to: 3 }] }, { lines: 2, folds: [{ from: -1, to: 1 }] }, null]) {
    assert.equal(readFolds({ getFoldInfo: () => info, applyFoldInfo: () => {} }), null);
  }
});
