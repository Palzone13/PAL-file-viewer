/**
 * PAL Format Parser
 * Parses .pal files into a structured token array.
 *
 * Syntax:
 *   ## comment
 *   @key: value       — metadata tag
 *   ::Heading         — heading
 *   ---Subheading     — subheading
 *   ===               — divider
 *   - item            — list item
 *   plain text        — paragraph
 *
 * Inline formatting (inside any text/paragraph/heading/list):
 *   *bold*   ~italic~   `highlight`
 */

function parsePAL(source) {
  const lines = source.split(/\r?\n/);
  const tokens = [];
  const meta = {};

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (line.startsWith("##")) {
      tokens.push({ type: "comment", raw: line.slice(2).trim() });

    } else if (line.startsWith("@")) {
      const match = line.match(/^@([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        meta[key] = value;
        tokens.push({ type: "meta", key, value });
      }

    } else if (line.startsWith("::")) {
      tokens.push({ type: "heading", inline: parseInline(line.slice(2).trim()) });

    } else if (line.startsWith("---")) {
      tokens.push({ type: "subheading", inline: parseInline(line.slice(3).trim()) });

    } else if (line.trim() === "===") {
      tokens.push({ type: "divider" });

    } else if (line.startsWith("- ")) {
      tokens.push({ type: "listitem", inline: parseInline(line.slice(2).trim()) });

    } else if (line.trim() === "") {
      tokens.push({ type: "blank" });

    } else {
      tokens.push({ type: "paragraph", inline: parseInline(line) });
    }
  }

  return { meta, tokens };
}

/**
 * Parses inline formatting within a string.
 * Returns an array of inline nodes: { type: "text"|"bold"|"italic"|"highlight", value }
 */
function parseInline(str) {
  const nodes = [];
  const pattern = /(\*([^*]+)\*|~([^~]+)~|`([^`]+)`)/g;
  let last = 0;
  let match;

  while ((match = pattern.exec(str)) !== null) {
    if (match.index > last) {
      nodes.push({ type: "text", value: str.slice(last, match.index) });
    }
    if (match[2] !== undefined) {
      nodes.push({ type: "bold", value: match[2] });
    } else if (match[3] !== undefined) {
      nodes.push({ type: "italic", value: match[3] });
    } else if (match[4] !== undefined) {
      nodes.push({ type: "highlight", value: match[4] });
    }
    last = match.index + match[0].length;
  }

  if (last < str.length) {
    nodes.push({ type: "text", value: str.slice(last) });
  }

  return nodes;
}

/**
 * Renders a parsed PAL document to an HTML string.
 */
function renderPALtoHTML(parsed) {
  const { tokens } = parsed;
  let html = "";
  let inList = false;

  for (const token of tokens) {
    if (token.type !== "listitem" && inList) {
      html += "</ul>";
      inList = false;
    }

    switch (token.type) {
      case "comment":
        break;
      case "meta":
        break;
      case "heading":
        html += `<h1>${renderInline(token.inline)}</h1>`;
        break;
      case "subheading":
        html += `<h2>${renderInline(token.inline)}</h2>`;
        break;
      case "divider":
        html += `<hr>`;
        break;
      case "listitem":
        if (!inList) { html += "<ul>"; inList = true; }
        html += `<li>${renderInline(token.inline)}</li>`;
        break;
      case "paragraph":
        html += `<p>${renderInline(token.inline)}</p>`;
        break;
      case "blank":
        break;
    }
  }

  if (inList) html += "</ul>";
  return html;
}

function renderInline(nodes) {
  return nodes.map(n => {
    switch (n.type) {
      case "bold":      return `<strong>${escapeHTML(n.value)}</strong>`;
      case "italic":    return `<em>${escapeHTML(n.value)}</em>`;
      case "highlight": return `<code>${escapeHTML(n.value)}</code>`;
      default:          return escapeHTML(n.value);
    }
  }).join("");
}

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

if (typeof module !== "undefined") {
  module.exports = { parsePAL, parseInline, renderPALtoHTML };
}
