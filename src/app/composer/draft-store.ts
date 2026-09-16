import { Draft } from './draft';

const DRAFT_KEY = 'md-composer.draft';
const DEFAULT_BODY = '';

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
