# 0380. An hour's denominator is the page views of that hour and the one before, published beside the count and never summed

**Status:** Accepted
**Date:** 2026-11-11
**Section:** §5 (reader signals), the counters

## Context

[0362](0362-what-readers-did-is-counted-under-the-hour-they-did-it-in-as-a-seventh-counter-the-fold-writes-for-the-three-delegated-kinds.md)
put a clock on what readers did: presses, sends and openings, filed per part per
hour, so a goal's chart can be of a range rather than of all time. It draws
*nine presses at eleven o'clock*.

**Whether that is a good hour or a bad one is not in the bar.** Nine presses out
of twenty page views and nine out of five hundred are the same height. The
figure that tells them apart is a denominator per hour, and 0362 clause 9
refused one, for a reason this lane wrote down the same evening and still holds:
the two numbers are counted at different moments. A reader who arrived at 10:59
and pressed at 11:01 is in the eleven o'clock **numerator** and the ten o'clock
**denominator**. Over thirty days that error is two page views' worth of a
month; over one hour it is the whole of the figure, and in the shape where *a
press with no arrival* reads as an infinite rate rather than as a reader who
came in a minute earlier.

So the reading published hourly **counts**, which add honestly, and one quotient
over the range. The finding of 6 November (evening) recorded what the honest
shape would be if a per-hour figure were ever wanted — **a rolling
denominator**, the page views of the hour and the hour before — and named the
test to write first. This record takes that denominator and stops short of the
division, which is
[0381](0381-an-hourly-rate-is-the-quotient-of-the-rolling-pair.md)'s to argue
for.

## Decision

**An hour's denominator is the page views of that hour and the hour before it,
published beside the hour's count, with no quotient between them and no total
over them.** `actedAgainstOf` in `src/signals/acted.ts` is the reading;
`ActedAgainst` and `ActedAgainstHour` are its shape.

1. **The window is two hours wide, and that is where the boundary error goes.**
   An hour's doings came from readers who arrived in that hour or the one before
   it, which is where a page view that straddles the boundary actually was. The
   error 0362 clause 9 names is then *inside* the window rather than across its
   edge, and five presses in an hour with no arrivals of its own is a pair — five
   against the twenty readers who came in the previous hour — rather than five
   presses from nobody.

2. **It is never added up, and there is no total here to add.** Every page view
   is in two hours' denominators on purpose, so a sum of them over a day is
   about twice the day's page views. `ActedAgainst` therefore publishes no
   denominator total, and the test that holds it is the one this lane owes
   anything that counts (0158): twelve hours of ten page views each sum to 220
   across the pairs and 120 across the range, and the reading carries the first
   number nowhere. The range's own denominator is exact, and is already
   published once, as `ActedRate`.

3. **The numerator still adds, and the asymmetry is why this is a reading of its
   own.** Occurrences add (0368), so `count` is a sum over the hours and matches
   the series beside it. Denominators do not. Two fields on `ActedSeries` would
   have put a number that adds and a number that must not beside each other with
   nothing saying which was which; a reading whose whole docblock is that
   sentence says it where a caller is looking.

4. **A denominator the reading cannot speak for is withheld, never nought.**
   `views` is `number | null`. `0` is a real nought — page views were counted in
   both hours and there were none. `null` means the earlier hour is not one the
   arrivals series reached: the first hour of any range always, and every hour
   before page views were first counted. A nought there would read as *nobody
   was here* beside a count that says somebody acted, which is the one way this
   pair could be worse than no pair (0309, 0347).

5. **It pairs two readings, not two stores.** `actedAgainstOf` takes an
   `ActedSeries` and an `ArrivalSeries`, because the guarantee it needs is the
   one `readReaderActedRate` already makes — *one range, taken once, passed to
   both halves*. Handed two series a caller assembled over different ranges,
   every hour the arrivals series does not reach is withheld rather than divided
   by what was never read: a mismatch degrades to a pair the reading will not
   speak for, never to a number nobody can tell is wrong by looking at it.

6. **The pairing is taken inside the call that already holds both halves.**
   `ActedRateReading` gains `against`, so a screen drawing the counts and the
   denominators holds one answer about one range from one call and no second
   read. There is no new store method, no new table and no new request field.

7. **Nothing reaches a reader's browser and nothing new is collected.**
   `broadcast.ts` and its import graph are untouched; the bundle measures 7,543
   bytes minified and 3,350 gzipped, which is `main`'s figure. No payload field,
   no new kind, no view key: both numbers are counters this subsystem already
   kept.

## Consequences

- A surface can draw two bars an hour today — what readers did, and the readers
  who were there to do it — and say which hours had readers to lose. It cannot
  draw a rate per hour, which is 0381's to allow.
- **The first bar of any range has a count and no denominator.** The arrivals
  reading draws a series over the range, so the hour before the range is not in
  it. A caller who wants a denominator on every bar asks for a range one hour
  wider and drops the first bar. Filed, because the remedy is available to a
  caller and not to a screen reading `readReaderActedRate`.
- `@jam-overture/loom/signals` publishes three more names, 51 bytes of the
  names index's 148 remaining. 97 are left and the cap is `Loom docs`' to settle
  (#851 is held on it).
- Per-reader identity stays as far away as it was (deferred, 30 September). A
  pair here is two counts about an hour, with no key, no region and nothing per
  reader; the rolling window is arithmetic over two tables and remembers
  nothing between two readings.

## Alternatives considered

**The same hour as the denominator — the obvious quotient per bucket.** One
`Map` lookup instead of two. Rejected on 0362 clause 9's own reason, which this
record does not reopen: it is the shape where a press whose reader arrived a
minute before the hour divides by nothing.

**Two more fields on `ActedSeries`.** No new reading, no new names, and the
screen gets everything from one object. Rejected on clause 3: the counter that
adds and the counter that must never be added would sit on one row with nothing
distinguishing them, and the first surface to sum a column would publish a
deployment twice its size.

**A total denominator, published with a warning.** It would let a screen show
*the rolling denominators* as a figure. Rejected because a warning is not a
guard: the number would be wrong by construction, and this lane's rule is that
what counts is tested against the case where it double-counts rather than
annotated for it.

**Widening the arrivals read inside `readReaderActedRate` so the first bar has a
denominator too.** It is one hour more of rows and it would close the one gap
this reading leaves. Rejected for now because `readReaderArrivals` publishes a
series over the range it was asked for, and widening it here would mean either a
second read of the same counter or a second series on `ArrivalReading` whose
range differs from the one the screen asked about — both of which are a shape
decision about the arrivals reading rather than a corner of this one. Filed.

**Taking the pair from the stored rows rather than from the two series.** It
would have given the first bar its denominator for free, since the store is
already read from the start of the earlier period. Rejected on clause 5: a
`StoredArrivals` carries no statement of the range it answered, so a caller who
read only the range would get a denominator deflated by an hour it never asked
for — and that under-read is undetectable from the rows, where a short series is
not.
