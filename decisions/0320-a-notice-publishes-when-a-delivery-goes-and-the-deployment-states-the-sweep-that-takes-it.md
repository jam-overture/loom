# 0320 — A notice publishes when a delivery goes, and the deployment states the sweep that takes it

**Status:** Accepted

**Date:** 28 October 2026

**Section:** §4c (reader signals)

## Context

[0313](0313-what-a-page-collects-is-published-to-the-reader-it-collects-about.md)
made what a page collects a value a deployment can publish to the readers it
collects about, and one field of it is how long a delivery lives. The sentence
it published was this:

> a delivery is kept until it is 60 minutes old, and the deployment's own sweep
> is what then counts it into totals and deletes it — the key tying one visit
> together exists until then and nowhere else

Every clause of that is true, and the whole of it is read as a promise the
framework cannot keep. **`bufferMs` is the age at which a delivery becomes
*ripe*, not the age at which anything deletes it.** Nothing in `src/signals/`
deletes a delivery: `collectReaderSignals` counts the ripe prefix and drops
what it counted, and what calls it is a cron, a deploy hook or an operator
(0146, 0158) — outside the application, outside this repository, and outside
anything a test can see. `docs/deployment.md` is blunt about the operational
half: *the buffer only empties when you run this.*

So a deployment can have a working endpoint, a notice naming an hour, and
nothing sweeping. Its readers are told an age that reads like a deletion, and
nobody reading *a delivery is kept until it is 60 minutes old* can hear
*…or for ever, if nobody runs the sweep*. The notice was filed as having this
hole on 26 October, when [0317](0317-the-window-a-deployment-sweeps-on-is-read-where-its-other-settings-are-and-a-window-it-cannot-read-stops-the-sweep.md)
made one instance of it reachable: a window the sweep refuses to run on leaves
the endpoint collecting and the sweep stopped, and the notice goes on naming an
hour.

This is the one direction of overstatement this module was built to make
impossible. Its ceiling rule lets a notice say *more* is collected than is —
`types` and `within` narrow collection below what it publishes, deliberately,
because a disclosure that overstates collection costs a reader nothing. **An
overstated deletion is the opposite**: it is the claim a reader would most want
to rely on, and the claim this subsystem had the least standing to make.

## Decision

**A notice publishes two things about a delivery's life: the age it ripens at,
and how often the deployment sweeps the ripe ones away. The second is stated by
the deployment, and where it is not stated the notice says so rather than
leaving the first to be read as a deletion.**

`SweepNotice` in [`src/signals/notice.ts`](../src/signals/notice.ts), on
`CollectionNotice.sweep`:

```ts
type SweepNotice =
  | { readonly state: "stated"; readonly everyMs: number; readonly goneWithinMs: number }
  | { readonly state: "unstated" }
```

Five things decide its shape.

**1. The deployment states the interval, because nobody else can.** This is the
shape `CollectionSchedule` already takes for the operator's half of the same
fact (0274): *how late is late* is a number only the deployment knows, and a
framework that guessed would publish a ceiling nobody promised. It is read
where the rest of this deployment's intake settings are read (0317), as
`LOOM_SIGNAL_SWEEP_MS`, with a state for a value that could not be used.

**2. The published figure is a ceiling on the delivery's life, and the notice
derives it.** `goneWithinMs` is the ripeness window plus one sweep interval,
because a delivery is not counted until it ripens and then not until the next
run — the same addition `CollectionSchedule.foldsWithinMs` asks a deployment to
do in one number. Derived in one place so that a surface cannot print a ceiling
that disagrees with the age beside it, and **it is the number to hand the stall
check**: one stated interval, both halves of the question derived from it.

**3. Two states rather than a nullable number.** The ceiling is unreachable
where no schedule was stated, so a surface cannot print *gone within 70 minutes*
on a deployment that promised nothing. That is the one way this field could make
a notice overstate, and the type is what rules it out rather than a reviewer.

**4. Anything that is not a positive, finite interval is `unstated`.** A notice
may promise a reader less than the deployment knows and may never promise more,
so the safe direction for a value it cannot use is the weaker sentence. The
operator is the one who needs to hear that a value was refused, and
`describeSweepSchedule` is where they hear it — the same split 0317 made for the
window, and for the same reason: a disclosure is not the place to report a
configuration error.

