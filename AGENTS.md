# Fashion Demo theme

A Shopify theme for a fashion store, built on Dawn 16.0.0. The first commit is unmodified Dawn; every later commit is custom work. See the README for what has been added.

## Commands

- Preview: `shopify theme dev --store <store>.myshopify.com`
- Lint: `shopify theme check`. Unmodified Dawn already reports 9 warnings; new code should add none.

## Conventions

Follow Dawn's own patterns. Where generic Shopify guidance differs (for example the AI Toolkit's `{% stylesheet %}`, `{% doc %}` and "no comments" rules), Dawn's patterns win.

- **Files:** kebab-case names. Styles go in `assets/` as `component-*.css` or `section-*.css`, scripts as their own `.js` file, both loaded where they are used.
- **Liquid:** 2-space indentation, `{%- -%}` whitespace control, schema JSON with one key per line. Snippets document their parameters in a `{% comment %}` header, like Dawn's.
- **JavaScript:** plain JS with no libraries. Custom elements guarded with `if (!customElements.get(...))`. Use Dawn's existing mechanisms, such as `PUB_SUB_EVENTS` in `assets/constants.js` for variant and cart changes, instead of inventing new ones.
- **CSS:** rem units (1rem = 10px) and Dawn's color variables, such as `rgb(var(--color-foreground))`.
- **Text:** no hard-coded text. Storefront text goes in `locales/en.default.json`; theme editor labels are `t:` keys in `locales/en.default.schema.json`. English is enough: don't add new keys to the other locale files, which fall back to English.
- **Dawn's core files** (for example `sections/main-product.liquid`): keep changes as small as possible, usually a `render` of a new snippet plus a schema entry, and list them in the commit message. They have to be re-applied when upgrading Dawn.

## Shopify documentation

Use the [Shopify AI Toolkit](https://shopify.dev/docs/apps/build/ai-toolkit) to check Liquid objects, filters and APIs. If it's missing, install it in the agent host per that page (or `npx skills add Shopify/shopify-ai-toolkit --list` for skill-compatible hosts). Do not add tooling to this repo.
