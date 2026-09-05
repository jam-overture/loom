# The code on the pages, as programs

Generated. Do not edit anything in this directory — change the page and run:

```
pnpm --filter @loom/app docs:fences
```

One file per documentation page, holding every compiled code block on it in
reading order. Nothing imports them. They are here so that `tsc --noEmit` —
which `pnpm verify` already runs — reads the code this site invites people to
copy, under exactly the strictness the rest of the application is built with.

A comment above each block names the line of `page.mdx` it came from, so a
compiler error points at a place in the page rather than at a place in here.

`../model.ts` explains the four kinds of block and the one word that declares
each. `../context/` explains what a page is allowed to assume.
