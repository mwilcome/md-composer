import { MarkupCommand } from './markup-command';

export interface Draft {
  body: string;
  selection: { start: number; end: number };
}

/** Range in the current body to replace so the textarea can keep native undo. */
export interface DraftEdit {
  draft: Draft;
  from: number;
  to: number;
  insert: string;
}

export function applyCommand(draft: Draft, command: MarkupCommand): DraftEdit {
  const body = draft.body;
  const start = clamp(Math.min(draft.selection.start, draft.selection.end), 0, body.length);
  const end = clamp(Math.max(draft.selection.start, draft.selection.end), 0, body.length);

  switch (command.type) {
    case 'wrap':
      return applyWrap(body, start, end, command);
    case 'linePrefix':
      return applyLinePrefix(body, start, end, command);
    case 'fence':
      return applyFence(body, start, end);
    case 'insert':
      return applyInsert(body, start, end, command);
    default: {
      const neverType: never = command;
      throw new Error(`Unknown markup command: ${JSON.stringify(neverType)}`);
    }
  }
}

function applyWrap(
  body: string,
  start: number,
  end: number,
  command: Extract<MarkupCommand, { type: 'wrap' }>,
): DraftEdit {
  const { prefix, suffix } = command;
  const unwrapInside =
    start !== end &&
    body.slice(start, start + prefix.length) === prefix &&
    body.slice(end - suffix.length, end) === suffix &&
    end - start >= prefix.length + suffix.length;
  if (unwrapInside) {
    const inner = body.slice(start + prefix.length, end - suffix.length);
    return mutation(body, start, end, inner, { start, end: start + inner.length });
  }
  const unwrapAround =
    start >= prefix.length &&
    end + suffix.length <= body.length &&
    body.slice(start - prefix.length, start) === prefix &&
    body.slice(end, end + suffix.length) === suffix;
  if (unwrapAround) {
    const inner = body.slice(start, end);
    return mutation(body, start - prefix.length, end + suffix.length, inner, {
      start: start - prefix.length,
      end: start - prefix.length + inner.length,
    });
  }

  const hadSelection = start !== end;
  const selected = hadSelection ? body.slice(start, end) : command.placeholder;
  const insert = prefix + selected + suffix;
  const innerStart = start + prefix.length;
  let selection = { start: innerStart, end: innerStart + selected.length };
  if (hadSelection && command.selectUrl) {
    const urlAt = suffix.indexOf('url');
    const urlStart = start + prefix.length + selected.length + urlAt;
    selection = { start: urlStart, end: urlStart + 3 };
  }
  return mutation(body, start, end, insert, selection);
}

function applyLinePrefix(
  body: string,
  start: number,
  end: number,
  command: Extract<MarkupCommand, { type: 'linePrefix' }>,
): DraftEdit {
  const lineStart = body.lastIndexOf('\n', start - 1) + 1;
  const newlineAt = body.indexOf('\n', end);
  const lineEnd = newlineAt === -1 ? body.length : newlineAt;
  const nextBlock = body
    .slice(lineStart, lineEnd)
    .split('\n')
    .map((line) => applyPrefixToLine(line, command))
    .join('\n');

  const lines = nextBlock.split('\n');
  const first = lines[0] ?? '';
  const prefixOn = first.startsWith(command.prefix);
  const contentStart = lineStart + (prefixOn ? command.prefix.length : 0);
  const blockEnd = lineStart + nextBlock.length;
  const selection =
    lines.length === 1
      ? { start: contentStart, end: blockEnd }
      : { start: blockEnd, end: blockEnd };

  return mutation(body, lineStart, lineEnd, nextBlock, selection);
}

