#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { runNpm } from './lib/run-npm.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SITE_TS = 'src/app/core/site.ts';
const SUPABASE_TS = 'src/app/core/supabase.ts';
const DEFAULT_SITE = 'https://example.netlify.app';
const SKIP_DIR_NAMES = new Set(['node_modules', '.git', 'dist', '.angular', 'coverage']);

const EXPLAIN = {
  name: `App name (kebab-case)
Goes into package.json, angular.json (project + dist/<name>/browser), the
browser tab title, site.ts, README, and LICENSE. Also used as the default
folder name. Lowercase, digits, hyphens — garden-tracker, not Garden Tracker.`,

  dest: `Destination folder
We copy this template into a new folder. Default: ../<name> (next to this
checkout). Skips node_modules, .git, dist, .angular, coverage, and .env files.
Don't pick this template folder — that's --in-place, not a spawn.`,

  site: `Site URL (optional)
Placeholder in site.ts, README, and netlify.toml if you keep Netlify.
Change it later. Blank = ${DEFAULT_SITE}.`,

  host: `Hosting
  netlify  Keep netlify.toml. Publish dir is dist/<name>/browser; unknown
           routes hit index.html. In Netlify: Import from GitHub. This script
           does not log in.
  none     Drop netlify.toml. You host dist/<name>/browser yourself and set a
           fallback to index.html.`,

  supabase: `Supabase (optional)
Adds placeholder URL/anon-key files and @supabase/supabase-js.
Angular CLI won't load .env. Default No. Skip unless you need it.`,

  git: `git init (new folder only)
Runs git init -b main in the new folder. No remote, no push, template .git is
untouched. Default Yes.`,
};

function usage() {
  return `Usage:
  Humans:  ./scripts/spawn.sh
           Windows: scripts\\spawn.ps1  or  scripts\\spawn.cmd
           or: npm run create          (same questions, via Node)

  AI:      npm run create -- --name my-app --title "My App" --dest ../my-app --site ${DEFAULT_SITE} --host netlify --no-git

  --name <kebab-case>   App name (package, angular project, dist/<name>/browser, default folder)
  --title <text>        Display title (tab, site.ts appTitle). Default: Title Case of --name
  --site <url>          Public site URL (default ${DEFAULT_SITE})
  --dest <dir>          Copy destination (default ../<name>); --out is an alias
  --in-place            Restamp this checkout; do not copy
  --host netlify|none   Keep Netlify config (default) or skip
  --supabase            Add Supabase placeholder stub (default off)
  --git / --no-git      git init in the new folder only (default: yes, copy mode)
  --help                Show this message

  Does not create GitHub remotes, push, or call the Netlify API.`;
}

function quote(value) {
  return `'${String(value).replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

function kebabToTitle(name) {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function validateName(name) {
  if (!NAME_RE.test(name)) {
    throw new Error(`Invalid --name "${name}". Use kebab-case (e.g. my-app).`);
  }
}

function validateSite(site) {
  let url;
  try {
    url = new URL(site);
  } catch {
    throw new Error(`Invalid --site "${site}". Use an http(s) URL.`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Invalid --site "${site}". Use an http(s) URL.`);
  }
}

function normalizeHost(raw) {
  const value = String(raw).trim().toLowerCase();
  if (value === 'netlify' || value === 'y' || value === 'yes') return 'netlify';
  if (value === 'none' || value === 'skip' || value === 'n' || value === 'no') return 'none';
  throw new Error(`Invalid --host "${raw}". Use "netlify" or "none".`);
}

function explain(body) {
  console.log(`\n${body.trim()}\n`);
}

async function ask(rl, question, fallback) {
  const suffix = fallback === undefined ? '' : ` [${fallback}]`;
  const answer = await rl.question(`${question}${suffix}: `);
  const trimmed = answer.trim();
  return trimmed || fallback;
}

function parseYesNo(answer, defaultYes) {
  if (!answer) return defaultYes;
  if (/^n(o)?$/i.test(answer)) return false;
  if (/^y(es)?$/i.test(answer)) return true;
  return defaultYes;
}

async function askYesNo(rl, question, defaultYes = false) {
  const hint = defaultYes ? 'Y/n' : 'y/N';
  const fallback = defaultYes ? 'Y' : 'N';
  const answer = await ask(rl, `${question} (${hint})`, fallback);
  return parseYesNo(answer, defaultYes);
}

async function prompt(question, fallback) {
  if (!input.isTTY) return fallback;
  const rl = createInterface({ input, output });
  try {
    return await ask(rl, question, fallback);
  } finally {
    rl.close();
  }
}

