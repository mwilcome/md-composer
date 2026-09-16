import { marked } from 'marked';

/** Angular strips <input> from innerHTML, so GFM task checkboxes become spans. */
export function markdownToHtml(source: string): string {
  const html = marked.parse(source, { async: false, gfm: true });
  let index = 0;
  return html.replace(/<input[^>]*type=["']checkbox["'][^>]*>/gi, (tag) => {
    const done = /\bchecked\b/i.test(tag);
    const n = index++;
    return `<span class="task-check${done ? ' is-done' : ''}" data-task="${n}" role="checkbox" aria-checked="${done}"></span>`;
  });
}
