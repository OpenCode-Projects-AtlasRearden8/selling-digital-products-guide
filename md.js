"use strict";

// Tiny, dependency-free Markdown → HTML converter for this guide.
// Supports the subset used by docs/: ATX headings, paragraphs, bullet and
// ordered lists, checkboxes, tables, fenced code, blockquotes, hr, and the
// inline forms `code`, **bold**, *italic*, [text](href). All text is
// HTML-escaped; nothing is executed.

const entityRules = [
  [/&/g, "&amp;"],
  [/</g, "&lt;"],
  [/>/g, "&gt;"],
  [/"/g, "&quot;"],
];

function escapeHTML(text) {
  let out = String(text);
  for (const [rx, rep] of entityRules) out = out.replace(rx, rep);
  return out;
}

function escapeURL(url) {
  return escapeHTML(String(url.trim()));
}

// Inline markdown within an already-context-free string.
function inline(text) {
  const parts = String(text).split(/(`[^`]+`)/g);
  let out = "";
  for (const part of parts) {
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      out += "<code>" + escapeHTML(part.slice(1, -1)) + "</code>";
    } else if (part) {
      out += inlineRaw(part);
    }
  }
  return out;
}

function inlineRaw(text) {
  let t = escapeHTML(text);
  t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "&lt;img alt=&quot;$1&quot;&gt;");
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, label, href) => {
    const safeHref = escapeURL(href);
    return '<a href="' + safeHref + '">' + label + "</a>";
  });
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*])\*([^*\s][^*]*)\*(?=[^*]|$)/g, "$1<em>$2</em>");
  return t;
}

function isListItem(line) {
  return /^[-*] /.test(line);
}
function isOrderedItem(line) {
  return /^\d+[.)] /.test(line);
}
function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}
function isTableSeparator(line) {
  return /^\s*\|[\s:|-]+\|\s*$/.test(line);
}
function isCheckbox(line) {
  return /^[-*] \[[ xX]\] /.test(line);
}

function splitRow(line) {
  const trimmed = String(line).trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function tableCell(content, header) {
  const tag = header ? "th" : "td";
  return "<" + tag + ">" + inline(content) + "</" + tag + ">";
}

function listItems(lines) {
  // A list block's non-item lines are continuations of the previous item.
  const items = [];
  for (const rawLine of lines) {
    if (isListItem(rawLine) || isOrderedItem(rawLine)) {
      items.push({ line: rawLine, text: rawLine });
    } else if (items.length) {
      items[items.length - 1].text += " " + rawLine.trim();
    }
  }
  return items;
}

function renderListBlock(lines) {
  const items = listItems(lines);
  const ordered = isOrderedItem(lines[0]);
  let body = ordered ? "<ol>\n" : "<ul>\n";
  for (const item of items) {
    const rawLine = item.text;
    const checkbox = isCheckbox(rawLine);
    let content;
    if (checkbox) {
      const checked = /\[[xX]\]/.test(rawLine);
      content =
        '<li><input type="checkbox" disabled' +
        (checked ? " checked" : "") +
        "> <span class=\"task\">" +
        inline(rawLine.replace(/^[-*] \[[ xX]\] /, "")) +
        "</span></li>";
    } else {
      const text = ordered
        ? rawLine.replace(/^\d+[.)] /, "")
        : rawLine.replace(/^[-*] /, "");
      content = "<li>" + inline(text) + "</li>";
    }
    body += content + "\n";
  }
  body += ordered ? "</ol>\n" : "</ul>\n";
  return body;
}

function renderHeading(lines) {
  const m = /^(#{1,6}) (.*)$/.exec(lines[0]);
  const level = m[1].length;
  const text = lines
    .slice(0)
    .map((l) => l.replace(/^#{1,6} /, ""))
    .join(" ")
    .trim();
  return "<h" + level + ">" + inline(text) + "</h" + level + ">\n";
}

function renderTable(lines) {
  const header = splitRow(lines[0]);
  let rows = [];
  for (let i = 2; i < lines.length; i++) {
    if (isTableRow(lines[i])) rows.push(splitRow(lines[i]));
  }
  let out = "<table>\n<thead>\n<tr>";
  for (const cell of header) out += tableCell(cell, true);
  out += "</tr>\n</thead>\n";
  if (rows.length) {
    out += "<tbody>\n";
    for (const row of rows) {
      out += "<tr>";
      row.forEach((cell, i) => {
        out += tableCell(cell, false);
      });
      out += "</tr>\n";
    }
    out += "</tbody>\n";
  }
  out += "</table>\n";
  return out;
}

function renderCodeFence(lines) {
  const content = lines
    .slice(1)
    .join("\n")
    .replace(/```\s*$/, "")
    .replace(/\n+$/, "");
  return "<pre><code>" + escapeHTML(content) + "</code></pre>\n";
}

function renderBlockquote(lines) {
  const inner = lines
    .map((l) => l.replace(/^>\s?/, ""))
    .join("\n")
    .trim();
  return "<blockquote>\n" + renderMarkdown(inner) + "</blockquote>\n";
}

function renderParagraph(lines) {
  return "<p>" + inline(lines.join(" ").trim()) + "</p>\n";
}

function blockType(lines) {
  const first = lines[0];
  if (first.startsWith("```")) return "code";
  if (/^#{1,6} /.test(first)) return "heading";
  if (isTableSeparator(lines[1] || "")) return "table";
  if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(first)) return "hr";
  if (first.startsWith(">")) return "quote";
  if (isListItem(first) || isOrderedItem(first)) return "list";
  return "paragraph";
}

function renderBlock(lines) {
  switch (blockType(lines)) {
    case "code":
      return renderCodeFence(lines);
    case "heading":
      return renderHeading(lines);
    case "table":
      return renderTable(lines);
    case "hr":
      return "<hr>\n";
    case "quote":
      return renderBlockquote(lines);
    case "list":
      return renderListBlock(lines);
    default:
      return renderParagraph(lines);
  }
}

// Group raw markdown into blocks: a run of paragraph lines becomes one block;
// headings, hr, quotes, lists, tables, and fenced code each start their own.
// Wrapped continuation lines inside a list/paragraph/table belong to that block.
function startsNewBlock(line) {
  return (
    line.startsWith("```") ||
    /^#{1,6} /.test(line) ||
    line.startsWith(">") ||
    /^\s*(---+|\*\*\*+|___+)\s*$/.test(line) ||
    isListItem(line) ||
    isOrderedItem(line)
  );
}

function splitBlocks(md) {
  const blocks = [];
  let current = [];
  const flush = () => {
    if (current.length) {
      blocks.push(current);
      current = [];
    }
  };
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let inCode = false;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Inside a code fence everything is raw until the closing fence.
    if (inCode) {
      current.push(line);
      if (line.startsWith("```")) {
        inCode = false;
        flush();
      }
      i++;
      continue;
    }

    if (line.trim() === "") {
      flush();
      i++;
      continue;
    }

    // Table: a header row with a separator row underneath.
    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flush();
      current.push(line, lines[i + 1]);
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) {
        current.push(lines[i]);
        i++;
      }
      flush();
      continue;
    }

    if (line.startsWith(">")) {
      flush();
      current.push(line);
      i++;
      while (i < lines.length && lines[i].startsWith(">")) {
        current.push(lines[i]);
        i++;
      }
      flush();
      continue;
    }

    if (
      current.length &&
      (isListItem(current[0]) || isOrderedItem(current[0])) &&
      !line.startsWith(">")
    ) {
      current.push(line);
      i++;
      continue;
    }

    if (startsNewBlock(line)) {
      flush();
      current.push(line);
      if (line.startsWith("```")) {
        inCode = true;
      } else if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
        flush();
      }
      i++;
      continue;
    }

    current.push(line);
    i++;
  }
  flush();
  return blocks;
}

function renderMarkdown(md) {
  return splitBlocks(md)
    .map((lines) => renderBlock(lines))
    .join("");
}

module.exports = {
  escapeHTML,
  inline,
  renderMarkdown,
  splitBlocks,
  blockType,
};
