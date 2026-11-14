# 0395. The pin is a decimal in one first-party cookie, and a window the client cannot read keeps the last whole pull

**Status:** Accepted
**Date:** 2026-11-14
**Section:** §1, the connection plane

> **Why this number.** `0393` is the highest on `main`. Two open branches both
> claim `0394` — `framework-98` (the space a tag swallowed) and `signals-89`
> (what fixing a silent component was worth) — so this takes `0395` rather than
> adding a third claim to a number already contested.

## Context

[0383](0383-a-reader-keeps-the-pages-they-first-saw-for-a-window-the-project-sets-and-their-browser-holds-one-number-many-readers-share.md)
is Accepted and both of its halves are now built. The portal's half landed on
13 November: *Settings* keeps each project's window, and the read door answers
`window` beside the pages — `{ ms: 0 }` for *Off*, or `{ ms, floor, number,
held }` where readers are held.

Its consequences filed the client half for this lane: *"Two pure functions
beside `livePageOf`: one reads the pin from a request's `Cookie` header and the
held pages, and answers the tree to draw; one answers the `Set-Cookie` value for
a reader with no pin."* That is what `src/live/window.ts` is.

0383 decided the shape, the choices, the cookie's flags and what an unresolvable
pin does. It did not decide four things that a site's readers will live with,
and two of them are expensive to change once sites are deployed.

## Decision

1. **The cookie is named `loom_pin`, and that name is part of the published
   contract.** `PIN_COOKIE` is exported so a host never spells it, and
   `pinCookieFor` is the only thing that writes it. Renaming it later loses the
   pin of every reader who holds one — they become readers with no pin, are
   given a fresh one, and are moved to the newest pages in the act. So it is
   decided here rather than left to a constant somebody tidies.

2. **A pin is read only in the one spelling this client writes**: digits, no
   sign, no point, no exponent, no leading zero. Anything else under our name
   is a reader with **no** pin, who is therefore given one.

   This is not fussiness about input. `Number("")` is `0`, and `0` is a pin
   below every floor rather than the absence of one — the difference between
   serving a reader the newest page and handing them a pin they never had.
   `Number("1e3")` is 1,000, a pin that resolves against versions it was never
   taken at. A cookie under our name holding either was not written by
   `pinCookieFor`.

   **Reading the pin and resolving it are two functions on purpose.** A pin
   below the floor is a reader who *has* one and must never be given another
   (0383 clause 3); a cookie holding a word is a reader who has none and gets
   one. Those are opposite acts, so the syntactic question is `pinIn`'s and the
   resolvable question is `livePageOf`'s.

3. **The expiry is `Max-Age`, and the function has no clock.** 0383 clause 3
   says the expiry is set once, to the window from first sight, and never
   extended. `Max-Age` is counted from when the reader's browser receives the
   response, which is first sight exactly, so the window cannot be lengthened or
   shortened by the server's clock drifting from the reader's — which is what
   `Expires` is compared against. It also leaves `pinCookieFor` a pure function
   of what the last pull brought, with no `now` to be wrong about. A window that
   rounds to under a second sets no cookie rather than `Max-Age=0`: both hold
   the reader for no time, and a cookie dead on arrival is a thing somebody has
   to explain.

4. **A `window` the client cannot read refuses the whole pull.** An answer with
   **no** `window` is *Off* — that is a door from before 0383 and a true
   statement about it. An answer *carrying* one that this version cannot read
   keeps the last whole pull, costs freshness, and says why in the log, exactly
   as an unreadable rule list already does (0392).

   Reading it as *Off* was the cheap branch and it is the wrong one: it would
   serve a pinned reader a page **newer** than the one they were pinned to,
   which is the flip 0383 exists to remove, and it would do it silently. Within
   the pull's own rule — freshness fails, never the page — holding every reader
   on what they had is the reading that keeps both.

5. **The version served is the one with the earliest `until` after the pin,
   not the first in the list.** The door answers a page's versions oldest first
   and both readings agree on an ordered list. Reading the order would make what
   a reader is served depend on it, and the cost of a list that arrived out of
   order is a reader served a newer page than their pin — the same fault as
   clause 4, one layer down. The order-free reading costs one comparison.

