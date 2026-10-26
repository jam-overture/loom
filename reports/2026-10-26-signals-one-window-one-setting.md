# 26 October 2026 (evening) — one window, read where the other settings are

**Routine:** `Loom signals` · **Branch:** `signals-56-one-window-one-setting` ·
**Section:** §56 · **Record:**
[0317](../decisions/0317-the-window-a-deployment-sweeps-on-is-read-where-its-other-settings-are-and-a-window-it-cannot-read-stops-the-sweep.md)

**Pull request:** [#714](https://github.com/jam-overture/loom/pull/714) ·
**Preview:**
<https://loom-git-signals-56-one-wind-3f50fe-jpizzolato36-6341s-projects.vercel.app>

Nothing on this branch draws a page, so the preview is `main`'s site with a
settings reading, a notice join and one status sentence behind it.

## Before anything was built

**One pull request open in the repository, no maintainer comment anywhere.**

- **#706** — `0308` as `Proposed — architectural, needs review`. Still waiting on
  one reading. Untouched here, and nothing on this branch goes near
  `deployment-change.ts`.

Both comments on it are this lane's own and the Vercel bot's, which is not
input, so **nothing outranked the queue**. `Loom daily build` has no branch
open, so there was nothing to race on the signal path. This branch is cut from
`origin/main` at `a3600f1` and stacks on nothing.

The open findings owned by this lane were read first. One of them is what tonight
became.

## What I completed

**§56 / 0317 — the window a deployment sweeps on is one setting, read where its
other four are.**

The finding this closes was filed on 24 October while reading the intake's
settings for a different reason, and it named the fault plainly: **the
collection window's default is written twice, and the copy a deployment actually
runs on is the hand-written one.**

```ts
// apps/loom/scripts/signals-collect.ts, before tonight
const DEFAULT_WINDOW_MS = 60 * 60 * 1000
…
windowMs: Number(process.env.LOOM_SIGNAL_WINDOW_MS ?? DEFAULT_WINDOW_MS),
```

`DEFAULT_READER_SIGNAL_WINDOW_MS` is the same hour, and it carries the whole
argument for the number in its doc comment — longer is more accurate because
fewer page views straddle a boundary (0147), shorter is more anonymous because
the raw window is the entire mechanism by which a view key stops existing
(0146), and rule 5 makes it a deployment's rather than a constant.

**The two numbers agreed, so nothing was broken.** What the duplication had was
a direction: the package's copy was the one with the reasoning attached, and the
script's was the one a deployment's batches were actually swept on. It is the
third instance of this in this subsystem — a browser constant exported under two
names (0218), a words-per-minute figure written twice (0235).

### Why it was a unit rather than a one-line import

**Two things the finding had already spotted, and both of them held up.**

**The window was the one intake setting not read with the others.** The intake
switch, the region switch, the region header and the region floor are all in
`settings.ts`, each with a three-state reading and a sentence for an operator,
and each under the same rule: *a value that is neither on nor absent is
neither*, said out loud rather than read as off, because a deployment that
configured something and got silence is the failure nobody notices. The window
was read inline in a script with `Number(…)` and no state at all for *you typed
something that is not a window*.

**And the notice could not be derived.** `collectionNoticeOf` (0313) publishes
what a page collects to the reader it collects about, and two of its figures
belong to the deployment rather than to the framework: the floor under a
published country, and how long a delivery lives. The second is this number, and
a privacy page cannot be derived from a `const` in `scripts/`.

So: `readCollectionWindow` in `settings.ts`, with the runtime's own
`readerSignalWindowSchema` as its gate — what a window may be is stated once, in
the package, and read rather than restated. `describeCollectionWindow` is the
operator's sentence. `IntakeSettings` carries it as `window`. And
`deploymentNoticeOf(readIntakeSettings())` is this deployment's own notice in one
call.

## Decisions I took that were not specified

**A window that cannot be read stops the sweep rather than defaulting.** This
keeps the behaviour the script already had, and it is worth saying why rather
than inheriting it: the window decides how long a view key lives, which is the
whole of 0146's argument, so a deployment that asked for a day and silently got
an hour has had its anonymity story changed by a typo. Refusing is loud,
recoverable and costs only the lag until somebody fixes it — the buffer is still
there. The alternative, a warning and a fallback, keeps a sweep running on a
number nobody chose.

**The door does not refuse on it.** A window is nothing the endpoint reads.
Refusing batches as well would be symmetrical and worse: the deliveries a
corrected value would have counted would be gone. So an unusable window stops
the sweep and admits every batch, and there is a test that the window does not
reach the switch the door reads.

**A region floor reaches the notice only where a country is actually read.**
`receive.ts` reads a header on the `on` state and no other, so *off* and
*misspelled* both count no region. The notice therefore says *nothing about
where you are is read* rather than publishing a floor under a bucket that does
not exist. This is the one direction `notice.ts`'s ceiling rule does not excuse:
overstating what is collected costs a reader nothing, but naming a floor for a
measurement this deployment is not taking is a sentence about nothing.

**Blank is absent, which is a small behaviour change.** `LOOM_SIGNAL_WINDOW_MS=`
used to be `Number("")`, which is `0`, which was refused — so an empty value in a
`.env` stopped the sweep. It now reads as absent and the sweep runs on the
default. Every other setting in this file already treats blank as absent, and an
empty assignment is far likelier to mean *unset* than *sweep on zero*. Tested
both ways.

**The status gained a sentence rather than a second `windowMs`.** `describeIntake`
already reports `windowMs`, and that is the **rate limit's** window. A new field
called `collectionWindowMs` beside it would be the ambiguity named twice rather
than removed, so the new field is `collection` — one sentence about the sweep,
which quotes a refused value. The honest fix is renaming the old field, and that
is filed rather than taken: the rename is one line in `receive.ts` and one line
in `docs/deployment.md`, and the second file is not this lane's.

**I did not put the reading in `collect.ts`.** It owns the number, so it looks
like the natural home. 0315's reason holds: a runtime function that goes looking
for configuration takes whatever the process happens to hold, and the caller who
forgot to pass a value gets the default rather than the deployment's.
Configuration is handed in.

## Records added

- **0317** — *The window a deployment sweeps on is read where its other settings
  are, and a window it cannot read stops the sweep.* **Accepted.** It
  contradicts no accepted record; it consolidates a default and states one rule
  about a refusal that the code already followed. Six alternatives recorded with
  what each costs.

**0317 was the next number free on `main`,** which holds to 0316. `0308` is
claimed by #706 and nothing claims 0317.

## Findings closed and filed

**Closed:**

1. *The collection window's default is written twice, and the copy that a
   deployment actually runs on is the hand-written one* (24 October, this lane's).
   Taken as the unit it asked for rather than as the one-line import it offered.

**Filed, open:**

2. **Owned by `Loom daily build` (`docs/deployment.md`):** the intake status
   reports two different windows and has one word for one of them. The rename is
   spelled out in full — one line of code in this lane's file, one line in the
   sample response in §9 of that page — and it is filed rather than taken
   because a rename that leaves another lane's documentation stale with nothing
   failing is the worse of the two states.
3. **Owned by this lane (`src/signals/notice.ts`):** a notice promises how long a
   delivery is kept, and nothing in it says whether a sweep is scheduled to keep
   the promise. Older and larger than tonight's unit, and 0317 made one instance
   of it reachable: a deployment can have a working endpoint, a notice naming an
   hour, and a sweep refusing to run. Three shapes costed; the recommendation is
   that a deployment states its sweep schedule and the notice carries it, which
   is a record rather than a judgement call.
4. **Owned by `Loom docs`:** a deployment's own notice is one call now, and the
   one surface that prints a notice prints the framework's defaults. Filed as an
   offer rather than a defect — a page documenting the framework is right to
   print the framework's answer; a page telling *this site's* readers what it
   collects wants `deploymentNoticeOf`, and no such page exists yet.

Nothing else closed. The two findings that are the maintainer's are unchanged,
and `0308` is still one reading.

## Test numbers

`pnpm install && pnpm verify` **green, exit 0** — read from the file the gate
wrote as the last thing on its line, per `docs/routines.md`.

| | |
| --- | --- |
| Root suite | 240 files, **5,779 tests**, all passing |
| App suite | 368 files, **6,641 tests**, all passing |
| `settings.test.ts` | 20 → **31** |
| `receive.test.ts` | 48 → **50** |
| `notice.test.ts` (app) | new, **10** |
| `chain.test.ts` | 4, unchanged |
| Findings ledger | 1,331 entries, 0 malformed |

**Nothing failed in the final run and nothing was skipped. Two earlier runs were
red, and both are reported rather than smoothed:**

1. **A test of mine failed for the opposite of its reason.** The guard against
   the duplication coming back reads `signals-collect.ts` and asserts the
   arithmetic is not in it — and the paragraph I had written *explaining* the
   fix quoted `60 * 60 * 1000`, so the file failed its own check on a sentence
   about the file passing it. The check now strips comments first, and the
   paragraph says *an hour*. Worth keeping: a source-text assertion that cannot
   tell code from prose fails on the documentation of the thing it is guarding.
2. **The application's typecheck — `exactOptionalPropertyTypes`.** Handing
   `collectionNoticeOf` `region: undefined` is not the same argument as handing
   it no `region`, and only the second means *no country is read*. It is spread
   conditionally now, which is the shape `receive.ts` already reads the switch
   with. The unit tests had all passed, because vitest does not typecheck — the
   gate caught it.

**Seven mutations planted, seven dead.**

| planted | what died |
| --- | --- |
| a bad value reads as one the operator set | 5 tests, across the reading, the sentence and the status |
| a blank value is unusable rather than absent | *is the runtime's own default when nothing is set* |
| the runtime's gate is skipped, so a sub-minute window is taken | 6 tests, including the notice's fallback |
| the notice publishes a floor wherever one is configured | both *says nothing is read* cases — off, and a misspelled switch |
| the notice reports the framework's window rather than this deployment's | *is this deployment's own window* |
| the status reports the rate limit's window as the collection window | both status tests, including the one about the two windows |
| the sweep falls back to the default instead of refusing | *refuses to sweep on a window it could not read* |

**No survivors**, which is the first run in a while with none. The honest limit
is in the duplication guard rather than in the mutants: it is **spelling-bound**.
It strips comments and underscores and refuses `60 * 60 * 1000` and `3600000` in
either file, so the two spellings this repository has actually used both fail —
but a third spelling of the same number would pass, and no test run from inside
the process can tell a correct literal from the import.

**The script was run, both ways, not only tested.** A refused value prints the
sentence with the value quoted and exits 1; a set value prints what it will
sweep on and then stops on the missing connection string:

```
loom: LOOM_SIGNAL_WINDOW_MS is "60", which is not a window this runtime will sweep on, …
loom: a delivery is counted into the totals and dropped once it is 900000ms old
```

That also confirmed the one mechanical risk in the change: the script now
imports a module that reaches an aliased `@/` path, and `tsx` resolves it.

**Browser cost: nothing.** `broadcast.ts` is byte-identical — `git diff` on it
is empty — and nothing on this branch is in a browser's import graph at all.
`settings.ts`, `notice.ts`, `receive.ts` and the sweep are all server-only. **No
payload field, no column, no migration, no store method and no new kind.**

## Open questions

**Nothing blocking.** Two of the three are unchanged from this morning:

1. **`0308`** on #706, still one reading of one clause, still the cheapest it
   will ever be.
2. **The door's repeated *opening* batch**, whose remedy steps over a sentence of
   0146. Recommendation unchanged: nothing, until `0314`'s `redelivered` figure
   shows a deployment actually retrying.
3. **New, and it is a design question rather than a defect:** should a notice
   carry the sweep *schedule* a deployment states, so that *a delivery is kept
   until it is 60 minutes old* is a promise with something behind it? Filed with
   three shapes costed and a recommendation. It needs a record because it adds a
   figure to a published notice, which is why it was not taken tonight.

And the standing one: **nothing draws any of this.** Nine runs. `Loom portal` is
paused.

## On keeping the parked door cheap to open

**Nothing here makes per-reader identity more expensive, and one thing makes it
marginally cheaper.** The agreed shape, when it returns, is a gate and a record:
a broadcaster that refuses to start without a recorded decision, and an intake
that refuses an identified batch which cannot show which decision allowed it.
That refusal is an intake *setting* with more than two states — which is now
exactly what this file is made of, with the window as the fifth of them and one
sentence per state for the operator who has to configure it. Nothing was built
toward it, and nothing stores anything about anybody.
