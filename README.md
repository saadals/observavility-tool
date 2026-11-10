# Tayf (طيف) — Saudi-hosted observability platform · clickable demo

A **frontend-only, clickable prototype** of a unified IT infrastructure monitoring platform
(network, servers, applications and logs) positioned for Saudi organisations:

1. 100 % hosted inside Saudi Arabia (data residency)
2. Designed to support alignment with NCA ECC, PDPL and SAMA expectations
3. Arabic-first with full English support and true RTL/LTR mirroring
4. Local SAR pricing
5. Local support in Saudi business hours (Sunday–Thursday, AST)

> **This is a market-validation demo.** There is no backend: every number, device, alert and log line is
> mock data generated in the browser from a seeded generator. “Tayf” is a placeholder name.

---

## 1. Run it

Requirements: **Node.js 20.9+** (tested with Node 26) and npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

Sign in with **any e-mail and password**, or click “Continue with demo account”.

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-checks and exports a fully static site to `out/` |
| `npm run preview` (or `npm start`) | Serves `out/` locally on http://localhost:4173 (zero dependencies) |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npm run typecheck` | Strict TypeScript check |
| `npm run i18n:check` | Verifies Arabic and English files have identical keys and every `t('…')` key exists |
| `npm run check` | All three checks above |

## 2. Tech stack

- **Next.js 16 (Pages Router) with `output: 'export'`** — builds to plain static HTML/JS. Next.js has its
  own file-based router, so React Router is *not* used (running two routers side by side would only add
  conflicts). Device pages (`/devices/<id>/`) are pre-rendered for all 124 mock devices.
- **Tailwind CSS v4** with design tokens in `src/styles/globals.css` (dark NOC theme by default, plus light).
- **Recharts** (time series, histograms), **@xyflow/react** (React Flow) for topology and service dependencies.
- **Zustand** for state (settings, auth, live engine, leads, alert rules, UI).
- **react-i18next** with Arabic and English; **IBM Plex Sans Arabic** + **Inter** bundled via Fontsource
  (no Google Fonts request, works offline).
- Dates via the built-in `Intl` API: Gregorian and **Hijri (Umm al-Qura)**, always shown in
  **Arabia Standard Time (Asia/Riyadh, UTC+3)** regardless of the viewer’s machine.

## 3. Project structure

```
src/
  config/brand.ts        ← the ONLY place the product name lives
  pages/                 ← routes: index (landing/login), overview, network, devices/[id], topology,
                           servers, alerts/{index,rules}, logs, reports, compliance, pricing,
                           settings, admin/leads, 404
  components/
    layout/              ← AppShell, Sidebar, Topbar, PublicLayout
    ui/                  ← Button, Card, Badge/StatusPill, Form controls, Modal, Toaster, Pagination…
    charts/              ← RTL-aware TimeSeriesChart, Sparkline, HealthGauge
    map/SaudiMap.tsx     ← stylised SVG map of the Kingdom with site markers
    topology/            ← network topology + service dependency graphs
    alerts/, leads/, brand/, table/
  mock/                  ← seeded data layer (see §5)
  store/                 ← Zustand stores (settings, auth, live, leads, rules, ui)
  i18n/                  ← i18next setup + locales/{en,ar}/<section>.json
  lib/                   ← formatters (dates, SAR, units), hooks, pricing model, CSV export
  styles/globals.css
scripts/                 ← i18n checker, static preview server
```

## 4. Renaming the product

Edit **`src/config/brand.ts`**:

```ts
export const BRAND = {
  name: { en: 'Tayf', ar: 'طيف' },   // ← new names here
  storagePrefix: 'tayf',               // ← change too, so old demo data is not reused
  contactEmail: 'hello@tayf.example',
  ...
};
```

All translations reference the name through the `{{brand}}` variable, so no text files need editing.
Optionally replace the mark in `src/components/brand/Logo.tsx` and `public/favicon.svg`, and adjust the
palette tokens at the top of `src/styles/globals.css` (`--brand`, `--accent`, …).

## 5. Changing the mock data

Everything is deterministic: the same fleet, story and history appear on every load.

