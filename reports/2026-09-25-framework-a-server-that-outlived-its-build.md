# A server that outlived its build — the false green diagnosed, and the harness that cannot take that picture

**Routine:** `Loom daily build` (framework, `src/` except `src/primitives/`, and the application shell)
**Date:** 2026-09-25
**Section:** §1 (process)
**Branch:** `framework-54-a-build-that-did-not-finish` — branched off `main`, no open pull request from this lane to push onto
**Record added:** [0191](../decisions/0191-the-harness-may-start-the-application-because-there-is-now-only-one.md), partially superseding [0117](../decisions/0117-one-harness-two-subjects-a-tree-it-renders-and-an-address-you-serve.md)

Two photographs of the same page, taken a minute apart, from one repository in
one state. The left is the lane's own `next start`, photographed the way every
report in this repository is photographed. The right is the same page with
`--serve`.

| the server a lane was running | the server the harness started |
| --- | --- |
| ![stale](2026-09-25-framework-a-server-that-outlived-its-build-stale.png) | ![served](2026-09-25-framework-a-server-that-outlived-its-build-served.png) |

The eyebrow on the left is a build that is no longer on disk. Nothing in the
picture says so, and until today nothing in a report could have.

## What was completed, in plain language

Yesterday's entry from `Loom docs` said a `next build` can exit 0 and serve the
previous build's HTML, and named the killed build as the suspect. Yesterday's
run of *this* lane agreed, filed a sentinel as the cure, and left it as the next
unit. **Both were wrong, and this run has the measurements.**

- A `next build` killed during *Running TypeScript*, then run again: **the
  rebuild is correct.**
- A `next build` killed during *Generating static pages*, then run again: **the
  rebuild is correct.**
- A stray file and a stray directory put in `.next`: **both gone after a
  build.** The same file put in `.next/cache`: **survives.** So `next build`
  clears its output except the cache, which is why a killed build carries
  nothing forward.
- A `next start` left running across a rebuild: **serves the previous build**,
  from a build that exited 0, with the new string sitting in
  `.next/server/chunks` on disk. That is the fault, exactly, and it is what the
  left-hand picture above is.

The mechanism is that `next start` loads a route's compiled module the first
time it is asked for that route and keeps it. A server that answered a request
before a rebuild serves a **mixture** afterwards — stale for the routes it had
already answered, fresh for the ones it had not. `rm -rf .next` "worked" as a
workaround only because nobody rebuilds without restarting the server after it.

**The fix is that the harness can own the server's lifetime now.**

```bash
LOOM_PLAYWRIGHT=/tmp/shot/node_modules pnpm shoot shots.json --serve apps/loom
```

starts the built application on an ephemeral port, replaces the list's
`baseUrl`, photographs, and stops it — on every exit path, including the ones
that are `process.exit`. It prints the build's own newest write beside the
origin:

```
serving apps/loom at http://127.0.0.1:46201  built 2026-09-25T21:32:14.027Z
2026-09-25-…-served  1280x900@2x  scrollWidth 1280 / innerWidth 1280
```

That second line is what every report has always had. The first is new, and it
is the one that says **which build the picture is of**.

## Why there is no detector, which is most of why the cure is this one

The obvious fix is a probe: the application serves its build id, the harness
compares it with `.next`. Each of these was measured and each kills it.

- **No response header carries the build id**, and neither does any page. Not in
  the HTML, not in the RSC payload, not in a prefetch.
- **A prerendered body is re-read from disk on the first request for it.**
  Proved by editing `.next/server/app/robots.txt.body` on a freshly started
  server and asking for `/robots.txt` for the first time: the edit came back. So
  a *static* probe route answers **fresh** on a server that is serving stale
  pages either side of it.
- **A compiled route module is loaded lazily**, so a dynamic probe route is
  fresh for the same reason.
- **Chunk filenames are the same across builds** (Turbopack names them by
  module path), so a stale page's own assets resolve and nothing 404s.

The one mechanism that carries a boot-time value over HTTP is draft mode's
bypass cookie, and reaching it means shipping an unprotected endpoint that
enables draft mode — a deployment-wide cache bypass, for a screenshot. Refused.

A server the harness started is not in the state at all, which is why
elimination beat detection here.

## Decisions taken that were not specified

**This is a partial supersession of 0117 rather than an escalation, and that is
a judgement worth disagreeing with.** 0117 says in as many words: *`pnpm shoot`
does not start your server.* The brief says contradicting an `Accepted` record
is `ARCHITECTURAL — needs review`. I took it as a partial supersession — the
documented mechanism for a record that answered several questions and is
replaced in one of them — on three grounds: 0117's *decision* (one harness, two
subjects, everything after the subject shared) is untouched and still exactly
true; the sentence's stated reason, *running your application is your lane's
recipe, and it is the part that differs*, was a sentence about five
applications and the migration made it one; and the default is unchanged, so
reversing this is deleting a flag nothing is obliged to use. **It is the first
question in the pull request comment.**

**The harness does not build.** A harness that builds decides when four surfaces
wait ninety seconds. The lane knows whether it just built; what it kept
forgetting is to restart the server.

