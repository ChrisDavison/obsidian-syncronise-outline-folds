import { defineConfig } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';
export default defineConfig([
  { ignores: ['main.js', 'dist/**', 'node_modules/**'] },
  ...obsidianmd.configs.recommended,
  { languageOptions: { parserOptions: { projectService: { allowDefaultProject: ['*.mjs', 'scripts/*.mjs'] } } } },
  // These files run under Node during development, never in Obsidian.
  { files: ['*.mjs', 'scripts/*.mjs', 'tests/**/*.ts'], rules: {
    'obsidianmd/no-nodejs-modules': 'off',
    'obsidianmd/rule-custom-message': 'off',
  } },
]);
