# Verification

## Automated checks

`npm run check` runs the official recommended Obsidian ESLint rules, six unit tests, strict TypeScript checks, the production build, and release metadata/bundle checks. Unit tests cover heading boundaries, empty/Setext headings, preservation of nested/list/frontmatter folds, repeated titles, newly rendered Outline items, and invalid private interfaces.

`npm run package` also produces the installation folder, ZIP and SHA-256 checksums. CI runs the same packaging checks on GitHub; the workflow itself has not been run on a hosted repository yet.

## Disposable-vault integration test

This test changes view state, toggles folds, creates `Other.md`, opens a second Outline, and disables/re-enables the plugin. It refuses vault paths other than `/tmp/synchronise-outline-folds-test` (including macOS's `/private/tmp` equivalent).

1. Create `/tmp/synchronise-outline-folds-test/` and copy `tests/Folds.md` there.
2. Open that folder as a separate vault in Obsidian. Enable the Outline core plugin and heading folding.
3. Build the plugin, install `main.js` and `manifest.json` in the test vault's config folder under `plugins/synchronise-outline-folds/`, and enable it.
4. Open `Folds.md` and the Outline. Keep the test vault window in the foreground so Electron does not throttle its timers. Start the CLI debugger to capture errors and console output.
5. Run:

```sh
OBSIDIAN_CLI=/usr/local/bin/obsidian node scripts/live-check.mjs
obsidian vault=synchronise-outline-folds-test dev:errors
obsidian vault=synchronise-outline-folds-test dev:console level=error
```

If your CLI is already on PATH, omit `OBSIDIAN_CLI`. The test fixture must match the checked-in fixture. A successful result reports each passed scenario; a failed assertion or CLI error exits nonzero. Literal newlines are removed from evaluated JavaScript because the CLI transport interprets them as separate commands.

## Recorded local verification

On 2026-10-26, Obsidian **1.14.4** on macOS passed the integration scenarios:

- Live Preview and Source mode: bidirectional heading folding/unfolding, independent repeated titles, leaf controls, Setext headings, nested/list fold preservation, and core editor fold/unfold-all commands.
- Outline collapse/expand-all while the Outline has focus.
- Reading view fold/unfold in both directions.
- Two Outlines converging after a toggle in the second pane.
- Switching files without transferring stale Outline folds.
- Disabling removes the extra controls and stops synchronisation; enabling initialises from document folds.
- `Folds.md` remains byte-for-byte unchanged.

Inspect the rendered document and Outline together as well as checking fold-state assertions. The live tests use core collapse elements/methods and native commands rather than substituting a fake view. No errors or error-level console messages were captured in the final run.

Not verified: physical iOS/Android devices, Windows/Linux desktop, older Obsidian versions, custom Outline replacements, cross-window interaction, long-running/performance behaviour, or acceptance by the community directory scanner/review. Runtime guard unit tests cover unsupported interface shapes, but cannot predict future Obsidian internals.
