"use strict";

// Tests for the guide's build system. Run with `npm test`.
// No network access, no dependencies, everything runs from local files.

const assert = require("node:assert");
const { describe, it } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const md = require("../md");
const { buildInto, PAGES, LICENSE_LINE } = require("../build");

function tmpSite() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sdp-site-"));
}

describe("markdown converter", () => {
  it("renders ATX headings at their level", () => {
    assert.match(md.renderMarkdown("## Two"), /<h2>Two<\/h2>/);
  });

  it("renders paragraphs and inline emphasis", () => {
    const html = md.renderMarkdown("This is **bold** and *soft*.");
    assert.match(html, /<strong>bold<\/strong>/);
    assert.match(html, /<em>soft<\/em>/);
  });

  it("renders inline code and code spans survive escaping", () => {
    const html = md.renderMarkdown("Run `npm test` now.");
    assert.match(html, /<code>npm test<\/code>/);
  });

  it("escapes raw HTML so nothing executes", () => {
    const html = md.renderMarkdown(
      "Hello <script>alert(1)</script> and [x](javascript:alert(1))"
    );
    assert.ok(!html.includes("<script>"), "script tag must not survive");
    assert.ok(html.includes("&lt;script&gt;"));
    const hrefMatch = /href="([^"]*)"/.exec(html);
    assert.ok(hrefMatch, "link present");
    assert.ok(!/<script/i.test(hrefMatch[1]), "javascript: href must be escaped");
  });

  it("renders bullet lists and ordered lists", () => {
    const html = md.renderMarkdown("- one\n- two\n\n1. first\n2. second");
    assert.match(html, /<ul>[\s\S]*<li>one<\/li>[\s\S]*<li>two<\/li>[\s\S]*<\/ul>/);
    assert.match(html, /<ol>[\s\S]*<li>first<\/li>[\s\S]*<li>second<\/li>[\s\S]*<\/ol>/);
  });

  it("renders checkboxes as disabled inputs", () => {
    const html = md.renderMarkdown("- [ ] todo\n- [x] done");
    assert.match(html, /<input type="checkbox" disabled>/);
    assert.match(html, /<input type="checkbox" disabled checked>/);
  });

  it("renders tables with header cells", () => {
    const html = md.renderMarkdown("| a | b |\n| --- | --- |\n| 1 | 2 |");
    assert.match(html, /<th>a<\/th>/);
    assert.match(html, /<td>1<\/td>/);
  });

  it("renders fenced code blocks escaped", () => {
    const html = md.renderMarkdown("```\n<b>raw</b>\n```");
    assert.match(html, /<pre><code>&lt;b&gt;raw&lt;\/b&gt;<\/code><\/pre>/);
  });

  it("renders blockquotes containing markdown", () => {
    const html = md.renderMarkdown("> You may:\n>\n> - keep it\n> - print it");
    assert.match(html, /<blockquote>/);
    assert.match(html, /<li>keep it<\/li>/);
  });

  it("renders horizontal rules", () => {
    assert.match(md.renderMarkdown("---\n\nnext"), /<hr>/);
  });

  it("joins wrapped paragraph lines into a single <p>", () => {
    const html = md.renderMarkdown(
      "first sentence keeps going\nsecond line same paragraph.\n\nnew para."
    );
    assert.match(html, /<p>first sentence keeps going second line same paragraph\.<\/p>/);
    assert.equal(html.match(/<p>/g).length, 2);
  });

  it("keeps bold spanning wrapped lines inside list items", () => {
    const html = md.renderMarkdown(
      "- note: **$1.40 → you keep\nabout $8.60** (~14%)"
    );
    assert.match(
      html,
      /<strong>\$1\.40 → you keep about \$8\.60<\/strong> \(~14%\)/
    );
  });

  it("groups consecutive quoted lines into one blockquote", () => {
    const html = md.renderMarkdown("> you may\n>\n>- one\n>- two");
    assert.equal(html.match(/<blockquote>/g).length, 1);
    assert.match(html, /<p>you may<\/p>/);
    assert.match(html, /<li>one<\/li>/);
    assert.match(html, /<li>two<\/li>/);
  });

  it("renders markdown links with escaped hrefs", () => {
    const html = md.renderMarkdown("See [Chapter 2](02-platforms-and-fee-math.html)");
    assert.match(html, /<a href="02-platforms-and-fee-math\.html">Chapter 2<\/a>/);
  });
});

