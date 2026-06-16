import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Monorepo Metro config: make Expo watch and resolve workspace packages under /packages.
// This allows live edits in `packages/*` to reflect in the running Expo app.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(projectRoot, '..', '..');

// Provide overrides as named exports. Metro's config loader will merge these with defaults.
export const watchFolders = [
  // Watch the whole workspace so changes in packages/* trigger reloads.
  workspaceRoot
];

export const resolver = {
  // Prefer resolving deps from the workspace root (hoisted) and then the app.
  nodeModulesPaths: [
    path.join(workspaceRoot, 'node_modules'),
    path.join(projectRoot, 'node_modules')
  ],

  // Avoid Metro walking up parent dirs and picking the wrong node_modules.
  disableHierarchicalLookup: true,

  // Metro symlink handling differs by version; enable if supported.
  unstable_enableSymlinks: true
};


