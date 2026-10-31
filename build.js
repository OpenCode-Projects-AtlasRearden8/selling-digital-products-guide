"use strict";

// Build script: turns docs/*.md into a static, self-contained HTML site in
// site/ (or an output directory of your choosing). No network, no deps.

const fs = require("fs");
const path = require("path");
const md = require("./md");

const SITE_TITLE = "Selling Digital Products";
const SITE_SUBTITLE = "A plain-English manual for a one-person LLC";
const AUTHOR = "Dylan Asdale · Asdale Dynamics, LLC";
const LICENSE_LINE = "Copyright (c) 2026 Asdale Dynamics, LLC";

// Order matters: drives nav, ordering, and prev/next links.
const PAGES = [
  { file: "index.md", slug: "index", title: "Start Here", tag: null },
  {
    file: "01-what-to-make.md",
    slug: "01-what-to-make",
    title: "01 · What to Make Besides Books",
    tag: "Chapter 1",
  },
  {
    file: "02-platforms-and-fee-math.md",
    slug: "02-platforms-and-fee-math",
    title: "02 · Platforms and Fee Math",
    tag: "Chapter 2",
  },
  {
    file: "03-listing-copy-and-previews.md",
    slug: "03-listing-copy-and-previews",
    title: "03 · Listing Copy and Preview Images",
    tag: "Chapter 3",
  },
  {
    file: "04-licenses-in-plain-english.md",
    slug: "04-licenses-in-plain-english",
    title: "04 · Licenses in Plain English",
    tag: "Chapter 4",
  },
  {
    file: "05-copy-theft-response.md",
    slug: "05-copy-theft-response",
    title: "05 · Fighting Copy-Theft Calmly",
    tag: "Chapter 5",
  },
  {
    file: "06-seasonal-bundles.md",
    slug: "06-seasonal-bundles",
    title: "06 · Seasonal Bundles",
    tag: "Chapter 6",
  },
  {
    file: "07-when-to-leave-marketplaces.md",
    slug: "07-when-to-leave-marketplaces",
    title: "07 · When Marketplaces Stop Being Worth It",
    tag: "Chapter 7",
  },
  { file: "scorecard.md", slug: "scorecard", title: "Product Scorecard", tag: "Worksheet" },
  {
    file: "launch-checklist.md",
    slug: "launch-checklist",
    title: "Launch Checklist",
    tag: "Checklist",
  },
  { file: "glossary.md", slug: "glossary", title: "Glossary", tag: "Reference" },
];

const STYLE = `
:root { --ink:#22312f; --paper:#fdfbf6; --accent:#2d6a4f; --soft:#eef4f0; --line:#dde5df; }
* { box-sizing:border-box; }
body { margin:0; background:var(--paper); color:var(--ink);
  font:17px/1.65 Georgia, "Times New Roman", serif; }
a { color:var(--accent); }
code { font:0.9em/1.6 ui-monospace, "SF Mono", Consolas, monospace;
  background:var(--soft); padding:.1em .35em; border-radius:3px; }
pre { background:var(--soft); border:1px solid var(--line); border-radius:6px;
  padding:1rem; overflow-x:auto; }
pre code { background:none; padding:0; }
blockquote { margin:1.5em 0; padding:.6rem 1.1rem; border-left:4px solid var(--accent);
  background:var(--soft); border-radius:0 6px 6px 0; }
table { border-collapse:collapse; width:100%; margin:1.5em 0; font-size:.94em; }
th, td { border:1px solid var(--line); padding:.45em .7em; text-align:left; }
th { background:var(--soft); }
input[type=checkbox] { accent-color: var(--accent); margin-right:.35em; }
hr { border:0; border-top:1px solid var(--line); margin:2.5em 0; }
header.site, footer.site { max-width:60rem; margin:0 auto; padding:0 1.25rem; }
header.site { padding-top:1.5rem; }
.masthead { font-family:"Helvetica Neue", Arial, sans-serif; }
.masthead h1 { margin:0; font-size:1.45rem; letter-spacing:.01em; }
.masthead p { margin:.15rem 0 .9rem; font-size:.92rem; color:#5c6c66; }
nav.pages { display:flex; flex-wrap:wrap; gap:.4rem .6rem; padding-bottom:1rem; }
nav.pages a { font:.82rem/1.4 "Helvetica Neue", Arial, sans-serif; text-decoration:none;
  padding:.25rem .6rem; border:1px solid var(--line); border-radius:999px;
  background:#fff; }
nav.pages a.current { background:var(--accent); color:#fff; border-color:var(--accent); }
main.sheet { max-width:46rem; margin:0 auto; padding:1.5rem 1.25rem 3rem; }
main.sheet::before { content:""; display:block; border-top:1px solid var(--line);
  margin-bottom:1.5rem; }
main.sheet h1 { line-height:1.25; margin-top:.5rem; }
main.sheet h1 + p em { color:#5c6c66; }
dl.footnote, .pager { font-family:"Helvetica Neue", Arial, sans-serif; }
.pager { display:flex; justify-content:space-between; gap:1rem; margin-top:2.5rem;
  padding-top:1rem; border-top:1px solid var(--line); font-size:.9rem; }
footer.site { border-top:1px solid var(--line); padding:1.25rem; margin-top:1rem;
  font:.85rem/1.6 "Helvetica Neue", Arial, sans-serif; color:#5c6c66; }
footer.site p { margin:.2rem 0; }
@media print { nav.pages, .pager { display:none; } }
`;

