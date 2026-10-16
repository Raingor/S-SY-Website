# Repository Guidelines

## Project Structure & Module Organization

- `src/` contains the React website and admin entry points. The Vue 2 admin lives in `src/admin-vue/`; keep its form definitions and components together there.
- `server.mjs`, `storage.mjs`, and the other root `.mjs` files implement the Node service and integrations.
- `public/` contains static assets. `scripts/` holds build helpers, mocks, and focused Node regression scripts. `docs/` and `DESIGN.md` contain project and design references.
- `src-entry.html` is the Vite build input. `npm run build` generates `dist/index.html` and the root `index.html`; change source files rather than editing generated output.

## Build, Test, and Development Commands

- `npm install` installs the locked dependencies.
- `npm run dev` starts Vite and opens the source entry. `npm run server` starts the Node service; `npm run server:local-ai` loads local AI settings from `.env` and `.env.local`.
- `npm run build` creates the single-file production entry. `npm run preview` serves the built output locally.
- Run focused regression scripts as needed, for example `npm run test:vehicle-service`, `npm run test:admin-session`, or `npm run test:attraction-publish-contract`. Each `test:*` script targets a specific contract; there is no configured coverage threshold.

## Coding Style & Naming Conventions

Use ES modules and follow the formatting of the surrounding file: JavaScript and Vue files use two-space indentation, descriptive camelCase identifiers, and single-quoted strings where established. Keep Vue admin field keys aligned with the API data shape. Name regression scripts `scripts/test-<area>.mjs`. No formatter or linter is configured; run `git diff --check` before submitting.

## Testing Guidelines

For behavior changes, run the closest relevant `npm run test:*` script and `npm run build` for UI or bundle changes. Keep tests focused on observable API or admin behavior; use the existing scripts as examples.

## Commit & Pull Request Guidelines

Recent commits use Conventional Commit prefixes such as `feat(admin):` and `fix(content):`, sometimes followed by a concise Chinese summary. PRs should describe the user-visible change, list validation commands and results, include screenshots for UI changes, and distinguish local commits from production deployment.

## Deployment

Update code through Git commits and the repository's Git deployment workflow. Do not use `rsync`, `scp`, `cp`, or other file-copy methods to synchronize source or build artifacts to production. Keep production uploads and data outside code deployment.

### Production Deployment Checklist (mandatory for any agent touching the server)

The production host is `106.15.53.150` (SSH key path may differ per machine; coordinate through the shared update-log). The systemd unit `sy-greece.service` uses a **release-directory layout with a drop-in override**, and the active release directory **changes over time**. Never assume a path from a previous session.

1. **Confirm the live directory first**: run `systemctl cat sy-greece.service` and read `WorkingDirectory` / `ExecStart` from the drop-in (`/etc/systemd/system/sy-greece.service.d/*.conf`). Writing files to a previous release directory has no effect on the running service — this exact mistake has already shipped broken deployments (2026-10-15/16: several bundles were written to the retired `20261010-dest-columns-91f2288` directory while the service ran from `20261015-audio-pinning-d92b26e-main`).
2. **Deploy the full trio** to the confirmed directory: `server.mjs` + `index.html` (site entry) + `dist/index.html` (the admin console bundle served at `/manage-9f3k7`). `dist/` is gitignored, so record the release-repo commit with `git add -f dist/index.html`.
3. **`server.mjs` changes require `node --check` + `systemctl restart sy-greece.service`**; bundle-only changes do not restart.
4. **Verify on the live site, not just on disk**: after copying, check `https://sy-greece.com` (or `/manage-9f3k7`) actually serves the new artifact — grep for a new-feature marker string or compare SHA-256 with the local build. Disk-write success alone is not proof of deployment.
5. **Verify the running process matches**: `ls -l /proc/$(systemctl show -p MainPID --value sy-greece.service)/cwd` should point at the directory you just wrote.
6. **Backup before overwriting**: copy the current `server.mjs`, `index.html`, `dist/index.html` to `/root/sy-greece-backups/<tag>-<timestamp>/` first.
7. **Runtime directories**: `public/images` (symlink into `sy-greece.stourweb.net/public/images`), `public/docs`, and `public/audio` are runtime-writable areas owned by `www`. After creating a new release directory from git, ensure they exist, are writable by `www`, and that parent directories keep their execute bit (`namei -l <path>` to inspect). A missing traverse bit on any parent silently breaks all admin uploads with `EACCES`.
8. **Regression before restart**: run the closest `npm run test:*` script(s) locally and `node --check server.mjs` on the staged file.
9. Do not import local fixtures or demo data into production; do not modify the database schema.

### Known Gotchas

- `storage.mjs` hardcodes `seed/site-data.json` relative to the repo root. Test scripts that spawn the server must copy `server.mjs`, `storage.mjs`, and siblings into a temp directory, symlink `node_modules`, and run with `cwd: tempRoot` (see `scripts/test-miniprogram-simulation.mjs`). Running tests with `cwd` set to the repo root pollutes the real seed file.
- `node_modules` is untracked since commit `fcdcaf8` — do not commit it; dependencies install from `package.json` / `package-lock.json`.
- The admin bundle is `dist/index.html`, **not** the root `index.html`. Deploying only the root file leaves the admin console stale — verify with a feature-marker grep on `/manage-9f3k7`.
- Filesystem permissions under `/www/wwwroot` are occasionally altered by external tooling (e.g. a directory losing its execute bit on 2026-10-16 broke all uploads). If uploads fail with `EACCES`, diagnose with `namei -l` and `sudo -u www test -w <dir>` before touching application code.

## Cross-Repository Updates

After every new change, notify `@sy-main-1008` and ask them to update the shared `update-log`. Include the change scope, validation, and whether it was committed, pushed, or deployed.

## Security & Configuration

Keep credentials and local settings in `.env` or `.env.local`; never commit secrets, private audio, or production data. Review generated files and asset changes before staging.