function applyFence(body: string, start: number, end: number): DraftEdit {
  if (start === end) {
    const newlineAt = body.indexOf('\n', end);
    const at = newlineAt === -1 ? body.length : newlineAt + 1;
    const lead = at === body.length && at > 0 && body[at - 1] !== '\n' ? '\n' : '';
    const insert = lead + '```\n\n```\n';
    const inner = at + lead.length + 4;
    return mutation(body, at, at, insert, { start: inner, end: inner });
  }
  const selected = body.slice(start, end);
  const insert = '```\n' + selected + '\n```';
  const inner = start + 4;
  return mutation(body, start, end, insert, { start: inner, end: inner + selected.length });
}

function applyInsert(
  body: string,
  start: number,
  end: number,
  command: Extract<MarkupCommand, { type: 'insert' }>,
): DraftEdit {
  if (command.placement === 'atCaret') {
    const insert = command.insert;
    return mutation(body, end, end, insert, { start: end + insert.length, end: end + insert.length });
  }

  const newlineAt = body.indexOf('\n', end);
  const at = newlineAt === -1 ? body.length : newlineAt + 1;
  const lead = at === body.length && at > 0 && body[at - 1] !== '\n' ? '\n' : '';
  const payload = command.insert.endsWith('\n') ? command.insert : `${command.insert}\n`;
  const insert = lead + payload;
  const select = command.selectInserted
    ? { start: at + lead.length + command.selectInserted.start, end: at + lead.length + command.selectInserted.end }
    : { start: at + insert.length, end: at + insert.length };

  return mutation(body, at, at, insert, select);
}

