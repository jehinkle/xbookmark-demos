# Defuddle Lens — page to Markdown

Demo Lab throwaway inspired by [kepano/defuddle](https://github.com/kepano/defuddle) ("Get the main content of any page as Markdown", MIT).

**Branch:** `demo/2026-10-30-page-to-md` · do **not** merge unless intentional.

- Runs the real `defuddle/full` npm package in the browser (`separateMarkdown`, `debug`).
- Left: the original page in a sandboxed iframe (scripts stripped, `sandbox="allow-same-origin"`), each block outlined green (kept) or color-coded by why it was removed (nav, footer, sidebar, ads, comments, share/newsletter, byline/breadcrumbs). Hover for the reason. The overlay is an approximation: page blocks are matched against defuddle's output text and its debug removal log.
- Right tabs: Markdown (copy / download .md), rendered output, metadata (title, author, published, site, schema.org, removal steps), and a list of removed blocks.
- Inputs: 4 bundled mock pages (news, blog, docs, trial registry), pasted HTML, or a URL fetched by `functions/api/fetch.js` (Cloudflare Pages Function: http/https only, private/local hosts blocked, 3 redirects, 8 s timeout, 2 MB cap).

```bash
npm install && npm run dev   # URL fetch needs the Pages Function (wrangler pages dev, or the preview deploy)
```
