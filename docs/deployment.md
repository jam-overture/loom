# Deploying the portal

The portal is a Next.js app inside a pnpm workspace. Vercel handles that layout
natively; nothing in the repo needs a `vercel.json`.

## Vercel settings

Import `jam-overture/loom` and set:

| Setting                              | Value          |
| ------------------------------------ | -------------- |
| Framework preset                     | Next.js        |
| Root Directory                       | `apps/portal`  |
| Include files outside root directory | **on**         |
| Install / Build / Output commands    | leave as default |

"Include files outside root directory" is the only setting that is easy to get
wrong and fatal to miss. `apps/portal` depends on `@loom/runtime` as
`workspace:*`, which resolves to the **repository root package** — so an install
scoped to `apps/portal` alone has nothing to link against.

Everything else is default. Vercel reads `packageManager` from the root
`package.json` and installs with the committed lockfile; the portal's `build`
script is what it runs.

Verified by clean clone → `pnpm install --frozen-lockfile` → `pnpm build`, not by
reasoning about it.

## Environment

The write path (#18) calls a real model, so the portal now needs one secret:

| Variable                 | Scope       | Notes                                    |
| ------------------------ | ----------- | ---------------------------------------- |
| `LOOM_ANTHROPIC_API_KEY` | Server-side | Falls back to `ANTHROPIC_API_KEY`        |

**Never prefix it `NEXT_PUBLIC_`.** 0017 exists partly to keep that key off the
client, and a public prefix would undo the whole record in one keystroke.

Leaving it unset is a supported state rather than a broken one: the interpreter
reports `interpreter-unavailable` and the prompt box says so. A deployment with no
key is a perfectly good way to look at the read path.

Setting it makes the deployment worth protecting. **An unauthenticated prompt box
on a public URL is your model spend, available to anyone with the link.** Vercel's
Deployment Protection is the cheap answer until the portal has real auth.

## What a deployment can and cannot do today

**Works.** The shell, the primitives, the tree listing, the outline, addressing,
and the preview pane rendering a stored tree. Reads are consistent across
instances because the seed is deterministic.

**Does not survive, by construction.** Persistence. `memoryTreeStore` lives in a
server process, and on Vercel there are many short-lived ones.

**This is now live rather than prospective, because the write path has landed.**
An append succeeds on the instance that served the request and is absent from the
next request served by another. A change visibly applies and then vanishes.

That failure reads as a broken runtime rather than as missing persistence, which
is the wrong lesson to take from a demo. So on a shared deployment today, treat
the prompt box as a demonstration that the loop runs — not as something whose
results will still be there when you reload.

**A backing store is the prerequisite for the write path being trustworthy on a
deployment.** Locally, `pnpm dev` is a single process and everything persists for
as long as it runs.

## The backing store, when it comes

`TreeStore` was designed for this swap, and `memory.ts` already records the one
way a real implementation must differ: **`append` has to be a transaction.** A log
entry without its snapshot advance leaves the two disagreeing, which is precisely
the divergence `auditSnapshot` exists to detect and precisely what a store must
never create itself.

That requirement rules out plain KV. Postgres is the fit — Vercel Postgres or Neon
— with the log as an append-only table, the snapshot as a row per tree, and both
written in one transaction. It also answers the `TreeStore.list` question as a
side effect, since listing is a query rather than a contract bolted onto the
in-memory reference.
