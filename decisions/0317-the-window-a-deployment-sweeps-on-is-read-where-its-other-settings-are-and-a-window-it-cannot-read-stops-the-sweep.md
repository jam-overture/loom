# 0317 — The window a deployment sweeps on is read where its other settings are, and a window it cannot read stops the sweep

**Status:** Accepted

**Date:** 26 October 2026

**Section:** §4c (reader signals)

## Context

`DEFAULT_READER_SIGNAL_WINDOW_MS` is an hour, and `collect.ts` carries the whole
argument for the number in its doc comment: longer is more accurate because
fewer page views straddle a boundary (0147), shorter is more anonymous because
the raw window is the entire mechanism by which a view key stops existing
(0146), and rule 5 of [`docs/signals.md`](../docs/signals.md) makes it a
deployment's rather than a constant.

**The script that actually sweeps did not import it.**

```ts
// apps/loom/scripts/signals-collect.ts, before tonight
const DEFAULT_WINDOW_MS = 60 * 60 * 1000
…
windowMs: Number(process.env.LOOM_SIGNAL_WINDOW_MS ?? DEFAULT_WINDOW_MS),
```

Two spellings of one default, which is the fault this subsystem has been bitten
by twice before — a constant the browser exported under two names (0218), a
words-per-minute figure written twice (0235) — and this one had a direction. The
package's copy was the one with the reasoning attached. The script's copy was the
one a deployment's batches were actually swept on.

Nothing was broken: the two numbers agreed. What made it worth a unit rather
than a one-line import is what reading it found beside it.

**The window was the one intake setting not read with the others.** The intake
switch, the region switch, the region header and the region floor are all in
`apps/loom/app/_lib/reader-signals/settings.ts`, each with a three-state reading
and a sentence for an operator — and each with the same rule behind it: *a value
that is neither on nor absent is neither*, said out loud rather than read as
off, because a deployment that configured something and got silence is the
failure nobody notices. The window was read inline in a script, with `Number(…)`
and no state for *you typed something that is not a window*.

**And the notice could not be derived.** `collectionNoticeOf` (0313) publishes
what a page collects to the reader it collects about, and two of its figures are
the deployment's rather than the framework's: the floor under a published
country, and how long a delivery lives before it is counted and dropped. The
second one is this number. A privacy page cannot be derived from a `const` in
`scripts/`, so the deployment's own notice had nothing to read.

## Decision

**One reading, in `settings.ts`, beside the other four.** `readCollectionWindow`
returns `default`, `set` or `unusable`, with the runtime's own
`readerSignalWindowSchema` as the gate — so the rule about what a window may be
is stated once, in the package, and read rather than restated.
`describeCollectionWindow` is the operator's sentence, and `IntakeSettings`
carries the result as `window`.

**A window that cannot be read stops the sweep.** `unusable` carries the default
beside it so a status line has a number to print, and the sweep refuses to run
on it: an operator who typed a day meant a day, and sweeping on an hour because
their value could not be parsed would silently change both what their counters
mean and the one retention number their readers are told. This is the behaviour
the script already had; what changes is that the refusal is now a state a type
carries rather than a `safeParse` at a call site.

**The door does not refuse on it.** A window is nothing the endpoint reads.
Refusing batches as well would lose the deliveries a working sweep could still
count the moment the value is fixed, so an unusable window stops the sweep and
admits every batch.

**The status says which window it means.** `describeIntake` gains `collection`,
one sentence about the sweep's window and whether the value given could be read
— because a buffer growing under a refused sweep looks from outside exactly like
a buffer growing under no sweep at all, and the status is the only way to ask a
deployment what it is doing with what it kept.

**`deploymentNoticeOf(settings)` is the join.** One function, in
`apps/loom/app/_lib/reader-signals/notice.ts`, handing `collectionNoticeOf` this
deployment's own configuration: the window from the setting, and a region floor
**only where a country is actually read** — which is the `on` state and no other,
since that is the one state in which the door reads a header. Off and misspelled
both count no region, and the notice then says *nothing about where you are is
read* rather than publishing a floor under a bucket that does not exist. Every
kind is named whatever any page was broadcast with, which is `notice.ts`'s
ceiling rule; an intake does not know a page's `kinds` in any case.

## Consequences

- **The default has one spelling.** A test reads `signals-collect.ts` with its
  comments stripped and fails if an hour is written out again there, or if the
  script parses the window itself. The duplication came back once already in a
  different file; the guard is at the source because that is where it would
  return.
- **A deployment's notice is one call.** `deploymentNoticeOf(readIntakeSettings())`
  is what a privacy page, a portal screen or a consent surface prints. It is
  derived, so it cannot drift from the payload or from the configuration.
- **An operator can ask.** `GET /api/reader-signals` now reports the collection
  window in words, including a refusal with the value quoted.
- **`windowMs` on that status is still the rate limit's window**, which is a
  second window with one word for both. The new field is a sentence about the
  sweep rather than a rename, because the status's field names are documented in
  `docs/deployment.md`, which is another lane's file. Filed for it.
- **Nothing reaches a reader's browser.** No payload field, no broadcaster byte,
  no column, no migration, no store method, no new kind. `broadcast.ts` is
  untouched.
- **Per-reader identity is not made more expensive.** A consent decision would
  be a third state on an intake setting read in the same file, which is now
  where every such state lives.

## Alternatives considered

- **A one-line import in the script.** `windowMs: Number(process.env.X ??
  DEFAULT_READER_SIGNAL_WINDOW_MS)` closes the duplication and nothing else. It
  leaves the window the only setting with no state for a value that cannot be
  used, leaves the notice underivable, and leaves an operator with no way to ask
  what their sweep runs on. Rejected: the duplication was the symptom.
- **Falling back to the default on an unusable window, with a warning.** A sweep
  that keeps running is the more available choice and the wrong one. The window
  decides how long a view key lives, which is the whole of 0146's argument, and
  a deployment that asked for a different number and silently got an hour has
  had its anonymity story changed by a typo. Refusing is loud, recoverable and
  costs only the lag until somebody fixes it; the buffer is still there.
- **Refusing batches at the door too.** Symmetrical and worse. The door and the
  sweep fail independently, and a deployment with an unreadable window still has
  a working endpoint — refusing would throw away deliveries that a corrected
  value would have counted.
- **Reading the window from the environment inside `collect.ts`.** It is the
  module that owns the number, so it looks like the natural home. Rejected for
  0315's reason: a runtime function that goes looking for configuration takes
  whatever the process happens to hold, and the caller that forgot to pass a
  value gets the default rather than the deployment's. Configuration is handed
  in, here as everywhere in this subsystem.
- **Renaming the status's `windowMs` to `rateWindowMs`.** It would remove the
  ambiguity at its root rather than describing it. Rejected tonight only because
  the field is documented in `docs/deployment.md` and renaming it would leave
  another lane's page stale with nothing failing — which is what findings are
  for. The one-line change is spelled out in the entry.
- **`deploymentNoticeOf` returning no notice where the window is unusable.** The
  honest reading of *nothing is being swept, so no retention can be promised* —
  and a privacy page that prints nothing because an environment variable is
  misspelled is a worse failure than one that prints the number the sweep would
  have used. The deeper version of the problem is older and larger than this
  setting: a buffer age is a promise only a **scheduled** sweep keeps, and
  nothing in the notice says whether one runs. Filed rather than papered over
  with structure.
