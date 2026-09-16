#!/usr/bin/env bash
# Human front door: explained questions, then the same engine as npm run create.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ $# -gt 0 ]]; then
  exec node "$ROOT/scripts/create.mjs" "$@"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Need Node.js to spawn an app. Install from https://nodejs.org (see README engines)." >&2
  exit 1
fi

NAME_RE='^[a-z0-9]+(-[a-z0-9]+)*$'

ask() {
  local prompt="$1"
  local default="${2-}"
  local reply=""
  if [[ -n "$default" ]]; then
    read -r -p "${prompt} [${default}]: " reply || true
    printf '%s' "${reply:-$default}"
  else
    read -r -p "${prompt}: " reply || true
    printf '%s' "$reply"
  fi
}

lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

ask_yes_no() {
  local prompt="$1"
  local default_yes="$2"
  local hint fallback reply lc
  if [[ "$default_yes" == "1" ]]; then
    hint="Y/n"
    fallback="Y"
  else
    hint="y/N"
    fallback="N"
  fi
  reply="$(ask "${prompt} (${hint})" "$fallback")"
  lc="$(lower "$reply")"
  case "$lc" in
    n|no) return 1 ;;
    y|yes) return 0 ;;
    *)
      if [[ "$default_yes" == "1" ]]; then
        return 0
      fi
      return 1
      ;;
  esac
}

normalize_host() {
  local lc
  lc="$(lower "$1")"
  case "$lc" in
    netlify|y|yes) printf 'netlify' ;;
    none|skip|n|no) printf 'none' ;;
    *)
      echo "Please answer netlify or none." >&2
      return 1
      ;;
  esac
}

echo "Spawn a new Angular app from this template. This checkout stays put."

name=""
while true; do
  cat <<'EOF'

App name (kebab-case)
Goes into package.json, angular.json (project + dist/<name>/browser), the
browser tab title, site.ts, README, and LICENSE. Also used as the default
folder name. Lowercase, digits, hyphens — garden-tracker, not Garden Tracker.

EOF
  name="$(ask "App name (kebab-case)")"
  if [[ "$name" =~ $NAME_RE ]]; then
    break
  fi
  echo "That name is not kebab-case. Example: garden-tracker" >&2
done

default_dest="../${name}"
while true; do
  cat <<EOF

Destination folder
We copy this template into a new folder. Default: ${default_dest} (next to this
checkout). Skips node_modules, .git, dist, .angular, coverage, and .env files.
Don't pick this template folder — that's --in-place, not a spawn.

EOF
  dest="$(ask "Destination folder" "$default_dest")"
  dest_abs="$(node -e 'console.log(require("node:path").resolve(process.argv[1], process.argv[2]))' "$ROOT" "$dest")"
  if [[ "$dest_abs" == "$ROOT" ]]; then
    echo "Destination is the template root. Pick another folder." >&2
    continue
  fi
  break
done

cat <<'EOF'

Site URL (optional)
Placeholder in site.ts, README, and netlify.toml if you keep Netlify.
Change it later. Blank = https://example.netlify.app.

EOF
site="$(ask "Public site URL" "https://example.netlify.app")"

host=""
while true; do
  cat <<EOF

Hosting
  netlify  Keep netlify.toml. Publish dir is dist/${name}/browser; unknown
           routes hit index.html. In Netlify: Import from GitHub. This script
           does not log in.
  none     Drop netlify.toml. You host dist/${name}/browser yourself and set a
           fallback to index.html.

EOF
  host_raw="$(ask "Host (netlify, or none = I'll configure deploy myself)" "netlify")"
  if host="$(normalize_host "$host_raw")"; then
    break
  fi
done

cat <<'EOF'

Supabase (optional)
Adds placeholder URL/anon-key files and @supabase/supabase-js.
Angular CLI won't load .env. Default No. Skip unless you need it.

EOF
supabase_args=()
if ask_yes_no "Add a Supabase stub?" 0; then
  supabase_args=(--supabase)
fi

cat <<'EOF'

git init (new folder only)
Runs git init -b main in the new folder. No remote, no push, template .git is
untouched. Default Yes.

EOF
git_args=(--git)
if ! ask_yes_no "git init in the new folder?" 1; then
  git_args=(--no-git)
fi

echo
echo "Copying template → ${dest} and stamping name=${name} host=${host}"
args=(--name "$name" --dest "$dest" --site "$site" --host "$host")
if [[ ${#supabase_args[@]} -gt 0 ]]; then
  args+=("${supabase_args[@]}")
fi
args+=("${git_args[@]}")
exec node "$ROOT/scripts/create.mjs" "${args[@]}"
