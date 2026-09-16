import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  signal,
  viewChild,
} from '@angular/core';
import { appTitle } from '../core/site';
import {
  activeBlockCommand,
  applyCommand,
  backspaceListMarker,
  continueOrExitList,
  indentLines,
  toggleTaskAt,
} from './draft';
import { loadDraft, saveDraft } from './draft-store';
import { markdownToHtml } from './markdown-html';
import { MARKUP_COMMAND_GROUPS, MarkupCommand, markupCommandById } from './markup-command';
import { MdIcon } from './md-icon';
import { readDraftFromTextarea, replaceInTextarea, runEditorCommand } from './textarea-edit';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MdIcon],
  selector: 'app-composer',
  styleUrl: './composer.scss',
  templateUrl: './composer.html',
})
export class Composer {
  private readonly field = viewChild<ElementRef<HTMLTextAreaElement>>('field');

  protected readonly appTitle = appTitle;
  protected readonly draft = signal(loadDraft());
  protected readonly wide = signal(wideViewport());
  protected readonly previewOpen = signal(this.wide());
  protected readonly mobilePane = signal<'write' | 'preview'>('write');
  protected readonly copyState = signal<'idle' | 'copied' | 'failed'>('idle');
  protected readonly html = computed(() => markdownToHtml(this.draft().body));
  protected readonly activeBlock = computed(() => activeBlockCommand(this.draft()));
  protected readonly commandGroups = MARKUP_COMMAND_GROUPS;

  constructor() {
    afterNextRender(() => {
      const field = this.field()?.nativeElement;
      if (field) {
        field.value = this.draft().body;
        field.focus();
      }
      const query = window.matchMedia('(min-width: 52rem)');
      const sync = () => this.syncViewport(query.matches);
      sync();
      query.addEventListener('change', (event) => this.syncViewport(event.matches));
    });
  }

  protected onSourceInput(event: Event): void {
    const field = event.target;
    if (!(field instanceof HTMLTextAreaElement)) {
      return;
    }
    this.commit(readDraftFromTextarea(field));
  }

  protected applyMarkup(command: MarkupCommand, event: Event): void {
    event.preventDefault();
    this.applyEdit((draft) => applyCommand(draft, command));
  }

  protected onSourceKeydown(event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const field = this.field()?.nativeElement;
      if (!field) {
        return;
      }
      const edit = backspaceListMarker(readDraftFromTextarea(field));
      if (!edit) {
        return;
      }
      event.preventDefault();
      replaceInTextarea(field, edit.from, edit.to, edit.insert);
      field.setSelectionRange(edit.draft.selection.start, edit.draft.selection.end);
      this.commit(readDraftFromTextarea(field));
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const field = this.field()?.nativeElement;
      if (!field) {
        return;
      }
      const edit = continueOrExitList(readDraftFromTextarea(field));
      if (!edit) {
        return;
      }
      event.preventDefault();
      replaceInTextarea(field, edit.from, edit.to, edit.insert);
      field.setSelectionRange(edit.draft.selection.start, edit.draft.selection.end);
      this.commit(readDraftFromTextarea(field));
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      this.applyEdit((draft) => indentLines(draft, event.shiftKey ? -1 : 1));
      return;
    }
    const mod = event.ctrlKey || event.metaKey;
    if (!mod || event.altKey) {
      return;
    }
    const key = event.key.toLowerCase();
    const shortcut: Record<string, string> = { b: 'bold', i: 'italic', k: 'link', e: 'code' };
    const id = shortcut[key];
    if (!id || event.shiftKey) {
      return;
    }
    const command = markupCommandById(id);
    if (!command) {
      return;
    }
    event.preventDefault();
    this.applyMarkup(command, event);
  }

  protected keepSourceFocus(event: Event): void {
    event.preventDefault();
  }

  protected undo(): void {
    this.runNative('undo');
  }

  protected redo(): void {
    this.runNative('redo');
  }

  protected togglePreview(): void {
    this.previewOpen.update((open) => !open);
  }

  protected showWrite(): void {
    this.mobilePane.set('write');
  }

  protected showPreview(): void {
    this.mobilePane.set('preview');
  }

  protected onPreviewClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.classList.contains('task-check')) {
      return;
    }
    const index = Number(target.getAttribute('data-task'));
    if (!Number.isFinite(index)) {
      return;
    }
    const field = this.field()?.nativeElement;
    const current = field ? readDraftFromTextarea(field) : this.draft();
    const edit = toggleTaskAt(current, index);
    if (!edit) {
      return;
    }
    if (field) {
      replaceInTextarea(field, edit.from, edit.to, edit.insert);
      field.setSelectionRange(current.selection.start, current.selection.end);
      this.commit(readDraftFromTextarea(field));
      return;
    }
    this.commit(edit.draft);
  }

  private syncViewport(wide: boolean): void {
    const wasWide = this.wide();
    this.wide.set(wide);
    if (wasWide && !wide) {
      this.previewOpen.set(false);
      this.mobilePane.set('write');
    }
    if (!wasWide && wide) {
      this.previewOpen.set(true);
    }
  }

  protected async copyMarkdown(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.draft().body);
      this.copyState.set('copied');
    } catch {
      this.copyState.set('failed');
    }
    window.setTimeout(() => this.copyState.set('idle'), 1600);
  }

  private applyEdit(mutate: (draft: ReturnType<typeof readDraftFromTextarea>) => ReturnType<typeof applyCommand>): void {
    const field = this.field()?.nativeElement;
    if (!field) {
      const next = mutate(this.draft());
      this.commit(next.draft);
      return;
    }
    const edit = mutate(readDraftFromTextarea(field));
    replaceInTextarea(field, edit.from, edit.to, edit.insert);
    field.setSelectionRange(edit.draft.selection.start, edit.draft.selection.end);
    this.commit(readDraftFromTextarea(field));
  }

  private runNative(command: 'undo' | 'redo'): void {
    const field = this.field()?.nativeElement;
    if (!field) {
      return;
    }
    runEditorCommand(field, command);
    this.commit(readDraftFromTextarea(field));
  }

  private commit(draft: { body: string; selection: { start: number; end: number } }): void {
    this.draft.set(draft);
    saveDraft(draft);
  }
}

function wideViewport(): boolean {
  return window.matchMedia('(min-width: 52rem)').matches;
}
