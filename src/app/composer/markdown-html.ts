import { marked } from 'marked';

const ALERT_KINDS = 'NOTE|TIP|IMPORTANT|WARNING|CAUTION';

/** Angular strips <input> from innerHTML, so GFM task checkboxes become spans. */
export function markdownToHtml(source: string): string {
  const footnotes: { id: string; n: number; text: string }[] = [];
  let taskIndex = 0;
  const prepared = source
    .split(/(```[\s\S]*?```)/g)
    .map((chunk) => {
      if (chunk.startsWith('```')) {
        return chunk;
      }
      return chunk
        .split(/(`[^`\n]+`)/g)
        .map((bit) => {
          if (bit.startsWith('`')) {
            return bit;
          }
          const next = prepareCopy(bit, () => taskIndex++);
          footnotes.push(...next.footnotes);
          return next.markdown;
        })
        .join('');
    })
    .join('');

  const html = marked.parse(prepared, { async: false, gfm: true });
  let withTasks = html.replace(/<li>(<span class="task-check)/g, '<li class="task-item">$1');
  if (footnotes.length > 0) {
    withTasks += renderFootnoteSection(footnotes);
  }
  return withTasks;
}

function prepareCopy(
  chunk: string,
  nextTask: () => number,
): { markdown: string; footnotes: { id: string; n: number; text: string }[] } {
  const withFootnotes = extractFootnotes(chunk);
  const withTasks = convertTaskItems(withFootnotes.markdown, nextTask);
  const withHighlight = withTasks.replace(/==([^=\n]+)==/g, '<mark>$1</mark>');
  return { markdown: convertAlerts(withHighlight), footnotes: withFootnotes.footnotes };
}

function convertTaskItems(chunk: string, nextTask: () => number): string {
  return chunk.replace(
    /^(\s*)([-*+]|\d+\.) \[([ xX])\](?:[ \t]+|(?=$))(.*)$/gm,
    (_full, indent: string, bullet: string, mark: string, text: string) => {
      const done = /x/i.test(mark);
      const n = nextTask();
      const box = done ? '☑' : '☐';
      return `${indent}${bullet} <span class="task-check task-i-${n}${done ? ' is-done' : ''}">${box}</span> ${text}`;
    },
  );
}

function convertAlerts(chunk: string): string {
  return chunk.replace(
    new RegExp(`^> \\[!(${ALERT_KINDS})\\][^\\n]*\\n((?:^> ?.*\\n?)*)`, 'gm'),
    (_full, kind: string, rest: string) => {
      const body = rest.replace(/^> ?/gm, '').trimEnd();
      const inner = marked.parse(body, { async: false, gfm: true });
      return `<div class="alert alert-${kind.toLowerCase()}"><p class="alert-label">${kind}</p>${inner}</div>\n\n`;
    },
  );
}

function extractFootnotes(chunk: string): { markdown: string; footnotes: { id: string; n: number; text: string }[] } {
  const defs = new Map<string, string>();
  const order: string[] = [];
  let markdown = chunk.replace(/^\[\^([^\]]+)\]:\s*(.*)$/gm, (_full, id: string, text: string) => {
    if (!defs.has(id)) {
      order.push(id);
    }
    defs.set(id, text);
    return '';
  });
  markdown = markdown.replace(/\[\^([^\]]+)\]/g, (full, id: string) => {
    if (!defs.has(id) && !order.includes(id)) {
      return full;
    }
    if (!order.includes(id)) {
      order.push(id);
    }
    const n = order.indexOf(id) + 1;
    return `<sup class="fn-ref"><a href="#fn-${cssId(id)}">${n}</a></sup>`;
  });
  const footnotes = order
    .filter((id) => defs.has(id))
    .map((id) => ({ id, n: order.indexOf(id) + 1, text: defs.get(id) ?? '' }));
  return { markdown, footnotes };
}

function renderFootnoteSection(notes: { id: string; n: number; text: string }[]): string {
  const items = notes
    .map((note) => {
      const inner = marked.parseInline(note.text, { async: false });
      return `<li id="fn-${cssId(note.id)}"><span class="fn-n">${note.n}.</span> ${inner}</li>`;
    })
    .join('');
  return `<ol class="footnotes">${items}</ol>`;
}

function cssId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '-');
}