function navFor(slug) {
  return (
    '<nav class="pages">' +
    PAGES.map((p) => {
      const cls = p.slug === slug ? ' class="current"' : "";
      const label = p.tag ? escapeNavLabel(p.title) : escapeNavLabel(p.title);
      return (
        '<a href="' + p.slug + '.html"' + cls + ">" + label + "</a>"
      );
    }).join("") +
    "</nav>"
  );
}

function escapeNavLabel(s) {
  return md.escapeHTML(s);
}

function prevNext(slug) {
  const i = PAGES.findIndex((p) => p.slug === slug);
  const parts = [];
  if (i > 0) {
    parts.push('<a href="' + PAGES[i - 1].slug + '.html">&larr; ' + md.escapeHTML(PAGES[i - 1].title) + "</a>");
  } else {
    parts.push("<span></span>");
  }
  if (i < PAGES.length - 1) {
    parts.push('<a href="' + PAGES[i + 1].slug + '.html">' + md.escapeHTML(PAGES[i + 1].title) + " &rarr;</a>");
  } else {
    parts.push("<span></span>");
  }
  return '<div class="pager">' + parts.join("") + "</div>";
}

function page(slug) {
  const nav = navFor(slug);
  const pager = prevNext(slug);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${md.escapeHTML(SITE_TITLE)} · ${md.escapeHTML(SITE_SUBTITLE)}</title>
<style>${STYLE}</style>
</head>
<body>
<header class="site masthead">
<h1><a href="index.html" style="text-decoration:none;color:inherit">${md.escapeHTML(SITE_TITLE)}</a></h1>
<p>${md.escapeHTML(SITE_SUBTITLE)} — ${md.escapeHTML(AUTHOR)}</p>
${nav}
</header>
<main class="sheet">
__CONTENT__
${pager}
</main>
<footer class="site">
<p>${md.escapeHTML(SITE_TITLE)} is maintained by ${md.escapeHTML(AUTHOR)}.</p>
<p>Companion guides: <em>craft-fair-seller-handbook</em> and <em>publishing-beyond-kdp-guide</em>.</p>
<p>${md.escapeHTML(LICENSE_LINE)} · MIT license.</p>
</footer>
</body>
</html>
`;
}

function relativeLinksFix(html, docsDir) {
  // Docs links were written relative to docs/; once flattened into HTML at
  // the site root, links are already slug.html — nothing to fix. Kept as a
  // hook for future relative-path rules.
  void docsDir;
  return html;
}

function buildInto(outDir, docsDir) {
  docsDir = docsDir || path.join(__dirname, "docs");
  outDir = outDir || path.join(__dirname, "site");
  fs.mkdirSync(outDir, { recursive: true });
  const built = [];
  for (const [i, pageDef] of PAGES.entries()) {
    const srcPath = path.join(docsDir, pageDef.file);
    const raw = fs.readFileSync(srcPath, "utf8");
    let html = md.renderMarkdown(raw);
    html = relativeLinksFix(html, docsDir);
    const full = page(pageDef.slug).replace("__CONTENT__", html);
    const outPath = path.join(outDir, pageDef.slug + ".html");
    fs.writeFileSync(outPath, full, "utf8");
    built.push({ ...pageDef, outPath, index: i });
  }
  return built;
}

if (require.main === module) {
  const outDir = process.argv[2];
  const built = buildInto(outDir);
  console.log(
    "Built " +
      built.length +
      " pages into " +
      (outDir || path.join(__dirname, "site"))
  );
}

module.exports = { buildInto, PAGES, SITE_TITLE, LICENSE_LINE };
