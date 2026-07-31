# Deploying the portal

The portal is a Next.js app inside a pnpm workspace. Vercel handles that layout
natively; nothing in the repo needs a `vercel.json`.

## Vercel settings

Import `jam-overture/loom` and set:

| Setting                           | Value            |
| --------------------------------- | ---------------- |
| Framework preset                  | Next.js          |
| Root Directory                    | `apps/portal`    |
| Install / Build / Output commands | leave as default |

Vercel reads `packageManager` from the root `package.json`, installs with the
committed lockfile, and runs the portal's `build` script.

### Root Directory is the one that bites, and it fails silently

**Setting it during the import is not enough — verify it after.** On the New
Project screen the field shows `apps/portal` as **greyed placeholder text**, which
looks identical to a value that has been set. Vercel's default is an empty Root
Directory, meaning the repository root.

That default fails in the worst possible way: **it does not error.** The repo root
is `@loom/runtime`, which has no framework and no `build` script, so Vercel finds
nothing to do, produces an empty output, and reports a green deployment. Every
path then returns `404: NOT_FOUND` from the edge.

The tell is in the build log, and it is unmistakable:

```
Running "vercel build"
Build Completed in /vercel/output [160ms]
Skipping cache upload because no files were prepared
```

**No install step, and a build measured in milliseconds.** A real build installs
dependencies and prints a Next.js route table, and takes minutes.

To fix or confirm: **Settings → Build and Deployment → Root Directory** → Edit →
`apps/portal` → Save, then redeploy. That section only exists once the project
does, which is why it cannot be fully settled during the import.

### The workspace link, which you do not have to do anything about

`apps/portal` depends on `@loom/runtime` as `workspace:*`, which resolves to the
**repository root package**. An install scoped to `apps/portal` alone would have
nothing to link against.

Vercel controls that with **"Include source files outside of the Root Directory
in the Build Step"**, in the same settings section as Root Directory above. It is
**on by default** for every project created since August 2020, so a new import
already has it — do not go looking for it during the import.

Unlike Root Directory, this one fails loudly: the build stops at install or
compile with `Cannot find module '@loom/runtime'` or pnpm's
`ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`. That error, and nothing else, is what this
setting causes.

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
