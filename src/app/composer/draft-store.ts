import { Draft } from './draft';

const DRAFT_KEY = 'md-composer.draft';
const NAME_KEY = 'md-composer.name';
const DEFAULT_BODY = '';
const DEFAULT_NAME = 'untitled';

export function loadDraft(): Draft {
  try {
    return { body: localStorage.getItem(DRAFT_KEY) ?? DEFAULT_BODY, selection: { start: 0, end: 0 } };
  } catch {
    return { body: DEFAULT_BODY, selection: { start: 0, end: 0 } };
  }
}

export function saveDraft(draft: Draft): void {
  try {
    localStorage.setItem(DRAFT_KEY, draft.body);
  } catch {
    // Private mode or blocked storage; editing still works.
  }
}

export function loadDocName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? DEFAULT_NAME;
  } catch {
    return DEFAULT_NAME;
  }
}

export function saveDocName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // Private mode or blocked storage.
  }
}

export function markdownFileName(name: string): string {
  const trimmed = name.trim() || DEFAULT_NAME;
  const base = trimmed.toLowerCase().endsWith('.md') ? trimmed.slice(0, -3) : trimmed;
  const safe = base.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/\.+$/g, '').trim() || DEFAULT_NAME;
  return `${safe}.md`;
}
