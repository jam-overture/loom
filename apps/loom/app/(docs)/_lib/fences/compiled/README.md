# The code on the pages, as programs

Generated. Do not edit anything in this directory — change the page and run:

```
pnpm --filter @loom/app docs:fences
```

One file per documentation page, holding every compiled code block on it in
reading order. Nothing imports them. They are here so that `tsc --noEmit` —
which `pnpm verify` already runs — reads the code this site invites people to
copy, under exactly the strictness the rest of the application is built with.

A file named `…--alternative-1` is the exception to one-per-page. A block that
does the same job as the block above it — the same three stores wired to
Postgres rather than to memory — is a redeclaration when the page is read as one
program, and the page is right and the reading is wrong. It gets a module of its
own, inheriting the imports the page had already made, so that both halves of
the choice are compiled and neither has to be written off as a sketch.

A comment above each block names the line of `page.mdx` it came from, so a
compiler error points at a place in the page rather than at a place in here.
It sits under the block's own imports, because those are hoisted and merged into
the module's — and a marker written above them would be hoisted away with them.

`../model.ts` explains the five kinds of block and the one word that declares
each. `../context/` explains what a page is allowed to assume.
