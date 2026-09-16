# Markdown Composer

Angular 22 website template that generates a basic angular SPA with optional deploy setup. It helps skip some of the initial steps in generating a project and setting it up in git with deploy config.

Clone this, run the "spawn" script, answer a few questions, you get a new app in another folder. A little like a paired down Spring Initializr for Angular 22 + Netlify. You'll need Node `^22.22.3 || ^24.15.0 || >=26.0.0` and npm.

### Mac / Linux

```bash
./scripts/spawn.sh
```

### Windows

```bat
scripts\spawn.ps1
```

`scripts\spawn.cmd` works, and so does `npm run create` if you'd rather answer the same questions in Node.

Go into the new folder, `npm install`, `npm start`, open http://localhost:4200. This repo stays the template, the script copies it. The new app can `npm run build`, and what you actually publish is `dist/<name>/browser`. Keep Netlify and the SPA rewrite is already in `netlify.toml`.

## What it asks

It'll ask you a handful of things.

1. App name, kebab-case. That goes into package.json, angular.json, titles, the default folder name.
2. Destination folder. Default is `../<name>`. This checkout gets left alone.
3. Site URL, optional. Lands in `site.ts`, this README, netlify comments.
4. Netlify or configure it yourself. Keeps or drops `netlify.toml` and the ship section below.
5. Supabase, default no. Stub files and a dependency if you say yes.
6. git init, default yes. Only in the new folder. No remote, no push.

<details>
<summary>Flags, if you don't want prompts</summary>

```bash
npm run create -- --name my-app --dest ../my-app --site https://example.netlify.app --host netlify --no-git
```

`--dest` and `--out` do the same thing. `--in-place` rewrites names in this folder and does not copy.

| Flag | Default | Meaning |
|------|---------|---------|
| `--name` | prompt / current folder | kebab-case app name (package, angular project, dist folder) |
| `--title` | Title Case of `--name` | display title (browser tab, `site.ts` `appTitle`) |
| `--site` | `https://example.netlify.app` | public site URL |
| `--dest` (`--out`) | `../<name>` | destination folder (copy mode) |
| `--in-place` | off | rewrite this checkout, no copy |
| `--host` | `netlify` | `netlify` keeps `netlify.toml`. `none` skips it |
| `--supabase` | off | placeholder Supabase strings. Angular CLI will not load `.env` |
| `--git` | on (copy mode) | `git init` in the new folder only |
| `--no-git` | | skip `git init` |

The copy leaves out `node_modules`, `.git`, `dist`, `.angular`, `coverage`, `.env`, and `.env.*`.

</details>

## Netlify

`--host netlify` is the default, you keep `netlify.toml`, it publishes `dist/<name>/browser` and sends `/*` to `/index.html`. In the Netlify UI, import the GitHub repo. Don't add `@netlify/angular-runtime`. The script never talks to the Netlify API, never stores credentials.

`--host none` deletes `netlify.toml`. You still build to `dist/<name>/browser`. Tell your host to serve `index.html` for unknown paths.

## Run

From the new app, or from here after `npm install`:

```bash
npm run check
npm install
npm start
```

Dev server: http://localhost:4200

## In-place

You can rewrite the package name, titles, publish path, and `src/app/core/site.ts` right here. The folder name on disk does not change.

```bash
npm run create -- --in-place --name my-app --site https://example.netlify.app
```

Publish URL: <!-- site-url -->https://md-composer.piousprogrammer.com<!-- /site-url -->

## Ship

<!-- ship-block -->
```bash
npm run build
```

Import the GitHub repo in Netlify. `netlify.toml` publishes `dist/md-composer/browser` and sends unknown paths to `/index.html`. Don't add the Angular SSR plugin. Nothing here logs into Netlify or saves credentials.
<!-- /ship-block -->

## Routes

- `/` Composer
- anything else is Not found

## Coding agents

If you're using a coding agent (Cursor, Claude, Grok, Copilot, that kind of thing) on this project, have it read `AGENTS.md` first. That's a short notes file for how this starter is set up, Angular 22, zoneless, spawn, don't push git, so the agent doesn't fight the template.

Angular also publishes official "skills," extra instructions so the agent writes Angular the current way instead of old NgModule-era patterns. Install those with:

```bash
npx skills add https://github.com/angular/skills --yes
```

## License

MIT
