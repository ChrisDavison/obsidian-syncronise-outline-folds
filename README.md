# Synchronise Outline Folds

Keep heading folds in Obsidian's core **Outline** and the active Markdown document in sync. Collapse or expand a heading in either place and the other follows automatically.

- Works in Live Preview, Source mode, and Reading view.
- Adds an Outline collapse arrow to headings that have body text but no subheadings, so these headings can also be folded from the Outline.
- Matches headings by source position, including repeated titles and Setext headings.
- Preserves independent nested heading folds and unrelated list/frontmatter folds when toggling a heading in the Outline.
- Follows the active document. Outlines showing a different file are left alone.
- Remembers the heading folds of each document and restores them when the note is reopened.
- Uses Obsidian's native fold state; never edits your Markdown to store folds.

## Use

Enable the **Outline** core plugin and **Settings → Editor → Fold heading**, then enable this plugin. Open the Outline and a Markdown note. Use the normal collapse arrows in either view, or Obsidian's fold/unfold commands. Outline navigation and heading dragging remain available.

When a note is opened in a pane, its remembered heading folds are restored. After that, when switching modes, editing heading structure, or enabling the plugin, the document's existing folds take priority. If both views change before an update is processed, the document takes priority. Multiple Outlines for the active file converge to the same folds; simultaneous conflicting Outline changes are resolved in pane order.

The command **Synchronise outline folds: Synchronise folds from document** explicitly reapplies the current document state to the Outline. No hotkeys are assigned by default.

Disabling the plugin removes its listeners and the extra Outline arrows. Existing document folds remain under Obsidian's control. The plugin has no settings.

## Remembered folds

The plugin saves which headings are folded in each note to its `data.json` in the plugin folder, so the state travels with the vault and is restored the next time the note is opened. Headings are identified by level, title, and repeat count rather than line number, so folds survive edits elsewhere in the note; renaming a heading forgets its fold. Notes with no folded headings are not stored. Saved entries follow renamed notes and folders and are removed when a note is deleted. List and frontmatter folds are left to Obsidian.

## Install manually

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/ChrisDavison/obsidian-syncronise-outline-folds/releases/latest), or build them using the steps below.
2. Create `<vault>/<config-folder>/plugins/synchronise-outline-folds/`. The default config folder is `.obsidian`.
3. Copy both files into that folder.
4. Reload Obsidian, then enable **Synchronise Outline Folds** under **Settings → Community plugins**.

## Compatibility and privacy

Requires Obsidian **1.14.4 or newer**. Desktop integration is verified on macOS with 1.14.4. The runtime uses browser and Obsidian APIs without Node.js or Electron imports, so mobile is permitted by the manifest; physical iOS and Android devices have not been tested.

**Compatibility boundary:** Obsidian does not publish an Outline fold API or Markdown fold-state API. The adapter in `src/compat.ts` checks the core Outline tree and Markdown mode interfaces before using them. An Obsidian update or a plugin that replaces those views could break synchronisation. Unsupported interfaces are skipped with one notice. No core methods or prototypes are patched. Custom Outline replacements, embedded notes, Canvas cards, and synchronising several editor panes with each other are outside the scope of this plugin.

Heading folding must remain enabled in Obsidian. Notes without headings have nothing to synchronise.

There are no network requests, telemetry, accounts, payments, filesystem access outside the vault, or runtime dependencies bundled into the plugin. It reads the active note and core view state in memory, changes only native view folds, and writes only its own `data.json` containing note paths and heading titles. Obsidian and CodeMirror are supplied by the app.

## Develop and verify

Use Node.js 22 or newer and npm.

```sh
npm ci
npm run check      # official Obsidian ESLint rules, unit tests, typecheck, build, asset checks
npm run dev        # watch source and rebuild main.js
```

`main.js` is generated and intentionally excluded from source control. The production build externalises Obsidian, CodeMirror, and Lezer, and emits readable CommonJS without source maps. The lockfile records development dependencies; none are shipped inside `main.js`.

Unit tests cover heading boundaries, duplicate titles, saved heading identity, saved-data validation, preservation of nested/list/frontmatter folds, and unsupported core interfaces. Live verification on macOS with Obsidian 1.14.4 covered both directions in all three modes, multiple Outlines, file switching, and disable/re-enable cleanup.

The optional live integration check requires a disposable vault at `/tmp/synchronise-outline-folds-test` containing `tests/Folds.md`, with the plugin and core Outline enabled. Keep its window in the foreground and run `node scripts/live-check.mjs` with the Obsidian CLI on PATH. It changes folds and modes, creates `Other.md`, and reloads the plugin; it refuses other vault paths.

## Release provenance

Tagged releases are built and checked by GitHub Actions. Only `main.js` and `manifest.json` are uploaded, with build attestations stored on GitHub. After downloading a release, verify either file with the GitHub CLI:

```sh
gh attestation verify main.js --repo ChrisDavison/obsidian-syncronise-outline-folds
gh attestation verify manifest.json --repo ChrisDavison/obsidian-syncronise-outline-folds
```

## License

[MIT](LICENSE), copyright Chris Davison.
