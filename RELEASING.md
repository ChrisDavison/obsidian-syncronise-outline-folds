# Releasing and community submission

The repository is prepared for community review; passing local checks does not guarantee acceptance.

1. Verify behaviour on the declared minimum Obsidian version. Test iOS/Android before advertising device verification; see `TESTING.md`.
2. Keep `package.json` and `manifest.json` versions equal. Add the version and its minimum Obsidian version to `versions.json`.
3. Run `npm ci` and `npm run package`. Review the resulting source, assets, and checksums.
4. Publish the source in a public GitHub repository with this README and MIT license. Check the plugin ID and display name are available in the community directory before first submission.
5. Create a GitHub release whose tag exactly equals the manifest version, initially **`0.1.0`**, without a `v` prefix. Attach **`main.js` and `manifest.json` individually** from `dist/synchronise-outline-folds/`. Attach the ZIP and checksums as optional conveniences. There is no stylesheet to attach.
6. Sign into [Obsidian Community](https://community.obsidian.md/), connect the required Obsidian/GitHub accounts, and submit the repository through the dashboard. Run a preview scan and resolve review findings before publication. New submissions no longer use a pull request to `obsidian-releases`.

The scanner can reproduce the production artifact through the `build` script. `npm run check` also runs the official `eslint-plugin-obsidianmd` recommended rules with type information. Its mobile API and console rules are disabled only for Node-based tooling and tests; runtime source keeps the full recommended configuration.

The plugin depends on undocumented Outline and Markdown folding interfaces. Disclose that boundary during review and repeat the live tests for Obsidian updates. Keep the minimum supported version conservative rather than claiming untested older versions.

Official references checked during implementation:

- [Submission guide](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin)
- [Manifest schema](https://docs.obsidian.md/Reference/Manifest)
- [Plugin submission requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins)
- [Developer policies](https://docs.obsidian.md/community-directory/developer-policies)
- [Review guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin%20guidelines)
- [Official ESLint rules](https://github.com/obsidianmd/eslint-plugin)
