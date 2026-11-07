# 0364. A new server waits for its first pull before it serves, and never waits again

**Status:** Accepted
**Date:** 2026-11-07
**Section:** §1, §5 (portal), the connection plane

> **Why this number.** `0363` is the highest on `main`, and no open pull request
> adds `0364`.
>
> **Why `Accepted`.** The maintainer asked for it in as many words on 7 November:
> *"We have to make sure that we are serving back the files in a timely manner
> to try and eliminate, to as much as possible, the flip from base to server
> returned version. The delay can be fine until the first version returns"*,
> and *"shouldn't the fallback only be when the page is unresponsive, not by
> some arbitrary timeout."* It partially supersedes clause 2 of
> [0361](0361-the-site-pulls-into-its-own-process-and-a-host-wires-the-live-page-in-two-calls.md),
> which he also accepted.

## Context

[0361](0361-the-site-pulls-into-its-own-process-and-a-host-wires-the-live-page-in-two-calls.md)
made the pull run beside the render path: a render reads whatever the server
holds, and before the first answer that is nothing, so the page is served as it
was built. On a host that starts servers on demand, every new server serves the
page as built for its first few seconds and the live page afterwards. A reader
who lands in that window sees one page, reloads, and sees another, without
anyone having approved anything in between.

That is the same failure that made loomjs.org flip on 7 November
([0363](0363-the-marketing-site-is-served-from-its-code-and-a-stored-row-is-not-a-second-version-of-it.md)):
two versions of a page, and timing deciding which one a reader gets. For a
customer it is worse, because the version they lose is the one they approved.

## Decision

1. **The loop answers `ready()`, and a render awaits it.** It resolves with what
   is held once the server's first pull has settled. From then on it resolves at
   once, every time. `held()` stays, for a caller that would rather have the page
   as built than wait at all.

2. **A pull that fails ends the wait at once.** A refused connection, an error
   status or an unreadable answer settles the first pull, and the render serves
   the page as built straight away. Nothing is waited out when Loom has already
   said no.

3. **Only silence is bounded, at 5 seconds** (`DEFAULT_FIRST_WAIT_MS`,
   `firstWaitMs` to change it). A server cannot tell a slow Loom from a hung one
   without a limit, and a render with no limit could hang for ever. The bound is
   set high enough that only a Loom that is down reaches it. It starts when the
   first render asks rather than at boot, so it limits what a reader waits.
   When it is reached the pull carries on, and its answer is held for the next
   render.

4. **No loader.** These pages are rendered on the server, so the server holds
   the response until the live page is known and sends it once. A reader sees
   the right page on first paint.

## Consequences

- The first reader on a new server waits for one round trip to Loom. Everyone
  after them is served from what the server holds, as before.
- A reader only ever sees a different page when somebody approved a change, or
  when Loom was down as their server started.
- 0262's line that Loom is not in the render path now holds after a server's
  first answer, not before it. A Loom outage makes a cold server's first render
  up to 5 seconds slower. It still never makes it fail.
- Hosts wiring the pull change one line: `livePageOf(await live.ready(), id)`
  in place of `livePageOf(live.held(), id)`.

## Alternatives considered

**A loader on the first load, swapped for the live page when it arrives.** This
was the maintainer's first suggestion. It suits a page rendered in the browser.
These pages are rendered on the server, where a loader means sending an empty
page first and a second one after, so the reader still watches the page change,
search engines index the loader, and the first paint gets later rather than
earlier. Waiting on the server gives the same guarantee with one paint.

**Fall back only on an error, with no time limit at all.** That is the strict
reading of *"only when the page is unresponsive"*. A Loom that accepts the
connection and never answers raises no error, so the render would wait as long
as the host lets a request run and then fail. The 5-second bound is the
smallest thing that turns that hang into a served page.

**Pull at boot and hold requests until it lands.** The same wait, but paid by
whichever request arrives first after boot whether or not that page has a live
version, and impossible on hosts that do not expose a boot hook. Waiting inside
`ready()` puts the cost on the render that needs the answer.

**Keep 0361 and accept the flip.** The window is a few seconds per new server.
On a host that starts servers on demand it happens after every quiet spell,
and the reader who sees it is the one the approved change was for.