| File | Controls |
| --- | --- |
| `src/mock/sites.ts` | Sites (Riyadh HQ, Jeddah, Dammam/Khobar, Madinah, Makkah, Tabuk, NEOM, Abha, Riyadh DC1, Jeddah DC2), coordinates, map outline, NOC operator names |
| `src/mock/devices.ts` | `COMPOSITION` (device mix per site, ~124 devices), `INITIAL_PROBLEMS` (the demo “story”: devices down/degraded at start), WAN links & generic carriers, vendors/models |
| `src/mock/signals.ts` | How metrics behave: AST business-hours curve, Sun–Thu work week, noise, incidents, outages |
| `src/mock/alerts.ts` | Seeded alerts (open, acknowledged, 14-day resolved history) |
| `src/mock/logs.ts` | Log templates per device type, including Arabic-language application logs |
| `src/mock/apps.ts` | Business applications and their dependencies |
| `src/mock/compliance.ts` | Illustrative NCA ECC / PDPL / SAMA control-area mapping (texts in `locales/*/compliance.json`) |
| `src/lib/pricing.ts` | SAR tiers, annual discount and the illustrative “international vendor” comparison inputs |
| `src/store/live.ts` | Live behaviour: 3-second tick, how often new incidents appear and auto-resolve |
| `src/store/rules.ts` | Default alert rules |

To get a different but still deterministic data set, change the seed strings (e.g. `'alerts-v1'`, `'logs-v1'`).
Display names (sites, device types, carriers, apps, alert titles) are translated in `src/i18n/locales/*/common.json`.

**What persists:** language, theme, calendar and notification settings, alert rules and early-access
leads are kept in `localStorage`. Alert acknowledgements/resolutions live in memory for the browser
session (a reload restores the seeded story — handy before the next demo). *Settings → Reset demo data*
also restores it.

## 6. Translations, RTL and dates

- Strings live in `src/i18n/locales/{en,ar}/<section>.json`; `common.json` is mounted at the root, other
  files under their section name (e.g. `alerts.json` → `t('alerts.title')`). The TypeScript build fails if
  the Arabic files miss a key, and `npm run i18n:check` reports any mismatch.
- Layout uses logical CSS (`ms-/pe-/start-/end-`), so the sidebar, tables, toasts and forms mirror automatically.
  Directional icons flip with `rtl:-scale-x-100`.
- **Charts** render inside `dir="ltr"` and mirror explicitly: in Arabic, time flows right-to-left and the value
  axis moves to the right. Network topology and dependency graphs mirror their layout too.
- **The map deliberately does not mirror** — geography stays west-to-east in both languages.
- Arabic UI uses Latin digits (common in Saudi enterprise software). To use Arabic-Indic digits, change `nu-latn`
  to `nu-arab` in `src/lib/format.ts`.
- Units such as “ms” and “Gbps” are wrapped in Unicode isolates so they never reorder inside Arabic sentences.

## 7. Early-access leads

The **Request early access** button (header, landing page, pricing) opens a form: name, organisation, role,
industry, fleet size, current monitoring approach, biggest pain point, e-mail, mobile and a PDPL-style consent.
Submissions are stored in **this browser’s localStorage** and listed at **`/admin/leads`** (sidebar → Admin)
with simple analytics and **CSV export** (UTF-8 with BOM so Arabic opens correctly in Excel).

> Leads only exist in the browser where the form was submitted. If prospects fill the form on their own
> devices, you will not see them. For live campaigns, point the form at a real endpoint (e.g. replace
> `useLeads.add` in `src/components/leads/EarlyAccessModal.tsx` with a `fetch` to your form backend).

## 8. Deploying as a static site

```bash
npm run build      # → out/
```

Upload the contents of `out/` to any static host (Nginx/Apache, S3 + CloudFront, Azure Static Web Apps,
Netlify, Vercel, GitHub Pages, or an internal web server in your own Saudi data center).

- Every route is exported as a folder with `index.html` (`trailingSlash: true`), so deep links such as
  `/devices/ruh-dc1-db-erp01/` work without rewrite rules. `404.html` is generated for unknown paths.
