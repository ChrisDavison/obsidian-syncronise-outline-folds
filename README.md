# Synchronise Outline Folds

Keep heading folds in Obsidian's core **Outline** and the active Markdown document in sync. Collapse or expand a heading in either place and the other follows automatically.

- Works in Live Preview, Source mode, and Reading view.
- Adds an Outline collapse arrow to headings that have body text but no subheadings, so these headings can also be folded from the Outline.
- Matches headings by source position, including repeated titles and Setext headings.
- Preserves independent nested heading folds and unrelated list/frontmatter folds when toggling a heading in the Outline.
- Follows the active document. Outlines showing a different file are left alone.
- Uses Obsidian's native fold state; never edits your Markdown to store folds.

## Use

Enable the **Outline** core plugin and **Settings → Editor → Fold heading**, then enable this plugin. Open the Outline and a Markdown note. Use the normal collapse arrows in either view, or Obsidian's fold/unfold commands. Outline navigation and heading dragging remain available.

When opening a document, switching modes, editing heading structure, or enabling the plugin, the document's existing folds take priority. If both views change before an update is processed, the document takes priority. Multiple Outlines for the active file converge to the same folds; simultaneous conflicting Outline changes are resolved in pane order.

The command **Synchronise outline folds: Synchronise folds from document** explicitly reapplies the current document state to the Outline. No hotkeys are assigned by default.

Disabling the plugin removes its listeners and the extra Outline arrows. Existing document folds remain under Obsidian's control. The plugin has no settings and stores no separate fold history.

## Install manually

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/ChrisDavison/obsidian-syncronise-outline-folds/releases/latest), or build them using the steps below.
2. Create `<vault>/<config-folder>/plugins/synchronise-outline-folds/`. The default config folder is `.obsidian`.
3. Copy both files into that folder.
4. Reload Obsidian, then enable **Synchronise Outline Folds** under **Settings → Community plugins**.

The packaged ZIP contains the correctly named `synchronise-outline-folds` folder. Extract that folder into the vault's `plugins` folder. The source repository directory can retain the requested spelling `obsidian-syncronise-outline-folds`; the installation folder must match the manifest ID.

This plugin has not yet been submitted to the community directory. There is no community search installation until its listing is accepted.

## Compatibility and privacy

Requires Obsidian **1.14.4 or newer**. Desktop integration is verified on macOS with 1.14.4. The runtime uses browser and Obsidian APIs without Node.js or Electron imports, so mobile is permitted by the manifest; physical iOS and Android devices have not been tested.

**Compatibility boundary:** Obsidian does not publish an Outline fold API or Markdown fold-state API. The adapter in `src/compat.ts` checks the core Outline tree and Markdown mode interfaces before using them. An Obsidian update or a plugin that replaces those views could break synchronisation. Unsupported interfaces are skipped with one notice. No core methods or prototypes are patched. Custom Outline replacements, embedded notes, Canvas cards, and synchronising several editor panes with each other are outside the scope of this plugin.

Heading folding must remain enabled in Obsidian. Notes without headings have nothing to synchronise. Fold persistence between sessions is managed by Obsidian, not this plugin.

There are no network requests, telemetry, accounts, payments, filesystem access outside the vault, or runtime dependencies bundled into the plugin. It reads the active note and core view state in memory and changes only native view folds. Obsidian and CodeMirror are supplied by the app.

## Develop and verify

Use Node.js 22 or newer and npm.

```sh
npm ci
npm run check      # official Obsidian ESLint rules, unit tests, typecheck, build, asset checks
npm run dev        # watch source and rebuild main.js
npm run package    # checks, installation folder, ZIP, and SHA-256 checksums in dist/
```

`main.js` is generated and intentionally excluded from source control. The production build externalises Obsidian, CodeMirror, and Lezer, and emits readable CommonJS without source maps. The lockfile records development dependencies; none are shipped inside `main.js`.

See [TESTING.md](TESTING.md) for the disposable-vault integration test and the recorded verification scope. See [RELEASING.md](RELEASING.md) for release and community submission steps.

## License

[MIT](LICENSE), copyright Chris Davison.
