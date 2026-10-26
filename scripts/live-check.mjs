import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import process from 'node:process';

// This deliberately refuses arbitrary vaults: it folds panes, creates Other.md,
// changes view modes and reloads the plugin in a disposable test environment.
const vault = 'synchronise-outline-folds-test';
const executable = process.env.OBSIDIAN_CLI ?? 'obsidian';
const cli = (...args) => execFileSync(executable, [`vault=${vault}`, ...args], { encoding: 'utf8', timeout: 30000 });
const path = cli('vault', 'info=path').trim();
if (!/^\/(?:private\/)?tmp\/synchronise-outline-folds-test$/.test(path)) throw new Error('Open the dedicated /tmp test vault first.');
const fixture = await readFile(new URL('../tests/Folds.md', import.meta.url), 'utf8');
if (cli('read', 'path=Folds.md').trim() !== fixture.trim()) throw new Error('Folds.md does not match the test fixture.');

const code = `(async () => {
  const results = [];
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const settle = () => new Promise(resolve => setTimeout(resolve, 120));
  const id = 'synchronise-outline-folds';
  const file = app.vault.getAbstractFileByPath('Folds.md');
  const original = await app.vault.read(file);
  const leaf = app.workspace.getMostRecentLeaf();
  await leaf.openFile(file);
  app.workspace.setActiveLeaf(leaf, { focus: true });
  await app.plugins.enablePlugin(id);
  let extra = null;
  const outline = () => app.workspace.getLeavesOfType('outline')[0].view;
  const folded = () => leaf.view.currentMode.getFoldInfo().folds.map(fold => fold.from);
  const info = folds => ({ lines: 32, folds });
  const reset = async () => { leaf.view.currentMode.applyFoldInfo(info([])); await settle(); };
  try {
    for (const source of [false, true]) {
      await leaf.setViewState({ type: 'markdown', state: { file: 'Folds.md', mode: 'source', source } });
      await settle();
      await reset();
      outline().cachedHeadingDom[3].collapseEl.click();
      await settle();
      assert(folded().includes(15) && !folded().includes(4), 'Duplicate title/leaf folding failed');
      outline().cachedHeadingDom[3].collapseEl.click();
      await settle();
      assert(folded().length === 0, 'Leaf unfolding failed');
      leaf.view.currentMode.applyFoldInfo(info([{ from: 0, to: 18 }, { from: 4, to: 14 }, { from: 8, to: 9 }]));
      await settle();
      assert(outline().cachedHeadingDom[0].collapsed && outline().cachedHeadingDom[1].collapsed, 'Editor to Outline failed');
      outline().cachedHeadingDom[0].setCollapsed(false, false);
      await settle();
      assert(!folded().includes(0) && folded().includes(4) && folded().includes(8), 'Nested/list folds lost');
      outline().cachedHeadingDom[5].collapseEl.click();
      await settle();
      assert(folded().includes(23), 'Setext heading failed');
      app.workspace.setActiveLeaf(leaf, { focus: true });
      app.commands.executeCommandById('editor:unfold-all');
      await settle();
      assert(outline().cachedHeadingDom.every(item => !item.collapsed), 'Native unfold-all failed');
      app.commands.executeCommandById('editor:fold-all');
      await settle();
      assert(outline().cachedHeadingDom.every(item => item.collapsed), 'Native fold-all failed');
      results.push(source ? 'Source mode: both directions, duplicate/leaf/Setext, nested/list preservation, native commands' : 'Live Preview: both directions, duplicate/leaf/Setext, nested/list preservation, native commands');
    }
    await reset();
    const outlineLeaf = app.workspace.getLeavesOfType('outline')[0];
    app.workspace.setActiveLeaf(outlineLeaf, { focus: true });
    outline().tree.toggleCollapseAll();
    await settle();
    assert([0, 4, 11, 15, 19, 23].every(line => folded().includes(line)), 'Outline collapse-all failed while focused');
    outline().tree.toggleCollapseAll();
    await settle();
    assert(folded().length === 0, 'Outline expand-all failed while focused');
    app.workspace.setActiveLeaf(leaf, { focus: true });
    results.push('Focused Outline: native collapse-all and expand-all synchronise document');
    await leaf.setViewState({ type: 'markdown', state: { file: 'Folds.md', mode: 'preview' } });
    await settle();
    outline().cachedHeadingDom[3].collapseEl.click();
    await settle();
    assert(folded().includes(15), 'Outline to Reading view failed');
    const arrow = leaf.view.containerEl.querySelector('h1 .heading-collapse-indicator');
    assert(arrow, 'Reading view fold arrow missing');
    arrow.click();
    await settle();
    assert(outline().cachedHeadingDom[0].collapsed, 'Reading view to Outline failed');
    arrow.click();
    await settle();
    assert(!outline().cachedHeadingDom[0].collapsed, 'Reading view unfold failed');
    results.push('Reading view: fold/unfold in both directions');

    await leaf.setViewState({ type: 'markdown', state: { file: 'Folds.md', mode: 'source', source: false } });
    await settle();
    await reset();
    extra = app.workspace.getRightLeaf(true);
    await extra.setViewState({ type: 'outline' });
    await settle();
    const outlines = app.workspace.getLeavesOfType('outline');
    assert(outlines.length >= 2, 'Second Outline missing');
    outlines[1].view.cachedHeadingDom[1].collapseEl.click();
    await settle();
    assert(folded().includes(4) && outlines.every(item => item.view.cachedHeadingDom[1].collapsed), 'Multiple Outlines failed');
    results.push('Two Outlines converge after a toggle in the second pane');
    extra.detach(); extra = null;

    const other = app.vault.getAbstractFileByPath('Other.md') ?? await app.vault.create('Other.md', '# Other\\n\\nBody.\\n');
    await leaf.openFile(other);
    await settle();
    assert(leaf.view.currentMode.getFoldInfo().folds.length === 0 && !outline().cachedHeadingDom[0].collapsed, 'File switch transferred stale folds');
    await leaf.openFile(file);
    await settle();
    results.push('File switching does not transfer stale Outline folds');

    await reset();
    await app.plugins.disablePlugin(id);
    await settle();
    assert(!outline().cachedHeadingDom[3].collapsible, 'Extra leaf control leaked after disable');
    leaf.view.currentMode.applyFoldInfo(info([{ from: 0, to: 18 }]));
    await settle();
    assert(!outline().cachedHeadingDom[0].collapsed, 'Listener leaked after disable');
    await app.plugins.enablePlugin(id);
    await settle();
    assert(outline().cachedHeadingDom[0].collapsed, 'Reload did not initialise from document');
    results.push('Disable removes controls/listeners; enable adopts document folds');
    assert(await app.vault.read(file) === original, 'Markdown text was changed');
    results.push('Markdown fixture remains byte-for-byte unchanged');
    return JSON.stringify({ passed: results.length, results });
  } finally {
    if (extra) extra.detach();
    await app.plugins.enablePlugin(id);
  }
})()`;
// The CLI transport treats literal newlines as command separators.
const output = cli('eval', `code=${code.replace(/\n/g, ' ')}`);
if (!output.startsWith('=> ')) throw new Error(output);
const result = JSON.parse(output.slice(3));
console.info(JSON.stringify(result, null, 2));
