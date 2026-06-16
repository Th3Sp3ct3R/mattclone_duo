#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function usage() {
  console.log('Usage: yarn add:pkg <workspaceNameOrPath> <package> [morePackages...]');
  console.log('Examples:');
  console.log('  yarn add:pkg @julio/web-next lodash');
  console.log('  yarn add:pkg apps/web-next lodash');
  process.exit(1);
}

const [, , workspaceArg, ...pkgs] = process.argv;
if (!workspaceArg || pkgs.length === 0) usage();

const workspaceMap = {
  'apps/web': '@julio/web-next',
  'apps/web-next': '@julio/web-next',
  'apps/api': '@julio/api',
  'apps/mobile': '@julio/mobile',
  'apps/worker': '@julio/worker',
  'packages/shared': '@julio/shared',
  'packages/ui': '@julio/ui',
  'packages/api-client': '@julio/api-client'
};

const workspaceName = workspaceMap[workspaceArg] || workspaceArg;

const res = spawnSync('yarn', ['workspace', workspaceName, 'add', ...pkgs], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

process.exit(res.status ?? 1);


