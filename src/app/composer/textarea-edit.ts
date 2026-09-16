/** Native textarea edits so typing, paste, and Ctrl+Z stay on the browser undo stack. */

export function replaceInTextarea(
  field: HTMLTextAreaElement,
  from: number,
  to: number,
  insert: string,
): void {
  field.focus();
  field.setSelectionRange(from, to);
  const inserted = document.execCommand('insertText', false, insert);
  if (!inserted) {
    field.setRangeText(insert, from, to, 'end');
  }
}

export function runEditorCommand(field: HTMLTextAreaElement, command: 'undo' | 'redo' | 'cut' | 'copy'): boolean {
  field.focus();
  return document.execCommand(command);
}

export async function pasteIntoTextarea(field: HTMLTextAreaElement): Promise<void> {
  field.focus();
  try {
    const text = await navigator.clipboard.readText();
    replaceInTextarea(field, field.selectionStart, field.selectionEnd, text);
  } catch {
    document.execCommand('paste');
  }
}

export function readDraftFromTextarea(field: HTMLTextAreaElement): { body: string; selection: { start: number; end: number } } {
  return {
    body: field.value,
    selection: { start: field.selectionStart, end: field.selectionEnd },
  };
}