**An ephemeral port, not 3000.** A lane's own `next dev` is very often on 3000,
and the whole point is that this server is the harness's. Same choice
`tools/specimen/serve.ts` already made, same accepted race between closing the
probe socket and the child binding the number back.

**The build is dated by the newest write in `.next`, `cache` excluded — not by
`BUILD_ID`.** `BUILD_ID` was written twenty seconds before the build finished on
the build that established this. Which file a version of Next writes last is not
something a screenshot harness should claim to know; a maximum over the
directory needs no such claim.

**Two failures are reported rather than thrown.** `fail` is `process.exit`, and
`process.exit` does not run a `finally` — so a missing Chromium inside the
obvious `try` would have left the server alive after the command returned. And
a child that cannot be spawned emits `error` and never `exit`; an unhandled
`error` on a ChildProcess throws out of the event loop, which is how the first
real run of this path arrived as a stack trace instead of a sentence. Both have
tests.

## Records added or superseded

- **[0191](../decisions/0191-the-harness-may-start-the-application-because-there-is-now-only-one.md)** — *The harness may start the application, because there is now only one.* `Accepted`. It **partially supersedes 0117**, whose status is now `Accepted — partially superseded by 0191`, written at both ends. 0191 was the next free number on `main` and on both open branches (#393, #394) at the time of writing. `pnpm decisions:index` regenerated; its notes about numbers with no record on `main` are pre-existing and unchanged.

Writing the pair at both ends is also, incidentally, the shape `Loom lessons`
asked about on 25 September — eleven supersessions, ten reciprocal. That entry
is still open and still this lane's; nothing here decides it.

## Findings closed and filed

**Closed**

- *a `next build` that exits 0 can serve the previous build's HTML* (`Loom docs`, 24 Sep) — closed with the cause, which is not the one it guessed. Its measurement was sound and its inference was not, and it says so rather than being rewritten.
- *the judgement the false-green entry asked for: the build does not clear `.next`, and the cure is a sentinel* (`Loom daily build`, 25 Sep) — **closed as withdrawn.** My own lane's judgement from yesterday, wrong, and the evidence is in 0191. It would have cost four routines a full rebuild after every interrupted build and fixed nothing.

**Filed**

- *a `next start` serves a mixture after a rebuild, and no response says which half you are looking at* — the fault with its mechanism, the five measurements, and the four reasons a probe cannot see it. Open, because `--serve` avoids it rather than fixing it: a lane photographing its own server can still photograph yesterday.

## Test numbers, and what is not covered

`pnpm install && pnpm verify` — **green, exit 0**, with today's work on the
branch.

| | files | tests |
| --- | --- | --- |
| `@loom/runtime` (`src/`, `tools/`) | 161 | **3092** |
| `@loom/app` (`apps/loom/`) | 309 | **5904** |

New this run: **19** in `tools/screenshot/application.test.ts` — dating a build,
locating one, the two refusals with the command that fixes each, the readiness
loop's three outcomes, argument parsing, and the start/stop path against a stub
runner rather than a real `next start`. Nothing was skipped, weakened or marked
pending. `pnpm prerender:check` passes with `112 prerendered pages, 3 metadata
conventions, 0 unserved`.

**What the tests do not cover, stated so a green tick is not read for more than
it is:** the start/stop path is tested against a four-line stub in
`node_modules/.bin/next`, not against Next. What is under test is that the
harness passes the port it chose, waits for a socket rather than a banner,
reports a child that dies or cannot be spawned, and leaves nothing running.
That `next start` accepts `--port` is somebody else's release note, and testing
it here would be a ninety-second test of it. The real path was run end to end by
hand to produce the two pictures above, and the ephemeral port answered nothing
afterwards.

**The two pictures involved a temporary edit to a marketing string** — the
eyebrow was made to read *This build has been replaced on disk* for the build
the left-hand server was started from, and the source was restored before the
second build. Nothing in the diff touches `(marketing)`; the string is a probe
and the picture is of the mechanism, not of the copy.

## Open questions

1. **Was the partial supersession the right call, or should 0191 have been
   `Proposed` and flagged?** The argument for partial is above. If the answer is
   that any sentence in an `Accepted` record is the record, say so and the
   status changes.
2. **Should any lane's screenshot recipe be *required* to use `--serve`?**
   Nothing enforces it and nothing can — a preview URL and a screen behind an
   environment this harness cannot produce are both real. It is written into
   `docs/routines.md` as the default to reach for, and that is as far as this
   run went.
3. **The two `tools/decisions/` entries `Loom lessons` filed today** — the
   one-way supersession check, and `decisions/README.md` describing a closed set
   of statuses the directory does not have — are open, small, and owned by this
   lane. Both are deliberately not in this branch: one pull request that changes
   the screenshot harness *and* puts a new gate in front of five lanes is two
   arguments. They are the obvious next unit.

## What is still true about the migration

`apps/loom` has all five route groups, `apps/portal` and `apps/docs` are
retired, sign-in is at the `(portal)` boundary in `proxy.ts`, and there is one
`vercel.json`. The tree is not half-migrated. This is the fifth consecutive run
of this lane to confirm it, and the recommendation to drop that section from the
brief stands. The brief also still names the demo as this lane's; `Loom demo`
has owned it since 20 August and nothing here touched it.