function applyPrefixToLine(
  line: string,
  command: Extract<MarkupCommand, { type: 'linePrefix' }>,
): string {
  const { indent, rest } = splitIndent(line);
  if (command.replaceHeading) {
    const stripped = rest.replace(/^#{1,6} /, '');
    return rest.startsWith(command.prefix) ? indent + stripped : indent + command.prefix + stripped;
  }
  const kind = listKindFromRest(rest);
  const commandKind = listKindFromPrefix(command.prefix);
  if (commandKind && kind === commandKind) {
    return indent + stripBlockMarker(rest);
  }
  return indent + command.prefix + stripBlockMarker(rest);
}

function splitIndent(line: string): { indent: string; rest: string } {
  const match = /^( *)(.*)$/.exec(line);
  return { indent: match?.[1] ?? '', rest: match?.[2] ?? line };
}

function stripBlockMarker(rest: string): string {
  if (rest.startsWith('- [ ] ') || rest.startsWith('- [x] ') || rest.startsWith('- [X] ')) {
    return rest.slice(6);
  }
  if (rest.startsWith('- ') || rest.startsWith('* ') || rest.startsWith('+ ')) {
    return rest.slice(2);
  }
  const numbered = /^\d+\. (.*)$/.exec(rest);
  if (numbered) {
    return numbered[1];
  }
  if (rest.startsWith('> ')) {
    return rest.slice(2);
  }
  return rest.replace(/^#{1,6} /, '');
}

function listKindFromPrefix(prefix: string): 'ul' | 'ol' | 'task' | 'quote' | null {
  if (prefix === '- [ ] ') {
    return 'task';
  }
  if (prefix === '- ' || prefix === '* ' || prefix === '+ ') {
    return 'ul';
  }
  if (prefix === '1. ' || /^\d+\. $/.test(prefix)) {
    return 'ol';
  }
  if (prefix === '> ') {
    return 'quote';
  }
  return null;
}

function listKindFromRest(rest: string): 'ul' | 'ol' | 'task' | 'quote' | null {
  if (rest.startsWith('- [ ] ') || rest.startsWith('- [x] ') || rest.startsWith('- [X] ')) {
    return 'task';
  }
  if (rest.startsWith('- ') || rest.startsWith('* ') || rest.startsWith('+ ')) {
    return 'ul';
  }
  if (/^\d+\. /.test(rest)) {
    return 'ol';
  }
  if (rest.startsWith('> ')) {
    return 'quote';
  }
  return null;
}

export function activeBlockCommand(draft: Draft): string | null {
  const caret = Math.max(draft.selection.start, draft.selection.end);
  const line = lineAt(draft.body, caret);
  const { rest } = splitIndent(line);
  const heading = /^(#{1,6}) /.exec(rest);
  if (heading) {
    return `h${heading[1].length}`;
  }
  return listKindFromRest(rest);
}

/** Enter in a list/quote: next item, or leave the list if the item is empty. */
export function continueOrExitList(draft: Draft): DraftEdit | null {
  const body = draft.body;
  const from = clamp(Math.min(draft.selection.start, draft.selection.end), 0, body.length);
  const to = clamp(Math.max(draft.selection.start, draft.selection.end), 0, body.length);
  const lineStart = body.lastIndexOf('\n', from - 1) + 1;
  const newlineAt = body.indexOf('\n', from);
  const lineEnd = newlineAt === -1 ? body.length : newlineAt;
  const line = body.slice(lineStart, lineEnd);
  const { indent, rest } = splitIndent(line);
  const kind = listKindFromRest(rest);
  if (!kind) {
    return null;
  }
  const content = stripBlockMarker(rest);
  if (content.trim() === '') {
    return outdentEmptyItem(body, lineStart, lineEnd, indent, kind, rest);
  }
  const marker =
    kind === 'ol'
      ? `${nextNumber(rest)}. `
      : kind === 'task'
        ? '- [ ] '
        : kind === 'quote'
          ? '> '
          : rest.startsWith('* ')
            ? '* '
            : rest.startsWith('+ ')
              ? '+ '
              : '- ';
  const insert = `\n${indent}${marker}`;
  return mutation(body, from, to, insert, {
    start: from + insert.length,
    end: from + insert.length,
  });
}

function nextNumber(rest: string): number {
  const match = /^(\d+)\. /.exec(rest);
  return (match ? Number(match[1]) : 1) + 1;
}

function lineAt(body: string, caret: number): string {
  const start = body.lastIndexOf('\n', caret - 1) + 1;
  const end = body.indexOf('\n', caret);
  return body.slice(start, end === -1 ? body.length : end);
}

function mutation(
  body: string,
  from: number,
  to: number,
  insert: string,
  selection: Draft['selection'],
): DraftEdit {
  return {
    draft: { body: body.slice(0, from) + insert + body.slice(to), selection },
    from,
    to,
    insert,
  };
}

export function toggleTaskAt(draft: Draft, index: number): DraftEdit | null {
  const pattern = /^[ \t]*- \[([ xX])\] /gm;
  let seen = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(draft.body))) {
    if (seen++ !== index) {
      continue;
    }
    const markAt = match.index + match[0].indexOf('[') + 1;
    const next = match[1] === ' ' ? 'x' : ' ';
    return mutation(draft.body, markAt, markAt + 1, next, draft.selection);
  }
  return null;
}

export function indentLines(draft: Draft, direction: 1 | -1): DraftEdit {
  const body = draft.body;
  const start = clamp(Math.min(draft.selection.start, draft.selection.end), 0, body.length);
  const end = clamp(Math.max(draft.selection.start, draft.selection.end), 0, body.length);
  const lineStart = body.lastIndexOf('\n', start - 1) + 1;
  const newlineAt = body.indexOf('\n', end);
  const lineEnd = newlineAt === -1 ? body.length : newlineAt;
  const oldBlock = body.slice(lineStart, lineEnd);
  const oldLines = oldBlock.split('\n');
  const nextBlock = oldLines.map((line) => nestLine(line, direction)).join('\n');
  const caret = caretAfterNest(lineStart, oldLines, nextBlock.split('\n'), start);
  return mutation(body, lineStart, lineEnd, nextBlock, { start: caret, end: caret });
}

/** Backspace at the start of a list item's text: outdent, or drop the marker. */
export function backspaceListMarker(draft: Draft): DraftEdit | null {
  if (draft.selection.start !== draft.selection.end) {
    return null;
  }
  const body = draft.body;
  const caret = clamp(draft.selection.start, 0, body.length);
  const lineStart = body.lastIndexOf('\n', caret - 1) + 1;
  const newlineAt = body.indexOf('\n', caret);
  const lineEnd = newlineAt === -1 ? body.length : newlineAt;
  const line = body.slice(lineStart, lineEnd);
  const { indent, rest } = splitIndent(line);
  const kind = listKindFromRest(rest);
  if (!kind) {
    return null;
  }
  const markerStart = lineStart + indent.length;
  const contentStart = markerStart + markerLength(rest);
  if (caret !== contentStart) {
    return null;
  }
  return nestLineEdit(body, lineStart, lineEnd, line, -1, caret);
}

function outdentEmptyItem(
  body: string,
  lineStart: number,
  lineEnd: number,
  indent: string,
  kind: 'ul' | 'ol' | 'task' | 'quote',
  rest: string,
): DraftEdit {
  if (kind === 'quote' && rest.startsWith('> > ')) {
    const insert = indent + rest.slice(2);
    return mutation(body, lineStart, lineEnd, insert, {
      start: lineStart + insert.length,
      end: lineStart + insert.length,
    });
  }
  if (indent.length >= 2) {
    const insert = indent.slice(2) + listMarker(kind, rest);
    return mutation(body, lineStart, lineEnd, insert, {
      start: lineStart + insert.length,
      end: lineStart + insert.length,
    });
  }
  return mutation(body, lineStart, lineEnd, '', { start: lineStart, end: lineStart });
}

function nestLine(line: string, direction: 1 | -1): string {
  const { indent, rest } = splitIndent(line);
  const kind = listKindFromRest(rest);
  if (!kind) {
    if (direction > 0) {
      return `  ${line}`;
    }
    if (line.startsWith('  ')) {
      return line.slice(2);
    }
    if (line.startsWith('\t')) {
      return line.slice(1);
    }
    return line;
  }
  if (kind === 'quote') {
    if (direction > 0) {
      return `${indent}> ${rest}`;
    }
    if (rest.startsWith('> ')) {
      return indent + rest.slice(2);
    }
    return indent + stripBlockMarker(rest);
  }
  if (direction > 0) {
    const nestedRest = kind === 'ol' ? `1. ${stripBlockMarker(rest)}` : rest;
    return `  ${indent}${nestedRest}`;
  }
  if (indent.length >= 2) {
    return indent.slice(2) + rest;
  }
  return indent + stripBlockMarker(rest);
}

function nestLineEdit(
  body: string,
  lineStart: number,
  lineEnd: number,
  line: string,
  direction: 1 | -1,
  caret: number,
): DraftEdit {
  const next = nestLine(line, direction);
  const nextCaret = caretAfterNest(lineStart, [line], [next], caret);
  return mutation(body, lineStart, lineEnd, next, { start: nextCaret, end: nextCaret });
}

function caretAfterNest(lineStart: number, oldLines: string[], newLines: string[], caret: number): number {
  if (oldLines.length !== 1 || newLines.length !== 1) {
    return lineStart + (newLines.join('\n').length);
  }
  const oldLine = oldLines[0] ?? '';
  const newLine = newLines[0] ?? '';
  const { indent: oldIndent, rest: oldRest } = splitIndent(oldLine);
  const { indent: newIndent, rest: newRest } = splitIndent(newLine);
  const contentOff = caret - lineStart - oldIndent.length - markerLength(oldRest);
  return lineStart + newIndent.length + markerLength(newRest) + Math.max(0, contentOff);
}

function listMarker(kind: 'ul' | 'ol' | 'task' | 'quote', rest: string): string {
  if (kind === 'ol') {
    return '1. ';
  }
  if (kind === 'task') {
    return '- [ ] ';
  }
  if (kind === 'quote') {
    return '> ';
  }
  if (rest.startsWith('* ')) {
    return '* ';
  }
  if (rest.startsWith('+ ')) {
    return '+ ';
  }
  return '- ';
}

function markerLength(rest: string): number {
  return rest.length - stripBlockMarker(rest).length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