describe("static build", () => {
  it("writes one HTML page per source doc", () => {
    const out = tmpSite();
    const built = buildInto(out);
    assert.equal(built.length, PAGES.length);
    for (const page of built) {
      assert.ok(
        fs.existsSync(page.outPath),
        "missing output page for " + page.slug
      );
    }
    fs.rmSync(out, { recursive: true, force: true });
  });

  it("renders real doc content without leaving raw markdown fences", () => {
    const out = tmpSite();
    buildInto(out);
    const index = fs.readFileSync(path.join(out, "index.html"), "utf8");
    assert.ok(index.includes("<h1>"));
    assert.ok(!index.includes("<pre class>"), "no malformed output");
    assert.ok(index.includes("Scorecard") || index.includes("scorecard.html"),
      "nav or content must reference the worksheet");
    fs.rmSync(out, { recursive: true, force: true });
  });

  it("links between chapter pages resolve to real files and anchors", () => {
    const out = tmpSite();
    buildInto(out);
    const slugs = new Set(PAGES.map((p) => p.slug + ".html"));
    for (const page of PAGES) {
      const html = fs.readFileSync(path.join(out, page.slug + ".html"), "utf8");
      const hrefs = [...html.matchAll(/href="([a-z0-9-]+\.html)"/g)].map((m) => m[1]);
      for (const href of new Set(hrefs)) {
        assert.ok(
          slugs.has(href),
          page.slug + " links to unknown page " + href
        );
      }
    }
    fs.rmSync(out, { recursive: true, force: true });
  });

  it("every page includes site branding and the license footer", () => {
    const out = tmpSite();
    buildInto(out);
    for (const page of PAGES) {
      const html = fs.readFileSync(path.join(out, page.slug + ".html"), "utf8");
      assert.ok(html.includes("Asdale Dynamics, LLC"), page.slug + " lacks publisher credit");
      assert.ok(html.toLowerCase().includes("craft-fair-seller-handbook"),
        page.slug + " lacks companion-guide mention");
    }
    fs.rmSync(out, { recursive: true, force: true });
  });

  it("build output contains no script tags or event handlers", () => {
    const out = tmpSite();
    buildInto(out);
    for (const page of PAGES) {
      const html = fs.readFileSync(path.join(out, page.slug + ".html"), "utf8");
      assert.ok(!/<script(?![a-z])/i.test(html), page.slug + " contains script tag");
      assert.ok(!/on(error|load|click)=/i.test(html), page.slug + " contains handler");
    }
    fs.rmSync(out, { recursive: true, force: true });
  });
});

describe("repo hygiene", () => {
  const root = path.join(__dirname, "..");

  it("LICENSE carries the exact required copyright line", () => {
    const license = fs.readFileSync(path.join(root, "LICENSE"), "utf8");
    assert.ok(
      license.includes("Copyright (c) 2026 Asdale Dynamics, LLC"),
      "LICENSE must credit Asdale Dynamics, LLC"
    );
    assert.equal(
      license.trim().split("\n").filter((l) => l.startsWith("Copyright (c)"))[0],
      LICENSE_LINE
    );
  });

  it("README credits Asdale Dynamics, LLC", () => {
    const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
    assert.ok(readme.includes("Asdale Dynamics, LLC"));
  });

  it("docs contain no obvious secrets", () => {
    const docsDir = path.join(root, "docs");
    for (const file of fs.readdirSync(docsDir)) {
      const text = fs.readFileSync(path.join(docsDir, file), "utf8");
      assert.ok(!/AKIA[0-9A-Z]{16}/.test(text), file + " looks like it has an AWS key");
      assert.ok(!/API_KEY\s*=\s*['"]?[A-Za-z0-9_\-]{20,}/.test(text), file + " has suspicious key");
      assert.ok(!/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text), file + " has private key");
    }
  });

  it("every docs markdown file maps to a build page", () => {
    const docsDir = path.join(root, "docs");
    const files = fs.readdirSync(docsDir).filter((f) => f.endsWith(".md"));
    const covered = new Set(PAGES.map((p) => p.file));
    for (const f of files) {
      assert.ok(covered.has(f), f + " exists in docs/ but is not in build config");
    }
  });
});
