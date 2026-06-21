# Philosophy

Working philosophies particular to this project. Filled by the Setup Grill; grown only through the Retro Loop. The alignment agent enforces these plus the baked Principles.

## Project philosophies

### Tokens-only styling
Color and font values come *only* from theme tokens — `var(--color-…)` and `var(--font-…)`. Never hardcode a hex code or a font name in a component or module. The active theme owns those values; components consume them. This keeps a theme swap a one-file change and is already enforced across every `.module.css`.

### Content-ready placeholders
Every page that is waiting on real content ships a graceful placeholder state ("coming soon", "check back closer to the wedding") that auto-upgrades the moment real data is dropped in — no layout restructure required. The data shape drives the render: an empty `REGISTRY_LINKS` array renders the coming-soon treatment, a non-empty one renders the list. Build the data-driven branch and the placeholder branch together; don't bolt content on later.

### Comments explain why, not what
In-code comments capture intent and the non-obvious constraint — *why* this is a leaf component, *why* the drawer is a sibling of the header, *why* the signing secret derives from the password. They do not restate what the code plainly does. A comment that would survive a refactor of the lines below it is the right comment.

### Swappable leaf components
UI components are leaf-level with co-located `.module.css`, so changing a visual treatment means editing one file, not threading changes through a tree. New shared UI goes in `src/ui/`; page-specific UI stays with its route. Favor a small swappable component over an inline block you'll later have to extract.

### Secrets live in Cloudflare env, never the repo
Real configuration and secrets (`GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_KEY`, admin credentials) live in Cloudflare Workers env vars / secrets — never committed. The repo carries only `.env.example` documenting the full list and meaning of each var. Any new config follows the same path: example in the repo, value in the Worker.
