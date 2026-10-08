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

## Cross-Repository Updates

After every new change, notify `@sy-main-1008` and ask them to update the shared `update-log`. Include the change scope, validation, and whether it was committed, pushed, or deployed.

## Security & Configuration

Keep credentials and local settings in `.env` or `.env.local`; never commit secrets, private audio, or production data. Review generated files and asset changes before staging.
