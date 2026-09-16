#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runNpm } from './lib/run-npm.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const ENGINES = pkg.engines?.node ?? '^22.22.3 || ^24.15.0 || >=26.0.0';
const install = process.argv.includes('--install');

function parseVersion(raw) {
  const match = String(raw).trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

/** Implements package.json engines.node: ^22.22.3 || ^24.15.0 || >=26.0.0 */
function satisfiesEngines(raw) {
  const v = parseVersion(raw);
  if (!v) return false;
  if (v.major === 22) return v.minor > 22 || (v.minor === 22 && v.patch >= 3);
  if (v.major === 24) return v.minor >= 15;
  if (v.major >= 26) return true;
  return false;
}

function printInstallHints() {
  console.error(`Need Node ${ENGINES} and npm.`);
  if (process.platform === 'win32') {
    console.error(
      'Windows: install Node from https://nodejs.org matching engines; or `winget install OpenJS.NodeJS.LTS`; or nvm-windows.',
    );
  } else {
    console.error('macOS/Linux: install Node from https://nodejs.org; or nvm/fnm (`nvm install 22`).');
  }
  console.error('This script does not run installers.');
}

const nodeVersion = process.versions.node;
if (!satisfiesEngines(nodeVersion)) {
  console.error(`Node v${nodeVersion} is outside ${ENGINES}.`);
  printInstallHints();
  process.exit(1);
}

const npm = runNpm(['--version']);
if (npm.error || npm.status !== 0) {
  console.error('npm was not found.');
  printInstallHints();
  process.exit(1);
}

console.log(`node v${nodeVersion}`);
console.log(`npm ${npm.stdout.trim()}`);

if (install) {
  const result = runNpm(['install'], { cwd: root, stdio: 'inherit' });
  process.exit(result.status ?? 1);
}
