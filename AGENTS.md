# Agent notes

This is Angular 22, zoneless, standalone, signals, `OnPush`.

Install and obey official skills: `npx skills add https://github.com/angular/skills --yes`

Official refs:

- https://angular.dev
- https://github.com/angular/skills
- https://docs.netlify.com/build/frameworks/framework-setup-guides/angular/

## Spawn vs in-place

This checkout is a **template**. Two front doors, same engine (`scripts/create.mjs`: copy → stamp → optional git).

- **Humans:** `./scripts/spawn.sh` (macOS/Linux) or `scripts/spawn.ps1` / `scripts/spawn.cmd` (Windows). Each question prints a plain explanation first. `npm run create` with no flags is the same explained Q&A via Node (Windows-friendly).
- **AI:** `npm run create -- --name my-app --title "My App" --dest ../my-app --site … --host netlify|none --no-git`. `--dest` and `--out` are aliases. `--title` is the display name (tab, `site.ts` `appTitle`); default is Title Case of `--name`. Copy skips `node_modules`, `.git`, `dist`, `.angular`, `coverage`, `.env`, and `.env.*`.
- `--in-place`: restamp this checkout without copy (package name, titles, publish path, `src/app/core/site.ts`, README markers). Does not rename the folder on disk.

`git init` (default yes on spawn) runs in the **new** folder only. Never add a GitHub remote or push from the script.

## Generate

Use `npx ng generate`. New components: standalone, `ChangeDetectionStrategy.OnPush`, `inject()` instead of constructor DI, `@if` / `@for` / `@switch`. Prefer `input()` / `input.required()` / `model()`. Add `provideHttpClient()` only when the app actually talks HTTP.

Domain layout: `composer/` is the only bounded context. The aggregate is `Draft` (body + selection). Markup commands live in `markup-command.ts`; `applyCommand` is `Draft × command → Draft`. `draft-store.ts` and `markdown-html.ts` are adapters. `Composer` is the one screen. `core/` is product identity. `not-found` sits next to `app.ts`. Do not add `pages/`, pane-component folders, or a `shell/` layer.

Shared identity is `src/app/core/site.ts` (`appName`, `appTitle`, `siteUrl`) — restamp it with `npm run create`, do not hardcode a personal domain.

Landing route is `Composer` (eager). `**` is `loadComponent` to `not-found`. Keep the wildcard last. Route `title` values are composed by `AppTitleStrategy`.

Do not add tests unless asked. Do not run or exercise the application unless asked. `ng generate` skips specs (`skipTests`).

## Hosting

Static SPA. Publish dir is `dist/<package-name>/browser` (explicit `outputPath.base` in `angular.json`). Do not flatten `browser` unless you verified the output. Do not add `@netlify/angular-runtime`.

- Default `--host netlify`: keep `netlify.toml` SPA rewrite (`/*` → `/index.html`). Document Netlify dashboard **Import from GitHub** only — no Netlify API or credential scripting.
- `--host none`: remove `netlify.toml` from the spawn. README ship section is static build → `dist/<name>/browser`; the operator wires the host and history fallback to `index.html`.

## Git

Never `git push` or create GitHub remotes unless the human explicitly asks in that session.