**5. `describeBuffer` takes the retention whole**, as
`Pick<CollectionNotice, "bufferMs" | "sweep">` rather than a number. **A surface
cannot build the sentence out of the age alone**, which is what it could do
until today, and the age alone is the sentence this record exists to stop being
published. Where a schedule was stated the sentence ends on a ceiling a reader
can hold the deployment to; where none was, it says in as many words that
nothing here promises when a ripe delivery goes.

The intake status carries the operator's sentence beside the window's, because
the whole effect of this setting lands on somebody else's reading: no batch is
refused and no sweep is changed by it, nothing fails when it is unset, and
there is no other way for an operator to learn that their readers were promised
nothing. The sweep script prints it too, being the thing it is about.

**It is not a consent gate and it is not a step toward one.** A retention
ceiling is a fact about a buffer, and the buffer holds deliveries that are
anonymous and node-shaped (0146). Per-reader identity is parked; nothing here
assumes it ever returns.

## Consequences

- **A deployment can publish when a delivery goes**, not only when it ripens,
  and the number it publishes is one it stated rather than one the framework
  guessed.
- **A deployment that has stated nothing publishes a weaker sentence than
  before**, and that is the point: the sentence it published until today was
  stronger than anything it could keep.
- **One stated interval serves both halves.** `goneWithinMs` is the value
  `CollectionSchedule.foldsWithinMs` wants, so a deployment that states its
  cron gets a reader's ceiling and an operator's stall threshold from one
  number rather than keeping two in step by hand.
- **`describeBuffer`'s argument changed**, from `number` to the retention. Every
  caller in the repository is a test; the published surface moves, and a surface
  that printed the age without the sweep no longer compiles.
- **`IntakeSettings` has a required `sweep`**, so the two hand-built settings
  fixtures in the app's tests name it. Required rather than optional for 0316's
  reason: an optional field keeps the weaker path alive beside the sound one.
- **Nothing reaches a reader's browser.** `broadcast.ts` is byte-identical and
  the bundle measures 6,513 bytes, as it did before this. No payload field, no
  column, no migration, no store method, no new kind.
- **A third number now comes from the deployment's configuration**, where 0313
  said two. That record is not edited: what it decided about the two it named
  still holds, and this adds the third.
- **A stated interval is a claim nothing in this repository can check.** A
  deployment that states ten minutes and sweeps weekly publishes a false
  ceiling, and the material to catch it exists — §29 stamps the fold's own
  timestamp on the door row and judges a stall against a schedule (0274). Doing
  that in a notice would make it a reading, which 0313 refuses for a reason that
  still holds: a privacy page that cannot render while the database is down.
  Filed rather than built.

## Alternatives considered

**Leave it, and read `bufferMs` as a ceiling on the delivery's *age* rather than
on the wall clock.** The reading the field already documented, and free. Rejected
because it is a reading nobody who is not an engineer will take: *kept until it
is 60 minutes old* is heard as *gone in an hour*, and the gap between those two
is the whole of what a deployment with no cron is doing.

**The notice reports the last fold instead.** The honest, checkable version: §29
has the timestamp, so a notice could say *the last sweep ran at 14:05*.
Rejected on 0313's own ground — it would make the notice a reading, with a store
and a clock behind it, and a privacy page that fails to render when the database
is down is worse for a reader than one that publishes a stated interval.

**One combined number — the deployment states the ceiling directly.** Simpler to
publish and worse to configure: a deployment would have to add its ripeness
window to its cron interval by hand, and the two numbers it added would be the
window the notice already holds and the interval nothing else knows. A stated
ceiling below `bufferMs` is also incoherent and unfalsifiable from inside the
notice, where a stated interval cannot be.

**Take `CollectionSchedule` itself, as the stall check does.** Rejected because
that type carries `at` — the instant a reading is taken — and a notice has no
instant: it is a pure function of configuration, and a field that wanted a clock
would be the first one. The interval is the half of that type a notice can use,
and `goneWithinMs` hands the sum back.

**A separate `describeSweep`, leaving `describeBuffer` as it was.** The smaller
diff, and it keeps a trap: two sentences a surface has to remember to print
together, where printing only the first is exactly today's failure. The same
hazard was filed twice this month about arguments nothing reminds a caller to
pass, and a notice is the last place to leave one.

**Refusing the batch, or the sweep, on an unreadable interval.** Rejected:
nothing about collection depends on this value. A deployment that typed its cron
interval wrongly should not lose the deliveries a working sweep can still count,
and 0317 settled the same question for the window the other way round for the
opposite reason — that one *is* what the sweep runs on.