async function promptYesNo(question, defaultYes = false) {
  if (!input.isTTY) return defaultYes;
  const rl = createInterface({ input, output });
  try {
    return await askYesNo(rl, question, defaultYes);
  } finally {
    rl.close();
  }
}

function destFlag(values) {
  if (values.dest != null && values.out != null && values.dest !== values.out) {
    throw new Error('Use only one of --dest or --out (they mean the same thing).');
  }
  return values.dest ?? values.out;
}

function isEnvFile(name) {
  if (name === '.env.example') return false;
  return name === '.env' || name.startsWith('.env.');
}

function isInside(child, parent) {
  const rel = path.relative(parent, child);
  return rel === '' || (rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel));
}

function shouldCopy(src, fromRoot, destRoot) {
  if (isInside(src, destRoot)) return false;
  const rel = path.relative(fromRoot, src);
  if (rel === '') return true;
  for (const part of rel.split(path.sep)) {
    if (SKIP_DIR_NAMES.has(part) || isEnvFile(part)) return false;
  }
  return true;
}

function copyTemplate(fromRoot, destRoot) {
  if (existsSync(destRoot)) {
    const info = statSync(destRoot);
    if (!info.isDirectory()) {
      throw new Error(`Destination "${destRoot}" exists and is not a directory.`);
    }
    if (readdirSync(destRoot).length > 0) {
      throw new Error(`Destination "${destRoot}" exists and is not empty.`);
    }
  } else {
    mkdirSync(destRoot, { recursive: true });
  }

  cpSync(fromRoot, destRoot, {
    recursive: true,
    filter: (src) => shouldCopy(src, fromRoot, destRoot),
  });
}

class Target {
  constructor(dir) {
    this.dir = dir;
  }

  read(rel) {
    return readFileSync(path.join(this.dir, rel), 'utf8');
  }

  write(rel, contents) {
    writeFileSync(path.join(this.dir, rel), contents);
  }

  exists(rel) {
    return existsSync(path.join(this.dir, rel));
  }

  remove(rel) {
    const full = path.join(this.dir, rel);
    if (existsSync(full)) rmSync(full, { force: true });
  }
}

function currentFolderName(dir) {
  return path.basename(dir);
}

function currentPackageName(target) {
  try {
    return JSON.parse(target.read('package.json')).name || currentFolderName(target.dir);
  } catch {
    return currentFolderName(target.dir);
  }
}

function angularProjectName(target, pkgName) {
  try {
    const json = JSON.parse(target.read('angular.json'));
    const names = Object.keys(json.projects ?? {});
    if (names.includes(pkgName)) return pkgName;
    return names[0] ?? pkgName;
  } catch {
    return pkgName;
  }
}

function restampPackageJson(target, name) {
  const pkg = JSON.parse(target.read('package.json'));
  pkg.name = name;
  pkg.description ??= 'Generic Angular 22 SPA starter for Netlify.';
  pkg.license ??= 'MIT';
  target.write('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
}

function restampNetlify(target, name, site) {
  target.write(
    'netlify.toml',
    `# Site URL (placeholder): ${site}
[build]
  command = "npm run build"
  publish = "dist/${name}/browser"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`,
  );
}

function restampIndexTitle(target, appTitle) {
  const html = target.read('src/index.html').replace(/<title>[^<]*<\/title>/, `<title>${appTitle}</title>`);
  target.write('src/index.html', html);
}

function restampAngularJson(target, oldName, newName) {
  const json = JSON.parse(target.read('angular.json'));
  if (json.projects?.[oldName] && oldName !== newName) {
    json.projects[newName] = json.projects[oldName];
    delete json.projects[oldName];
  }

  const project = json.projects?.[newName] ?? json.projects?.[oldName];
  if (!project) {
    throw new Error('angular.json has no application project to restamp.');
  }

  const buildOptions = project.architect?.build?.options;
  if (buildOptions) {
    buildOptions.outputPath = { base: `dist/${newName}` };
  }

  const walk = (value) => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.buildTarget === 'string') {
      value.buildTarget = value.buildTarget.replaceAll(oldName, newName);
    }
    for (const child of Object.values(value)) walk(child);
  };
  walk(project);

  target.write('angular.json', `${JSON.stringify(json, null, 2)}\n`);
}

