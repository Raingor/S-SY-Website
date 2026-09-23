# Admin UI migration to Element

## Goal

Replace all Website admin interface components with the requested Element UI component system while preserving existing admin workflows, APIs, and data behavior.

## Current findings

- The Website and admin are currently built with React 19, React Router, and Vite.
- The admin is a large custom React implementation in `src/admin.jsx` with its own controls and styling in `src/styles.css`.
- The referenced Element UI documentation describes a Vue UI framework; this is not a drop-in React component library.
- The current worktree already has user changes in `index.html`, `server.mjs`, `src/admin.jsx`, and `src/styles.css`. Preserve them; do not overwrite or fold them into this migration without review.
- Confirmed: migrate only the admin to Vue 2 + official Element UI, keeping the public Website on React and preserving server APIs.

## Decisions

- Use Vue 2.7 with official Element UI 2.x; mount it only at `/manage-9f3k7` through a small React bridge.
- Preserve `/manage-9f3k7`, existing API contracts, authentication, upload behavior, and admin capabilities.
- Do not deploy until implementation and verification are complete; deployment is a separate release step.

## Phases

1. Inventory existing admin screens, reusable controls, and behavior; capture baseline build/tests.
2. Confirm integration approach and dependency versions.
3. Implement the Element-based admin shell and migrate all list, editor, form, dialog, status, date, upload, notification, and navigation components.
4. Verify API compatibility and complete admin workflows, responsive layout, and visual behavior in a real browser.
5. Build/test, review the complete diff including pre-existing user changes, then prepare production deployment and report evidence.

## Progress

- Framework boundary confirmed. Vue 2.7 + Element UI dependencies and the Vue mounting bridge are in place; the legacy React admin source is preserved.
- Migrated all 21 navigation areas into the Element UI shell, status controls, forms, date pickers, image upload, confirmation dialog, and login. Independent editor now retains the sidebar/top bar and uses the full list-width content area. Replaced collection-card lists and the overview recent-leads block with official Element UI `el-table`; inline status selectors and row actions remain in the table. The list region owns overflow scrolling so the admin shell does not need to scroll.
- Added editable nested guide credentials/directions/reviews and attraction interpretation points (including location fields and image upload), selectable destination-attraction relations, usable country/user options, coupon-code generation, and one-click realistic guide/country samples.
- `npm ci`, `npm run build`, `npm run test:miniprogram-simulation`, and `npm run test:wechat-pay` pass with the locked Vue 2.7.16 / Element UI 2.15.14 / Vite 7.3.6 toolchain. Vue 2 and transitive core-js 2 report upstream deprecation notices; npm reports three low-severity audit findings.
- Route tag parsing now treats the middle dot as a separator and filters legacy standalone separator tokens from array data; editing routes normalizes tags to a readable delimiter string and saving serializes clean labels. Production build and focused legacy/new-format parser assertions pass.
- Fixed the blank/unresponsive Element table root cause: the app's ESM Vue import and Element UI's CommonJS Vue import resolved to separate Vue 2.7 runtimes. Vite now aliases both to one runtime; the isolated authenticated browser confirms table headers and rows render.
- Split Site Settings into five Element UI tabs (Site & SEO, Share Image, Mini-program Access, Attraction Explanation, Membership), with the explanation and membership controls fully separated and the existing single Save action preserved.
- Browser QA against an isolated localhost JSON-storage server verified every populated admin list renders its expected headers and rows (20 areas), empty lists show the empty state, all five settings tabs expose only their respective fields, and the sidebar/nav remains present. No data was edited.
- Latest production build and both regression scripts pass. Isolated browser QA confirms all admin list tables and the five settings tabs. Production deployment remains intentionally blocked: the public server is still the PHP SITU CMS and this local Node/Vite application has not been deployed there; replacing the production site/API architecture is outside this UI change without explicit approval.
- Added per-list advanced filters alongside keyword search: publish/follow-up/payment status, category and relation fields, date ranges for submissions/bookings/expiry/trips, membership and recommendation state, plus min/max city-price filtering. Filters combine, expose result counts, clear together, and hide irrelevant controls for empty lists or non-informative single-value facets. Browser QA verified route status/day filtering, city price bounds, CRM calendar UI, and populated section filter schemas; custom-trip compact `YYYYMMDD~MMDD` dates are normalized for range matching.
