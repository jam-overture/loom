# 0191. The harness may start the application, because there is now only one

**Status:** Accepted — partially supersedes 0117
**Date:** 2026-09-25
**Section:** §1 (process)
**Partially supersedes** [0117](0117-one-harness-two-subjects-a-tree-it-renders-and-an-address-you-serve.md) — the sentence *`pnpm shoot` does not start your server*, and nothing else in it

## Context

[0117](0117-one-harness-two-subjects-a-tree-it-renders-and-an-address-you-serve.md)
settled that there is one screenshot harness with two subjects, and drew the
line at the server:

> Photographing a signed-in screen still needs that lane's `next build`, `next
> start` and environment. `pnpm shoot` does not start your server. It
> photographs one you are already running.

The reason given was that *running your application is your lane's recipe, and
it is the part that differs*. That was written on 8 September, and it was a
sentence about five applications. It had already stopped being true: the
migration made `apps/loom` the only one on 19 August, and what differs between
lanes is now the environment the application is handed, not the command that
starts it.

**What the line costs, measured.** On 24 September the documentation lane
photographed a page that did not contain a change its source had, filed it as a
build that exits 0 and serves the previous build's HTML, and named a killed
build as the suspect. This run reproduced the symptom and the suspect is not it:

| what was done | what came back |
| --- | --- |
| `next build` killed during *Running TypeScript*, then run again | rebuild correct |
| `next build` killed during *Generating static pages*, then run again | rebuild correct |
| a `next start` left running across a rebuild | **the previous build's HTML, from a build that exited 0** |

The third row is the fault, and the mechanism is that **`next start` loads a
route's compiled module the first time it is asked for that route and keeps
it.** A server that answered a request before a rebuild serves a mixture
afterwards — stale for every route it had already answered, fresh for every
route it had not. `rm -rf .next` "fixes" it only because nobody can rebuild
without restarting the server afterwards.

**Nothing the server says distinguishes the two.** Measured on 16.2.12: no
response header and no page carries the build id; a prerendered body is read
from disk on the first request for it, so a probe route answers *fresh* on a
server that is serving stale pages either side of it; and the chunk filenames
are the same across builds, so a stale page's own assets resolve. A detector is
not available at this seam. A server the harness started is not in the state at
all.

## Decision

**`pnpm shoot` may be asked to start the application, photograph it and stop it
again**, with `--serve <application-dir>`:

```bash
LOOM_PLAYWRIGHT=/tmp/shot/node_modules pnpm shoot shots.json --serve apps/loom
```

- It refuses a directory with no `.next/BUILD_ID` and says which command makes
  one. **It does not build.** A harness that builds is a harness that decides
  when four surfaces wait ninety seconds, and the lane knows whether it just
  built.
- It listens on an ephemeral port, so it runs beside a lane's own `next dev`,
  which is the same choice `tools/specimen/serve.ts` already makes.
- It prints the build directory's own newest write beside the origin, so a
  report can quote **which build a picture is of** rather than the hour it was
  taken.
- It stops the server on every exit, including the ones that are
  `process.exit`.
- **Without the flag nothing changes.** A shot list with a `baseUrl` and a
  server somebody else is running is still the way to photograph a preview
  deployment or a screen behind a session this harness cannot produce, and that
  is most of what 0117 was protecting.

**0117 stands apart from that one sentence.** One harness, one code path after
the subject, the shared viewports, and `playwright-core` never being a
dependency are all untouched.

## Consequences

- **A picture taken with `--serve` cannot be of a build that is no longer on
  disk.** That property is worth more than it sounds: every routine's report is
  a photograph, and until today none of them could say which build it was of.
- **The date in a report can be a build's, not a run's.** `built
  2026-09-25T21:32:14.027Z` beside the origin is the line to quote.
- **It dates the build by the newest write in `.next`, `cache` excluded**, and
  not by `BUILD_ID` — which is written before static generation finishes, and
  was twenty seconds early on the build that established this. Which file a
  version of Next writes last is not something this harness should claim to
  know.
- **A lane photographing a signed-in screen still supplies the environment.**
  The child inherits this process's, which is how a `DATABASE_URL` or a session
  secret reaches it; what the flag removes is the `next start` and the
  remembering to restart it, not the configuration.
- **The stale-server fault is not fixed, only avoided by this path.** A lane
  that keeps its own server running and photographs it with a `baseUrl` can
  still photograph yesterday. The finding stays open with the mechanism written
  into it.

## Alternatives considered

- **A build sentinel** — mark before `next build`, clear after, sweep `.next`
  on a build that finds the mark. This lane filed it yesterday with the shape
  and the argument, and it is **rejected on the evidence above**: it defends
  against a killed build, killed builds rebuild correctly, and it would have
  cost four routines a full rebuild after every interrupted one while leaving
  the real fault exactly where it was.
- **`rm -rf .next` before every build.** The sweep the sentinel was preferred
  over. Slower for everybody, every run, and also not the fault.
- **A freshness probe the server answers.** The obvious shape — the application
  serves its build id, the harness compares it with `.next` — and it does not
  work here: the id is not exposed, a static body is re-read from disk on first
  request, and a compiled module is loaded lazily, so every probe reports fresh
  on a server that is serving stale pages. The one mechanism that would carry a
  boot-time value over HTTP is draft mode's bypass cookie, which means shipping
  an unprotected endpoint that enables draft mode. Refused: a deployment-wide
  cache bypass is not a thing to add for a screenshot.
- **Identifying the server process behind the port** and comparing its start
  time with the build's. Decidable, and `lsof` is in this image — but it is an
  operating-system detail in a screenshot harness, it is wrong the moment the
  address is not local, and it reports a *server* rather than a picture.
- **Widening the proxy's matcher** so every response carries a build stamp.
  `apps/loom/proxy.ts` matches `/portal` and nothing else, deliberately
  (0067's access model), and running it over every public request to date a
  photograph is a real cost for a harness's convenience.
- **Leaving it, and writing the recipe down.** What the 24 September finding
  proposed as the cheap half. Two lanes have now lost time to this one, neither
  of them the lane that caused it, and a recipe defends nobody who has not read
  it.