function shipBlock(name, host) {
  if (host === 'none') {
    return `<!-- ship-block -->
\`\`\`bash
npm run build
\`\`\`

Static files land in \`dist/${name}/browser\`. Point your host at that folder. Unknown URLs need to serve \`index.html\`.
<!-- /ship-block -->`;
  }

  return `<!-- ship-block -->
\`\`\`bash
npm run build
\`\`\`

Import the GitHub repo in Netlify. \`netlify.toml\` publishes \`dist/${name}/browser\` and sends unknown paths to \`/index.html\`. Don't add the Angular SSR plugin. Nothing here logs into Netlify or saves credentials.
<!-- /ship-block -->`;
}

function replaceMarked(md, tag, replacement) {
  const re = new RegExp(`<!-- ${tag} -->[\\s\\S]*?<!-- /${tag} -->`);
  if (!re.test(md)) {
    throw new Error(`README.md missing <!-- ${tag} --> markers.`);
  }
  return md.replace(re, replacement);
}

function restampReadme(target, newName, site, host, appTitle) {
  let md = target.read('README.md');
  md = md.replace(/^# .+$/m, `# ${appTitle}`);
  md = replaceMarked(md, 'site-url', `<!-- site-url -->${site}<!-- /site-url -->`);
  md = replaceMarked(md, 'ship-block', shipBlock(newName, host));
  target.write('README.md', md);
}

function restampSite(target, name, appTitle, site) {
  target.write(
    SITE_TS,
    `/** Public identity. Restamped by \`npm run create\`. */
export const appName = ${quote(name)};
export const appTitle = ${quote(appTitle)};
export const siteUrl = ${quote(site)};
`,
  );
}

function restampLicense(target, name) {
  if (!target.exists('LICENSE')) return;
  const year = new Date().getFullYear();
  const license = target.read('LICENSE').replace(
    /Copyright \(c\) \d+ .+ contributors/,
    `Copyright (c) ${year} ${name} contributors`,
  );
  target.write('LICENSE', license);
}

function enableSupabase(target) {
  const install = runNpm(['install', '@supabase/supabase-js'], {
    cwd: target.dir,
    stdio: 'inherit',
  });
  if (install.status !== 0) {
    throw new Error('Failed to add @supabase/supabase-js.');
  }

  target.write(
    SUPABASE_TS,
    `/** Placeholder strings only. Angular CLI does not auto-load .env; wire a client later. */
export const supabaseUrl = 'https://YOUR_PROJECT.supabase.co';
export const supabaseAnonKey = 'YOUR_ANON_KEY';
`,
  );
  target.write('.env.example', `NG_APP_SUPABASE_URL=\nNG_APP_SUPABASE_ANON_KEY=\n`);
  console.log('Supabase stub added (placeholders only; .env is not auto-loaded).');
}

function gitInit(target) {
  if (existsSync(path.join(target.dir, '.git'))) {
    console.log('git already initialized.');
    return;
  }
  const result = spawnSync('git', ['init', '-b', 'main'], { cwd: target.dir, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error('git init failed.');
  }
}

function applyHost(target, name, site, host) {
  if (host === 'none') {
    target.remove('netlify.toml');
    return;
  }
  restampNetlify(target, name, site);
}

async function askName(rl, rich) {
  const fallback = rich ? undefined : currentFolderName(sourceRoot);
  for (;;) {
    if (rich) explain(EXPLAIN.name);
    const name = await ask(rl, 'App name (kebab-case)', fallback);
    try {
      if (!name) throw new Error('App name is required. Example: garden-tracker');
      validateName(name);
      return name;
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      if (!rich && !input.isTTY) throw err;
    }
  }
}

async function askDest(rl, name, rich) {
  const fallback = path.join('..', name);
  for (;;) {
    if (rich) explain(EXPLAIN.dest.replaceAll('<name>', name));
    const raw = await ask(rl, 'Destination folder', fallback);
    const destDir = path.resolve(process.cwd(), raw || fallback);
    if (path.resolve(destDir) === path.resolve(sourceRoot)) {
      const msg = 'Destination is the template root. Pick another folder (or use --in-place).';
      if (!rich && !input.isTTY) throw new Error(msg);
      console.error(msg);
      continue;
    }
    return { destRaw: raw || fallback, destDir };
  }
}

async function askSite(rl, rich) {
  for (;;) {
    if (rich) explain(EXPLAIN.site);
    const site = await ask(rl, 'Public site URL', DEFAULT_SITE);
    try {
      validateSite(site);
      return site;
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      if (!rich && !input.isTTY) throw err;
    }
  }
}

async function askHost(rl, rich) {
  for (;;) {
    if (rich) explain(EXPLAIN.host);
    const raw = await ask(rl, 'Host (netlify, or none = I\'ll configure deploy myself)', 'netlify');
    try {
      return normalizeHost(raw);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      if (!rich && !input.isTTY) throw err;
    }
  }
}

async function collectFromHuman(rl) {
  const name = await askName(rl, true);
  const { destRaw } = await askDest(rl, name, true);
  const site = await askSite(rl, true);
  const host = await askHost(rl, true);
  explain(EXPLAIN.supabase);
  const supabase = await askYesNo(rl, 'Add a Supabase stub?', false);
  explain(EXPLAIN.git);
  const git = await askYesNo(rl, 'git init in the new folder?', true);
  return { name, destRaw, site, host, supabase, git, inPlace: false };
}

async function main() {
  const { values } = parseArgs({
    options: {
      name: { type: 'string' },
      title: { type: 'string' },
      site: { type: 'string' },
      out: { type: 'string' },
      dest: { type: 'string' },
      host: { type: 'string' },
      supabase: { type: 'boolean' },
      git: { type: 'boolean' },
      'no-git': { type: 'boolean' },
      'in-place': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.log(usage());
    return;
  }

  const inPlace = Boolean(values['in-place']);
  const destOpt = destFlag(values);
  if (inPlace && destOpt) {
    throw new Error('Use either --in-place or --dest/--out, not both.');
  }

  const rich = Boolean(input.isTTY && process.argv.slice(2).length === 0);

  let name;
  let destRaw;
  let site;
  let host;
  let supabase;
  let git;

  if (rich) {
    const rl = createInterface({ input, output });
    try {
      console.log('Spawn a new Angular app from this template. This checkout stays put.\n');
      const answers = await collectFromHuman(rl);
      ({ name, destRaw, site, host, supabase, git } = answers);
    } finally {
      rl.close();
    }
  } else {
    name = values.name ?? (await prompt('App name (kebab-case)', currentFolderName(sourceRoot)));
    validateName(name);

    if (!inPlace) {
      destRaw = destOpt ?? (input.isTTY ? await prompt('Destination folder', path.join('..', name)) : path.join('..', name));
    }

    site = values.site ?? (await prompt('Public site URL', DEFAULT_SITE));
    validateSite(site);

    const hostRaw =
      values.host ??
      (await prompt('Host (netlify, or none = I\'ll configure deploy myself)', 'netlify'));
    host = normalizeHost(hostRaw);

    supabase =
      values.supabase ?? (input.isTTY ? await promptYesNo('Add a Supabase stub?', false) : false);

    if (inPlace) {
      git = false;
      if (values.git && !values['no-git']) {
        console.log('git init is only for spawned folders; skipped --in-place.');
      }
    } else if (values['no-git']) {
      git = false;
    } else if (values.git === true) {
      git = true;
    } else {
      git = input.isTTY ? await promptYesNo('git init in the new folder?', true) : true;
    }
  }

  const appTitle = values.title?.trim() || kebabToTitle(name);
  let destDir = sourceRoot;

  if (!inPlace) {
    destDir = path.resolve(process.cwd(), destRaw ?? path.join('..', name));
    if (path.resolve(destDir) === path.resolve(sourceRoot)) {
      throw new Error('Destination is the template root. Use --in-place to restamp this checkout.');
    }
    copyTemplate(sourceRoot, destDir);
    console.log(`Copied template → ${destDir}`);
  }

  const target = new Target(destDir);
  const oldName = angularProjectName(target, currentPackageName(target));

  restampPackageJson(target, name);
  applyHost(target, name, site, host);
  restampIndexTitle(target, appTitle);
  restampAngularJson(target, oldName, name);
  restampReadme(target, name, site, host, appTitle);
  restampSite(target, name, appTitle, site);
  restampLicense(target, name);

  if (supabase) enableSupabase(target);
  if (git) gitInit(target);

  const mode = inPlace ? 'in-place' : 'spawn';
  console.log(
    `Stamped mode=${mode} name=${name} title=${appTitle} site=${site} host=${host} supabase=${supabase ? 'on' : 'off'} git=${git ? 'yes' : 'no'}`,
  );
  if (inPlace && currentFolderName(sourceRoot) !== name) {
    console.log(
      `Folder is still "${currentFolderName(sourceRoot)}". Rename it on disk if you want it to match --name.`,
    );
  } else if (!inPlace && currentFolderName(destDir) !== name) {
    console.log(`Spawned folder is "${currentFolderName(destDir)}" (app name is "${name}").`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