6. **The window's type is `LiveWindow`, because `ReaderWindow` is taken.**
   `src/signals/` publishes a `ReaderWindow` at `@jam-overture/loom/signals`
   and it is an unrelated thing — a range a signal reading is taken over. The
   first draft of this work called the door's window `ReaderWindow` too, and
   the documentation lane's own check caught it: that site has a test asserting
   that `horizonOf` is the **only** name published at two doors, and it went
   red naming this one.

   `LiveWindow` is what the portal's half already calls the same shape, and it
   is the vocabulary of the rest of this door — `LivePages`, `livePageOf`,
   `LivePageRules`, `LivePageForms`. One name for one thing on both sides of
   the pull, and no name meaning two.

7. **The pin is an optional argument to `livePageOf` and `pageForReader`, not a
   second pair of calls.** A host asks one question per page — *what do I draw
   for this reader* — and a window must not add a call to remember on every
   page. 0361's two calls stay two; a project with a window adds two lines, one
   to read the pin and one to set the cookie, and a project with no window adds
   none.

## Consequences

- **`@jam-overture/loom/live` publishes six more names**: `PIN_COOKIE`,
  `pinIn`, `pinCookieFor`, `WINDOW_OFF`, and the types `LiveWindow` and
  `HeldVersion`. `LivePages` gains `window`, and the `fresh` pull outcome gains
  it too.
- **Nothing a site already runs changes.** Every project's window is *Off*
  until somebody chooses otherwise (0383 clause 1), a door from before the
  window reads as *Off*, and a host that passes no pin gets exactly what it got
  before. The window costs a reader nothing until a project asks for it.
- **A host that honours a pin renders per request**, and a shared cache in
  front of it must vary on the cookie — which 0383 already says, and which is a
  handful of values rather than one per reader.
- **`loom_pin` is now a name loomjs.org's `/what-you-run` sentence is measured
  against.** That page says the site sets no cookie, and it is true while the
  deployment's window is *Off* (0383 clause 7). Filed for `Loom marketing` as a
  finding rather than changed here.

## Alternatives considered

- **`Expires` with an HTTP date, or both `Expires` and `Max-Age`.** `Expires`
  is the older spelling and is compared against the reader's own clock, so a
  reader whose clock is a day fast is held for no time and one a day slow is
  held for two days. Sending both is two spellings of one fact where the
  second adds a failure mode and no reach: every browser in use honours
  `Max-Age`, and it takes precedence where both are sent.
- **Read the pin with `Number` and accept whatever parses.** One line shorter
  and it accepts `1e3` as a pin, `0x10` as a pin, and the empty string as `0`.
  Each of those is a reader resolved against a number they were never pinned
  at, and the empty one is the common case: a cookie cleared to nothing.
- **Read an unreadable `window` as *Off*.** The branch that never costs
  freshness, and the one that silently un-pins every reader of a deployment
  whose door is a version ahead. Refused in clause 4.
- **A `pinnedPageOf` beside `livePageOf`.** Closest to 0383's wording of *two
  pure functions*. It makes the pin a question a host asks separately from
  *what do I draw*, so a page that forgets the second call serves a pinned
  reader the newest page and nothing says so. Folding the pin into the one call
  makes forgetting it impossible to do by halves.
- **A cookie holding the pin and the window's length**, so the client could
  detect a shortened window. Nothing reads it: 0383 sets the expiry once and
  never extends it, so a window changed after a reader was pinned applies to
  them when their cookie runs out and not before. It would also make the value
  distinctive, which is the direction 0146 refuses.
- **Calling the window `ReaderWindow`.** The name the record that asked for
  this work uses in prose, and the name the first draft shipped. It is already
  published, at another door, for another thing. Refused in clause 6, and the
  reason it is written down rather than quietly fixed is that the open finding
  of 24 September — *one exported name means two different functions at two
  doors, and nothing in the package says so* — is about the one collision this
  package already has. A second would have made the band on that page a list.
- **Keeping the window out of `LivePages` and passing it to each call.** It
  arrives in the same answer as the pages and its `number` and `held` versions
  are only meaningful beside them, so holding it anywhere else is a way for one
  pull's window to meet another pull's pages (0371 clause 4's reason, one field
  across).
