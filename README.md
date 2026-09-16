# Markdown Composer

Markdown Composer is a browser application for writing Markdown and viewing a rendered preview.

The application allows a user to edit a document in a source pane, apply Markdown from a toolbar, and see the result in a preview pane. The toolbar includes headings, emphasis, highlight, lists (including nested lists and task lists), quotes, GitHub-style alerts, fenced code with a language placeholder, links, images, tables, footnotes, and related inserts.

The application allows a user to name the document and download it as a `.md` file. A draft is stored in the browser. An account is not required.

## Markup

Task lists use `- [ ]` and `- [x]`. Nested lists use indentation (Tab / Shift+Tab). Alerts use GitHub syntax such as `> [!NOTE]`. Highlight uses `==text==`. Fenced code uses a language tag on the opening fence. Footnotes use `[^1]` markers with matching `[^1]:` definitions.

## Run

Node.js is required. After dependencies are installed, the development server is started with `npm start`. A production build is produced with `npm run build`.
