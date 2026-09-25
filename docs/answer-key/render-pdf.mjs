#!/usr/bin/env node
// Renders a Markdown file to a plain, text-only PDF (A4, Helvetica/Courier) with no
// dependencies, so intake reports can be regenerated anywhere Node runs:
//
//   node scripts/render-pdf.mjs intake/bug-03-qa-report.md intake/bug-03-qa-report.pdf
//
// Only headings, paragraphs, lists, tables (as text) and fenced code blocks are supported.
// Non-ASCII characters are transliterated because the standard PDF fonts are Latin-1 only.
import { readFileSync, writeFileSync } from "node:fs";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node scripts/render-pdf.mjs <input.md> <output.pdf>");
  process.exit(1);
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 56;
const STYLES = {
  h1: { font: "F2", size: 17, leading: 26, wrap: 55 },
  h2: { font: "F2", size: 13, leading: 21, wrap: 72 },
  body: { font: "F1", size: 10, leading: 14, wrap: 96 },
  code: { font: "F3", size: 8.5, leading: 11.5, wrap: 92 },
};

const ASCII = { "₹": "Rs.", "–": "-", "—": "-", "−": "-", "‘": "'", "’": "'", "“": '"', "”": '"', "…": "...", "→": "->", "×": "x", "·": "-", "≥": ">=", "≤": "<=" };
const toAscii = (text) => text.replace(/[^\x20-\x7e]/g, (ch) => ASCII[ch] ?? "?");
const escapePdf = (text) => text.replace(/[\\()]/g, (ch) => `\\${ch}`);

function wrap(text, width) {
  if (text.length <= width) return [text];
  const indent = /^\s*(?:- |\d+\. )?/.exec(text)[0].replace(/\S/g, " ");
  const lines = [];
  let line = "";
  for (const word of text.split(/ +/)) {
    if (line && (line + " " + word).length > width) {
      lines.push(line);
      line = indent + word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function layout(markdown) {
  const out = [];
  let inCode = false;
  for (const raw of markdown.split(/\r?\n/)) {
    if (raw.startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      for (const line of wrap(toAscii(raw), STYLES.code.wrap)) out.push({ style: "code", text: line });
      continue;
    }
    let text = raw
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
    let style = "body";
    const heading = /^(#{1,6})\s+(.*)$/.exec(text);
    if (heading) {
      style = heading[1].length === 1 ? "h1" : "h2";
      text = heading[2];
    } else if (/^\|?\s*:?-{3,}/.test(text)) {
      continue; // table separator row
    }
    text = toAscii(text).replace(/^(\s*)\* /, "$1- ");
    for (const line of wrap(text, STYLES[style].wrap)) out.push({ style, text: line });
  }
  return out;
}

function paginateLines(lines) {
  const pages = [[]];
  let y = PAGE_HEIGHT - MARGIN;
  for (const line of lines) {
    const { leading } = STYLES[line.style];
    if (y - leading < MARGIN) {
      pages.push([]);
      y = PAGE_HEIGHT - MARGIN;
    }
    y -= leading;
    pages.at(-1).push({ ...line, y });
  }
  return pages;
}

function contentStream(page, number, total) {
  const ops = page
    .filter((line) => line.text.trim() !== "")
    .map((line) => {
      const { font, size } = STYLES[line.style];
      return `BT /${font} ${size} Tf ${MARGIN} ${line.y.toFixed(1)} Td (${escapePdf(line.text)}) Tj ET`;
    });
  ops.push(`BT /F1 8 Tf ${PAGE_WIDTH - MARGIN - 40} 30 Td (Page ${number} of ${total}) Tj ET`);
  return ops.join("\n");
}

const pages = paginateLines(layout(readFileSync(input, "utf8")));
const objects = [];
const add = (body) => objects.push(body) && objects.length;

const catalogId = add("");
const pagesId = add("");
const fonts = [add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"), add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"), add("<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>")];
const pageIds = pages.map((page, i) => {
  const stream = contentStream(page, i + 1, pages.length);
  const contentId = add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
  return add(
    `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 ${fonts[0]} 0 R /F2 ${fonts[1]} 0 R /F3 ${fonts[2]} 0 R >> >> /Contents ${contentId} 0 R >>`,
  );
});
objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

let pdf = "%PDF-1.4\n";
const offsets = objects.map((body, i) => {
  const offset = Buffer.byteLength(pdf, "latin1");
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  return offset;
});
const xref = Buffer.byteLength(pdf, "latin1");
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
pdf += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
writeFileSync(output, pdf, "latin1");
console.log(`wrote ${output} (${pages.length} page${pages.length === 1 ? "" : "s"})`);
