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

## No environment variables yet

The portal makes no model calls, so it needs no secrets. When the write path lands
(0017), `ANTHROPIC_API_KEY` goes in Vercel's environment as a **server-side**
variable — never one prefixed `NEXT_PUBLIC_`. 0017 exists partly to keep that key
off the client, and a public prefix would undo it in one keystroke.

At that point the deployment also becomes worth protecting: an unauthenticated
prompt box on a public URL is someone else's model spend. Vercel's Deployment
Protection is the cheap answer until the portal has real auth.

## What a deployment can and cannot do today

**Works.** The shell, the primitives, and the preview pane rendering a stored
tree. The seed is deterministic — `t_seed1` at revision 0 — so every serverless
instance produces an identical tree and reads are consistent no matter which
instance answers.

**Does not work, by construction.** Persistence. `memoryTreeStore` lives in a
server process, and on Vercel there are many short-lived processes. Today that is
invisible, because nothing writes.

**It stops being invisible the moment the write path lands.** An append would
succeed on one instance and be absent from the next request served by another —
a change that visibly applies and then vanishes. That is worse than not deploying,
because it looks like the runtime is broken rather than like persistence is
missing.

So: **a backing store is a prerequisite for deploying the write path**, not a
follow-up to it.

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
