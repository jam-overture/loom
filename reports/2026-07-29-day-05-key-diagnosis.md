# 2026-07-29 (day 5, follow-up) — Why the API key never arrived

**Build order section:** none — this is maintainer-requested debugging, not a build unit

**Visual:** [2026-07-29-day-05-key-diagnosis.svg](2026-07-29-day-05-key-diagnosis.svg)

**Branch:** `day-05-key-diagnosis`, off `main` (PR #6 merged)

> Follow-up to [`2026-07-29-day-05.md`](2026-07-29-day-05.md), same session. On
> PR #6 the maintainer said: *"Okay, we have to investigate the key issue. I
> followed the steps correctly. Maybe we can debug that now."* This is that
> investigation.

---

## The answer, first

**You did configure it correctly.** The key reaches this container and it reaches
the agent process. It is then **deliberately stripped from the environment of
every process the agent spawns** — which is every process that runs `pnpm test`.
So the variable is simultaneously present (to the agent) and absent (to Vitest),
which is why three runs of increasingly confident "it isn't set" were all wrong
about the cause.

Nothing was wrong on your side, and there was nothing to fix in the environment
config. The fix is in this repo: **use a variable name that is not reserved.**

## How it was established

Comparing environment variable **names** — never values — between the agent
process and the shell a tool command runs in:

```
vars present in the Claude Code process but MISSING from the Bash tool's shell:
  ANTHROPIC_API_KEY
  CLAUDE_CODE_RESUME_INTERRUPTED_TURN

count parent=73 shell=129
```

The shell has *more* variables than the parent (129 vs 73) — the proxy and TLS
settings are injected on top. So this is not a subset or a truncation: it is a
targeted removal, and `ANTHROPIC_API_KEY` is the only meaningful name in it.

The reason is sound. `ANTHROPIC_API_KEY` is the credential the agent itself
authenticates with, and an agent that hands its own credential to every
subprocess it launches has no way to bound what happens to it. The variable is
reserved, and this repo was using the reserved name.

Supporting checks, all negative and all now ruled out: it is not in the container
boot environment (`/proc/1/environ` has `HOME` and `TERM` only, so nothing is
injected at boot); no shell profile or `/etc/environment` sets it; there is no
`.env` file anywhere; and `ANTHROPIC_BASE_URL` *is* present and correct, so
Anthropic configuration in general does arrive.

## What I did not do

The value is readable from `/proc/<agent-pid>/environ`. I did not read it, and
did not reinject it into the test process.

Reaching around a credential protection to make a test go green is the wrong
trade even when the intent is benign — the whole point of the strip is that a
subprocess should not get that credential, and a fix that works by defeating it
is one nobody could safely keep. It also would have produced a test that passes
only inside an agent session, which is the same objection recorded on day 3
against using the session's OAuth credential.

## The fix

The smoke test now reads **`LOOM_ANTHROPIC_API_KEY` first**, falling back to
`ANTHROPIC_API_KEY`:

```ts
const liveApiKey = process.env["LOOM_ANTHROPIC_API_KEY"] ?? process.env["ANTHROPIC_API_KEY"]
```

`LOOM_ANTHROPIC_API_KEY` is reserved by nothing, so it passes through untouched.
The standard name still works in every environment that does not reserve it —
a developer running the suite locally needs no change.

The key is also now passed explicitly to the SDK constructor rather than left to
the SDK's own `process.env` lookup, since the SDK only knows the standard name.

**What you need to do:** set `LOOM_ANTHROPIC_API_KEY` to the same value, in the
same place you set `ANTHROPIC_API_KEY`. Nothing else changes.

## Proof that it works

Running the smoke test with the new variable set to a deliberately invalid value:

```
× modelInterpreter against the live API > turns a plain instruction into a delta that applies
  → interpretation failed: interpreter-unavailable — 401
    {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}
```

That failure is the good news. It means the test **ran** instead of skipping, the
request reached `api.anthropic.com` through the egress proxy, and Anthropic
answered. Every part of the path is now proven except the value itself. With a
valid one, the next run exercises the live API with no further code change.

It also incidentally confirms two things that had been assumed: outbound
connectivity to the API works from this container, and `interpreter-unavailable`
is the correct classification for a 401 (it is an access problem, not a content
one — consistent with 0005's error taxonomy).

---

## Decisions I made that weren't specified

1. **A repo-specific variable name rather than asking you to rename anything.**
   The alias is checked first and the standard name still works, so the change is
   additive and nothing breaks for a developer outside this environment.

2. **The key is passed to the `Anthropic` constructor explicitly.** Previously
   the SDK read the environment itself, which meant it could only ever find the
   reserved name.

3. **No decision record.** This is an environment detail inside an already-agreed
   design (0005 fixed the seam and the skip-when-absent policy, both unchanged).
   It belongs in a report, and it is here.

---

## Test coverage / status

```
Test files  33 passed | 1 skipped
Tests       311 passed | 1 skipped
Statements  99.14%   Branches 93.50%   Functions 98.85%
```

`pnpm verify` green. No new tests: this changes which variable a skip condition
reads, and the condition's two branches are exercised by the suite being green
offline and by the 401 run above. Coverage numbers are unchanged from day 5,
which is expected — the smoke test is excluded from coverage when it skips.

The suite is still fully offline-capable and still skips cleanly with neither
variable present.

---

## Open questions for the next session

1. **Confirm the live test actually runs.** Once `LOOM_ANTHROPIC_API_KEY` is set,
   the next run should show `34 passed` and no skip. If it still skips, the new
   name is being filtered too and the next thing to check is whether custom
   variables reach the agent process at all — the diff command in this report is
   the diagnostic, and it takes one run.

2. **Carried, unchanged:** node-level provenance (day 1), and `renderTree`
   outgrowing the prompt on large trees (day 3).

3. **§4, the Framework SDK** is still the next build unit, unaffected by any of
   this.
