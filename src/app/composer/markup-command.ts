export interface MarkupCommandBase {
  id: string;
  label: string;
  group: string;
  hint?: string;
}

export interface WrapCommand extends MarkupCommandBase {
  type: 'wrap';
  prefix: string;
  suffix: string;
  placeholder: string;
  selectUrl?: boolean;
}

export interface LinePrefixCommand extends MarkupCommandBase {
  type: 'linePrefix';
  prefix: string;
  replaceHeading?: boolean;
}

export interface FenceCommand extends MarkupCommandBase {
  type: 'fence';
}

export interface FootnoteCommand extends MarkupCommandBase {
  type: 'footnote';
}

export interface InsertCommand extends MarkupCommandBase {
  type: 'insert';
  insert: string;
  /** `below` appends after the current line and never deletes the selection. */
  placement: 'below' | 'atCaret';
  selectInserted?: { start: number; end: number };
}

export type MarkupCommand = WrapCommand | LinePrefixCommand | FenceCommand | InsertCommand | FootnoteCommand;

const TABLE_INSERT = '| Column 1 | Column 2 |\n| -------- | -------- |\n|          |          |\n';
const DETAILS_INSERT = '<details>\n<summary>Summary</summary>\n\ncontent\n\n</details>\n';

export const MARKUP_COMMANDS: MarkupCommand[] = [
  { id: 'h1', label: 'H1', group: 'Structure', type: 'linePrefix', prefix: '# ', replaceHeading: true, hint: 'Heading 1' },
  { id: 'h2', label: 'H2', group: 'Structure', type: 'linePrefix', prefix: '## ', replaceHeading: true, hint: 'Heading 2' },
  { id: 'h3', label: 'H3', group: 'Structure', type: 'linePrefix', prefix: '### ', replaceHeading: true, hint: 'Heading 3' },
  { id: 'h4', label: 'H4', group: 'Structure', type: 'linePrefix', prefix: '#### ', replaceHeading: true, hint: 'Heading 4' },
  { id: 'h5', label: 'H5', group: 'Structure', type: 'linePrefix', prefix: '##### ', replaceHeading: true, hint: 'Heading 5' },
  { id: 'h6', label: 'H6', group: 'Structure', type: 'linePrefix', prefix: '###### ', replaceHeading: true, hint: 'Heading 6' },
  { id: 'hr', label: 'Rule', group: 'Structure', type: 'insert', insert: '---\n', placement: 'below', hint: 'Horizontal rule' },

  { id: 'bold', label: 'Bold', group: 'Inline', type: 'wrap', prefix: '**', suffix: '**', placeholder: 'bold', hint: 'Bold (Ctrl+B)' },
  { id: 'italic', label: 'Italic', group: 'Inline', type: 'wrap', prefix: '*', suffix: '*', placeholder: 'italic', hint: 'Italic (Ctrl+I)' },
  {
    id: 'bold-italic',
    label: 'Em',
    group: 'Inline',
    type: 'wrap',
    prefix: '***',
    suffix: '***',
    placeholder: 'text',
    hint: 'Bold italic',
  },
  {
    id: 'strike',
    label: 'Strikethrough',
    group: 'Inline',
    type: 'wrap',
    prefix: '~~',
    suffix: '~~',
    placeholder: 'text',
  },
  { id: 'code', label: 'Code', group: 'Inline', type: 'wrap', prefix: '`', suffix: '`', placeholder: 'code', hint: 'Inline code (Ctrl+E)' },
  {
    id: 'highlight',
    label: 'Highlight',
    group: 'Inline',
    type: 'wrap',
    prefix: '==',
    suffix: '==',
    placeholder: 'text',
    hint: 'Highlight',
  },

  { id: 'ul', label: 'List', group: 'Blocks', type: 'linePrefix', prefix: '- ', hint: 'Bullet list · Tab to nest, Enter to continue' },
  { id: 'ol', label: 'Numbered', group: 'Blocks', type: 'linePrefix', prefix: '1. ', hint: 'Numbered list · Tab to nest, Enter to continue' },
  { id: 'task', label: 'Task', group: 'Blocks', type: 'linePrefix', prefix: '- [ ] ', hint: 'Task list (checkboxes) · Tab to nest, Enter to continue' },
  { id: 'quote', label: 'Quote', group: 'Blocks', type: 'linePrefix', prefix: '> ' },
  { id: 'fence', label: 'Fence', group: 'Blocks', type: 'fence', hint: 'Code block with language' },
  {
    id: 'alert',
    label: 'Alert',
    group: 'Blocks',
    type: 'insert',
    insert: '> [!NOTE]\n> ',
    placement: 'below',
    selectInserted: { start: 4, end: 8 },
    hint: 'GitHub alert (NOTE, TIP, IMPORTANT, WARNING, CAUTION)',
  },

  {
    id: 'link',
    label: 'Link',
    group: 'Insert',
    type: 'wrap',
    prefix: '[',
    suffix: '](url)',
    placeholder: 'text',
    selectUrl: true,
    hint: 'Link (Ctrl+K)',
  },
  {
    id: 'image',
    label: 'Image',
    group: 'Insert',
    type: 'wrap',
    prefix: '![',
    suffix: '](url)',
    placeholder: 'alt',
    selectUrl: true,
  },
  {
    id: 'table',
    label: 'Table',
    group: 'Insert',
    type: 'insert',
    insert: TABLE_INSERT,
    placement: 'below',
    selectInserted: {
      start: TABLE_INSERT.indexOf('Column 1'),
      end: TABLE_INSERT.indexOf('Column 1') + 8,
    },
  },
  {
    id: 'details',
    label: 'Details',
    group: 'Insert',
    type: 'insert',
    insert: DETAILS_INSERT,
    placement: 'below',
    selectInserted: {
      start: DETAILS_INSERT.indexOf('content'),
      end: DETAILS_INSERT.indexOf('content') + 7,
    },
  },
  {
    id: 'comment',
    label: 'Comment',
    group: 'Insert',
    type: 'wrap',
    prefix: '<!-- ',
    suffix: ' -->',
    placeholder: 'comment',
  },
  { id: 'br', label: 'Break', group: 'Insert', type: 'insert', insert: '  \n', placement: 'atCaret', hint: 'Line break' },
  { id: 'footnote', label: 'Footnote', group: 'Insert', type: 'footnote', hint: 'Footnote' },
];

export const MARKUP_COMMAND_GROUPS: { name: string; commands: MarkupCommand[] }[] = [
  ...new Set(MARKUP_COMMANDS.map((command) => command.group)),
].map((name) => ({
  name,
  commands: MARKUP_COMMANDS.filter((command) => command.group === name),
}));

export function markupCommandById(id: string): MarkupCommand | undefined {
  return MARKUP_COMMANDS.find((command) => command.id === id);
}