- Hosting under a sub-path (e.g. `https://example.com/tayf-demo/`): build with
  `NEXT_PUBLIC_BASE_PATH=/tayf-demo npm run build`.
- GitHub Pages: `.github/workflows/deploy-pages.yml` builds with the right sub-path and publishes on every push to `main`. Set **Settings → Pages → Source** to **GitHub Actions** once.
- Minimal Nginx example:

  ```nginx
  server {
    listen 80;
    root /var/www/tayf-demo;
    location / { try_files $uri $uri/ $uri.html =404; }
    error_page 404 /404.html;
  }
  ```

## 9. Five-minute demo script

Start in **Arabic** (the default) and switch languages at least once to show that the whole layout mirrors.

| Time | Where | What to show and say |
| --- | --- | --- |
| 0:00 | **Landing** | “Hosted in Saudi Arabia” badge and the five pillars. Toggle **English ↔ العربية** to show full mirroring. Sign in with any e-mail. |
| 0:40 | **Overview** | Health score, devices up/warning/down, SLA % with *business-hours (Sun–Thu)* SLA, the Kingdom map. Hover **NEOM** (amber): the problem-device list and live feed show its primary fiber link is down and the site is running on the Carrier B 5G backup. Point out the AST time and Hijri date in the header. |
| 1:30 | **NEOM → device** | Click NEOM on the map → filtered inventory → **NUM-BR-ER01**. Live charts (Live/1h/…/90d), interface `Gi0/0/0` down, 5G backup carrying traffic, failover entries in the related logs, 90-day uptime strip. |
| 2:15 | **Topology** | Backbone view: amber backup link to NEOM, red **Tabuk** switch outage, DC interconnect Riyadh ↔ Jeddah. Click any node to drill in. |
| 2:45 | **Alerts** | Filter *Critical*, expand an alert for its timeline and Arabic runbook, **Acknowledge**, then **Resolve** — the dashboards recover. Open **Alert rules → New rule**: natural-language preview, “business hours only”, 7-day backtest. |
| 3:30 | **Logs** | Search an Arabic term such as `المدفوعات` — matches are highlighted; show live tail and level filters. |
| 3:55 | **Data residency** | “Data never leaves the Kingdom”: data-flow, Riyadh DC1 / Jeddah DC2, the NCA ECC / PDPL / SAMA checklist (stress: *designed to support alignment*, illustrative). |
| 4:30 | **Pricing** | Enter the prospect’s device and server counts in the calculator, show annual savings and the illustrative international comparison. Close with **Request early access**. |

Afterwards (not in front of the prospect) open `/admin/leads` and export the CSV.

**Tips:** do a hard refresh before each demo to restore the seeded story. Keep *Settings → Live updates* on;
a new incident appears roughly every 45 seconds and critical ones raise a toast.

## 10. What is simplified or left out

- **No backend, auth or real data collection.** Login accepts anything; data is generated in the browser.
- **React Router is not used** — Next.js routing provides the same navigation in a static export.
- **PDF downloads are simulated** with a toast; report previews are rendered in the browser.
- **Leads are per-browser** (localStorage) — see §7.
- **Alert actions are not persisted** across reloads (by design, so every demo starts from the same story).
- **The map outline is stylised**, with some city markers nudged apart for legibility.
- **Compliance content is illustrative** — not a certification, attestation or legal statement; control
  areas are paraphrased, not the official control numbering.
- **Pricing and the international comparison are placeholders** for validation, not quotes of any vendor.
- **Vendors and carriers are generic** (“Vendor A”, “Carrier A fiber”…) to avoid trademark issues.
- **Mobile:** the dashboard, alerts, inventory, logs and forms are designed for phones; the topology and
  dependency graphs are best viewed on a tablet or larger.
- **Arabic copy** was written as professional Modern Standard Arabic, but a native-speaker review is
  recommended before showing it to customers.
- Accessibility: keyboard focus states, labelled controls and colour-plus-icon status indicators are in
  place, but no formal screen-reader audit has been done.
