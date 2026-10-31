# Selling Digital Products Guide

A plain-English manual for a one-person LLC selling digital products directly
— what to make besides books, how to compare Etsy/Gumroad/Ko-fi with honest
round-number fee math, listing copy and preview images, plain-English license
pages, calm responses to copy-theft (no lawyers required), seasonal bundles,
and the signals for when marketplaces stop being worth it.

Written by Dylan Asdale and published by **Asdale Dynamics, LLC**. It
explains digital selling the way the rest of this catalog explains AI: like
a friend would — clear, step by step, never condescending.

## What's inside

- **Chapters 1–7** — product ideas (templates, printables, planners), platform
  fee math in round numbers, listing craft, licenses, anti-theft protocol,
  seasonal bundling, and the own-your-store decision.
- **Product scorecard worksheet** — score any idea 1–40 before spending an
  afternoon on it.
- **Launch checklist** — a complete tick-list from two weeks before launch to
  steady state.
- **Glossary** — the jargon, explained without the condescension.

## The static site

The guide ships as markdown in `docs/` and builds to a small, self-contained
static HTML site in `site/`. The build script uses Node's standard library
only — no network access, no npm packages, no telemetry.

```sh
npm run build   # renders docs/*.md into site/*.html
npm test        # runs the build-system tests (node --test)
npm start       # previews site/ at http://127.0.0.1:4173 (local only)
```

Requirements: Node 18 or newer. Nothing is uploaded anywhere; `npm start`
binds to 127.0.0.1 only.

## Layout

| Path | What it is |
| --- | --- |
| `docs/` | The manual, in markdown — one file per chapter plus worksheets |
| `build.js` | Markdown → static HTML build script |
| `md.js` | Small dependency-free markdown renderer used by the build |
| `serve.js` | Local-only preview server |
| `tests/` | Build-system tests |
| `site/` | Generated output (rebuild any time; safe to delete) |

## Companion guides

This manual sits on a shelf with two siblings from the same LLC:

- **craft-fair-seller-handbook** — selling physical goods in person: table
  fees, cash handling, and receipts.
- **publishing-beyond-kdp-guide** — the books themselves: wide distribution
  beyond Amazon KDP, direct sales, and launch calendars that this guide's
  seasonal-bundle rhythm plugs into.

## A note, not legal or tax advice

Everything here is practical experience with round numbers attached. Where
fees matter, verify current rates on each platform's own fee page before
pricing anything. Nothing in this guide is medical, legal, or financial
advice.

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 Asdale Dynamics, LLC.
