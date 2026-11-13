# 0383. A reader keeps the pages they first saw for a window the project sets, and their browser holds one number many readers share

**Status:** Accepted
**Date:** 2026-11-11
**Section:** §1, §5 (portal), the connection plane

> **Why this number.** `0380` is the highest on `main`; open branches claim
> `0381` (signals, the rate by the hour) and `0382` (signals, the part that was
> on screen), so this takes `0383`.
>
> **Why `Accepted`.** The maintainer asked for this to go into the plan on
> 11 November, and on 13 November accepted it as proposed: *"867 and 869 seem
> okay to move forward, unless there is something i am missing."* That takes
> the choices, *Off* as the default, and the cookie of clause 3.

## Context

Since [0358](0358-an-accepted-change-goes-live-from-the-portal-and-the-site-pulls-it-with-no-pull-request.md),
a change goes live when a person presses *Accept* and the site's server next
pulls, about a minute later
([0361](0361-the-site-pulls-into-its-own-process-and-a-host-wires-the-live-page-in-two-calls.md)).
Nothing reaches readers on signals alone. But nothing holds a reader to the
page they were reading either. A reader who opens the home page, goes to the
docs, and comes back can find a different home page if a pull landed in
between. [0364](0364-a-new-server-waits-for-its-first-pull-before-it-serves-and-never-waits-again.md)
fixed the same flip for a new server; this is the flip after it.

The maintainer, on 11 November:

> *"The user should be able to configure how quickly a loom page can
> reconfigure itself. For example if I'm a user and it is set to immediately
> reconfigure, if loom gets enough signals and thinks a change is appropriate
> and I say navigate away from the home page to docs and then back to the home
> page, then the home page may be completely different. But maybe I cache the
> changes and only update once an hour or once a day."*

He agreed (*"That makes sense. Let's add it to the plan."*) to the shape
recommended back to him: the window is how long **one reader** keeps what they
first saw, not how often the site takes changes. New readers get the newest
accepted version at once.

Remembering what a reader saw means keeping something on their device. That
runs into three things already written down: [0146](0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md)
(no visitor id, nothing that makes a reader followable), [0262](0262-the-control-plane-is-hosted-and-the-render-path-stays-in-the-customers-app.md)
(Loom never learns who a reader is), and loomjs.org's own sentence on
`/what-you-run`: *"It does not know who you are, set a cookie, or send any of
it anywhere but the server you are already talking to."* This record says what
is kept, where, and why it stays inside all three.

## Decision

1. **Each project sets a window on *Settings*: *Off · 1 hour · 1 day ·
   7 days*.** *Off* is today's behaviour: every page view reads the newest live
   page. **The default is *Off***, because a window puts a cookie on the
   customer's readers' devices (clause 3), and that is the site owner's choice
   to make and to disclose, not Loom's to make for them. Seven days is the
   ceiling because it bounds what a server holds (clause 5).

2. **What a reader keeps is the site, not one page.** A reader's first page
   view under a window pins them to the project's live pages as they stood at
   that moment, and every page they read until the window runs out is drawn as
   it stood then. One pin for the whole site means a reader never sees a new
   home page beside an old docs page that a change on the home page assumed was
   gone, and it means the pin is one number rather than one per page.

