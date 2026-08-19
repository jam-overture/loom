# 2026-08-19 — marketing: the lane does not exist yet, so nothing was built

**Stopped at the gate.** `apps/loom/app/(marketing)/` does not exist on `main`; the migration that creates it is [#98](https://github.com/jam-overture/loom/pull/98), open and unmerged, and the brief forbids this routine from creating the lane or building in another surface's — so this run read, verified the gate, and wrote nothing else.

---

## What was checked

| | |
| --- | --- |
| `main` at | `435d19e` — §4d: the marketing site, composed rather than written (#96) |
| `apps/` holds | `docs/`, `marketing/`, `portal/` — three sibling applications |
| `apps/loom/` | does not exist |
| Migration PR | [#98](https://github.com/jam-overture/loom/pull/98) `day-56-one-application`, open, unmerged, base `main` |
| Open PRs of this routine | none — [#96](https://github.com/jam-overture/loom/pull/96) merged as `435d19e` |
| Maintainer comments | none, on any open PR. Every comment on #96, #97 and #98 is from a routine or from `vercel[bot]` |

## Why the gate held rather than being worked around

The brief names one lane and one condition: *"If `apps/loom/app/(marketing)/` does not exist yet, write a one-line report saying so and stop — do not create it yourself."* [0067](../decisions/0067-the-four-surfaces-are-one-application.md) is `Accepted` and assigns the creation of `apps/loom` to `Loom daily build`, and #98 is that work in flight.

Building into the surviving `apps/marketing/` instead would have been the obvious workaround and is the wrong move twice over. It is the shape 0067 rejects, and #96's own closing comment already raised it and recommended against — *"this branch builds a fifth sibling app… it is one directory into `apps/loom/app/(marketing)/`"*. Adding pages to a directory #98 deletes would put this routine's work on the losing side of a merge that is already open, and would grow the conflict surface of a PR that is 217 renames wide.

## What actually blocks the migration

#98 is not blocked on code. Its own comment says `pnpm verify` is green — 1361 runtime, 642 application — and that nothing in `src/` was opened. What is red is Vercel: `loom-portal` and `loom-marketing` have Root Directory set to `apps/portal` and `apps/marketing`, and the branch deletes both directories, so both builds fail with nothing to build. That is a dashboard change no routine can make.

So the chain to this routine's next unit of work runs through the maintainer:

1. Repoint one Vercel project at `apps/loom` and delete the other (#98 recommends keeping `loom-portal`, which already holds the session secret, the reviewer roster and `DATABASE_URL`).
2. #98 merges; `apps/loom/app/(marketing)/` exists.
3. This routine builds in it.

## Still outstanding from #96, unchanged

Four asks from the merged PR have had no answer, and all four are maintainer-only. They are not blocked by the migration and could be answered today, so that the first run after #98 lands can build with real copy rather than placeholders:

- **Positioning and audience** — who the site is for, in the maintainer's words. Everything on the page today is written from the repository, which is accurate and cold.
- **Pricing** — three tiers are built as structure with `Tier one/two/three` and `—` shown as visible placeholder. *"Free and open source, no tiers"* is a complete answer; it deletes a band rather than filling one.
- **Licensing** — one line in the footer, currently placeholder.
- **The demo's URL** — §4d says the site embeds the demo rather than describing it, and [0056](../decisions/0056-the-demo-is-public-and-shares-nothing-but-the-deployment.md) makes `/demo` public for that reason. After #98 the answer is likely just `/demo` on the one deployment, which is a question the migration may have retired.

## Findings

None filed. This run wrote no code, so it met no framework limit; the two findings from #96 — relative `href`s refused by `linkUrlSchema`, and `loom.divider`'s collapsed ornaments — are already in `FINDINGS.md`, and [#97](https://github.com/jam-overture/loom/pull/97) reports the divider fixed and 0069 `Proposed` against the first.

## Cost

One run, read-only against the repository and the GitHub API. No branch of consequence, no PR, no follow-up scheduled and no self-check-in armed.