3. **The pin is one number, and many readers share it.** Loom numbers each
   state of a project's live pages: every accepted change, revert and newer
   snapshot that goes live advances it by one. The pin is that number at the
   reader's first page view, kept in a first-party cookie the customer's own
   server sets (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`), with its
   expiry set once to the window from first sight and **never extended**. A
   cookie renewed on every visit would hold a daily reader on one version for
   ever. Every reader who arrived between the same two changes carries the same
   value, so it is not a reader id, not 0146's view key, and nothing joins on
   it. It never goes to Loom: signals already say which revision was drawn and
   carry nothing new, and the pull still carries the project's key and nothing
   about readers (0262, 0358 clause 3).

4. **Only Loom's own changes are held.** A newer snapshot from the site
   (0358 clause 6) and an accepted revert (8c, *Propose reverting*) each raise a
   floor, and a pin below the floor reads the newest pages. The site's own
   deploy may change the components a page is drawn with, so an older tree is
   not promised to draw under newer code; and a revert is usually a change
   somebody wants gone from every reader now. A window delays what Loom
   proposed, never what the site or a person withdrew.

5. **The pull hands the site what a pin needs, and an unreadable pin reads the
   newest.** The read door's answer grows by the window, the floor, and, for
   each page, the versions live inside the window with the number each became
   live at. The server holds them in process as it holds the live pages now;
   seven days of a page's versions is the most it ever holds. A pin the server
   cannot resolve (malformed, from before anything it holds, below the floor,
   or with no window set) reads the newest live page, and with none the page as
   built. Freshness is what fails, never the page (0358 clause 4).

6. **A held change is measured from when the last held reader has moved on.**
   With a window, returning readers keep the old version after *Accept* while
   new readers get the new one, so the hours after *Accept* are not like the
   hours before. The before side reads the old revision up to *Accept*; the
   after side reads the new revision only, from when the window has run out
   after it went live. Under *Off* nothing changes. This amends 0358 clause 7
   for a project with a window, and the counters already split by revision
   (`arrivals.ts`, `acted.ts`), so it is a change to which hours are read, not
   to what is counted.

7. **A project that sets a window is told what it puts on readers' devices.**
   *Settings* says it in a sentence beside the choice, and gives one to paste
   into the site's privacy notice. loomjs.org stays *Off* until the pull
   request that turns it on also changes the sentence on `/what-you-run`.

## Consequences

- **Framework (`src/live`).** Two pure functions beside `livePageOf`: one reads
  the pin from a request's `Cookie` header and the held pages, and answers the
  tree to draw; one answers the `Set-Cookie` value for a reader with no pin.
  The host wiring stays the two calls of 0361 plus those two lines. This is
  framework code, filed for `Loom daily build` once the record is accepted.
- **A page that honours a pin reads a cookie, so it is rendered per request.**
  A shared cache in front of it must vary on the pin, which has as many values
  as there were changes inside the window, so a handful rather than one per
  reader.
- **Portal.** A window column on the project, which needs `pnpm db:push`; the
  choice and its sentences on *Settings*; the door's larger answer; and the
  *Accept*-to-live timeline gains *Held for returning readers until …* between
  *Live* and *Measuring*.
- **Audiences.** Selection for an audience (0263, 0376) happens after the pin,
  against the version the pin chose, in the customer's process as now.
- **Whether a window needs a reader's consent** under the EU's cookie rules is
  not settled here. A cookie that keeps a site from changing under a reader may
  be *strictly necessary* or may not; that is the site owner's call with their
  own advice, which is the reason for clause 1's default and clause 7's
  sentences.

## What this does not change

- **0146 holds.** No visitor id, no device id, nothing that would identify a
  reader when joined with something else. The pin is shared by everyone who
  arrived between the same two changes and is never sent with a signal.
- **0262 holds.** Loom is not asked per reader and does not learn who reads.
  The pin is read and written by the customer's server, on its own domain.
- **0358's other clauses hold.** *Accept* is still the last human step, and a
  new reader gets an accepted change on the site's next pull.

## Alternatives considered

- **A site-wide timer: take accepted changes once an hour or once a day.** The
  maintainer's first framing, and it needs nothing on a reader's device. It
  still flips a page under a reader who is on the site when the hour turns, so
  it makes the problem rarer rather than gone. It also holds every new reader
  back for no reason, so changes collect readings more slowly and results take
  longer, and everyone switching at one moment puts a cliff in the middle of
  every measurement.
- **Only take changes at a quiet hour, such as four in the morning on the
  site's clock.** No storage, and few readers see a flip. It is still a flip
  for the night reader, it can delay a change by up to a day for nobody's
  benefit, and a site read across time zones has no quiet hour.
- **One pin per page rather than per site.** Closest to *"the version of a page
  they first saw"*. It lets a reader see a new home page next to an old docs
  page, it needs a cookie holding a list rather than a number, and a list of
  versions across pages is more distinctive than one shared number, which is
  the direction 0146 refuses.
- **Hold for the visit only, with a cookie that ends when the browser closes.**
  Smaller, and it answers the example exactly. Browsers that restore sessions
  keep such cookies for weeks, so the window would be whatever the browser
  decides, and a reader who comes back tomorrow, the maintainer's own second
  case, would not be covered.
- **Keep the pin in `localStorage` and choose the version in the browser.** No
  cookie header, but the server has already drawn the page by the time the
  browser can say which version it wants, so the reader sees the newest page
  and then a swap, which is the flip this record exists to remove.
- **Default the window to one day.** Better for readers on the day a project
  connects. Refused as a default because it would set a cookie on every
  customer's readers before the customer had chosen to, and loomjs.org says in
  as many words that it sets none.
