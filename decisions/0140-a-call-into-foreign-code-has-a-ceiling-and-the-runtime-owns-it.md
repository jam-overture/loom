# 0140 — A call into foreign code has a ceiling, and the runtime owns it

**Status:** Accepted
**Date:** 2026-09-13
**Section:** §2 (interpretation), §4c (the data seam)

## Context

Loom awaits somebody else's code in exactly three places: it asks a
`ModelClient` what to change, it asks a `DataAdapter` to answer a binding, and it
asks a `SubmissionEndpoint` where a form posts. All three seams are careful about
failure. `ModelClientError` has five members, split apart on day 37 precisely so
a host is told which actor has to act. `SourceFailure.unavailable` is documented,
in as many words, as *"a timeout, a dead connection"*, and
`SubmissionFailure.unavailable` as *"a token store that is down, a dependency
that timed out"*.

**None of the three could produce a timeout, because nothing in the runtime ever
stopped waiting.** A call that hangs was not one of the failure modes; it was the
absence of all of them.

That is the worst failure mode to be missing, because it is the only one with no
sentence anywhere. `Loom portal` filed it on 4 September after losing most of a
run to it:

> Screenshotting any portal screen that needs real data means running
> `next start` and typing into the real prompt box. In this sandbox that hangs,
> silently, with nothing in the server log and the button stuck on *"Working on
> it…"* until the harness gives up.

The cause there was environmental and instructive: Node's `fetch` does not read
`HTTPS_PROXY`, so behind a proxy the request is not refused — it is never
answered. That is not an exotic condition. It is what every misrouted socket,
every dropped connection with no RST, and every integration having a genuinely
bad afternoon looks like from inside the runtime.

The two render-time seams had a second, sharper version of the same gap. Both
`resolveDataPlan` and `resolveSubmissionPlan` ask every question in a plan at
once, and both state the property that buys in their own module comments:

> one integration having a bad afternoon costs one region of the page rather
> than the page.

> a token store having a bad afternoon costs the forms on the page rather than
> the page.

`Promise.all` makes both false for a hang. One adapter or one endpoint that never
settles held the whole render — not its own region — and produced no diagnostic,
because nothing had decided it had waited long enough to call it unavailable.
There is a test in this repository named *"costs one region of the page when one
source is down, not the page"*, and it passed throughout: *down* there means an
adapter that **returns** a failure. Nothing had ever asked what a page does when
an adapter simply does not come back.

## Decision

**Every await into foreign code has a ceiling, the runtime sets it, and reaching
it is an ordinary value in the vocabulary the seam already has.**

`src/deadline.ts` is the mechanism and it is about twenty lines: `withCeiling`
races the attempt against a timer and answers with the caller's own expiry value,
`ceilingOf` takes a caller's number or a default, `describeCeiling` says a
duration the way somebody would say it.

- **Interpretation.** `modelInterpreter` bounds every call it makes —
  `interpret` and `repair` both, since they share one call path. The default is
  `DEFAULT_INTERPRETER_CEILING_MS`, three minutes, overridable per deployment
  with `ceilingMs`. An expiry is `{ code: "unavailable", detail: "no reply in
  3m" }`, which the interpreter already maps to `interpreter-unavailable`.
- **The data seam.** `resolveDataPlan` bounds each source independently. The
  default is `DEFAULT_SOURCE_CEILING_MS`, ten seconds, overridable with
  `ceilingMs`. An expiry is `{ reason: "unavailable", detail: "no answer in
  10s" }` against that request's own key, so the page renders with a diagnostic
  in one region.
- **The submission seam.** `resolveSubmissionPlan` bounds each endpoint
  independently, at `DEFAULT_ENDPOINT_CEILING_MS`, also ten seconds and also
  overridable. The seam's documentation says resolution *"is allowed to be
  slow"* — a CSRF token minted per request against a store is exactly what that
  budget is for — and that is unchanged. What it is no longer allowed to be is
  unbounded.

**The ceiling is enforced above the vendor, not inside it.** It sits in
`modelInterpreter` rather than in `anthropicModelClient` because the promise is
to a caller of the interpreter: a host that brings its own `ModelClient` — which
the seam exists to allow — gets the same bound without having written one. The
Anthropic adapter's only new job is to forward the signal.

**An expiry aborts what it walked away from.** `ModelCallOptions.signal`,
`SourceRequest.signal` and `EndpointRequest.signal` carry an `AbortSignal` into
the implementation. Walking
away from a promise does not stop the work behind it, so without this a
deployment leaks exactly the connections it has already given up on. An
implementation may ignore the signal and the answer still arrives on time; what
it loses by ignoring it is the socket.

**There is no way to switch a ceiling off.** `ceilingOf` treats `undefined`,
`NaN`, `Infinity`, zero and negatives as "not a ceiling" and substitutes the
default. A caller that wants to wait twenty minutes names twenty minutes, which
is a number a reader of the call site can see; `undefined` meaning *forever* is
not.

## Consequences

- **No new reason code, at either seam.** `unavailable` already means "ask again
  later, nobody has to act", which is exactly right for an expiry and is what
  both seams' own comments said a timeout would be. Adding a member would also
  have broken two exhaustive `Record<DataUnavailable["reason"], …>` maps in
  `(docs)`, which is another lane's file — a good reminder that a closed set the
  surfaces walk is not free to grow.
- **Three surfaces are fixed without being touched.** `(portal)`, `(demo)` and a
  `(docs)` fence all construct `anthropicModelClient(new Anthropic(…).messages)`
  and pass it to `modelInterpreter`. Because the bound is in the interpreter and
  defaulted rather than required, every one of them is bounded now and none of
  their code changes.
- **A slow deployment can now fail where it used to succeed.** An interpretation
  that genuinely takes longer than three minutes, or a query that takes longer
  than ten seconds, is reported as unavailable rather than waited out. That is the
  trade being made deliberately: a bound that is never reached is a bound nobody
  can rely on, and both numbers are one config field away from being different.
- **`SourceRequest` and `EndpointRequest` each gained a required field.**
  Adapters and endpoints receive the request and do not construct it, so nothing
  in the repository broke; a host that constructs one in a test of its own will
  need to add `signal: undefined`.
- **The ceiling is not a retry and does not become one.** Reaching it produces a
  reportable failure and stops. Whether to ask again is the caller's, which is
  what the `unavailable`/`rejected` split was made for.

## Alternatives considered

**Pass the timeout to the SDK and stop there.** The Anthropic SDK takes a
`timeout` in its request options, so `anthropicModelClient` could have honoured
one in four characters. Rejected as the whole answer: it binds the one client
Loom ships and leaves every host-supplied client — the case the seam is designed
around — able to hang the page. It is worth having as well, and the forwarded
signal is that, by a route that works for any implementation.

**A `timed-out` member on each failure union.** More precise, and it would let a
deployment count "slow" separately from "down" — which is a real operational
distinction. Rejected for now on the cost of growing a closed set the surfaces
walk: two `Record` maps in `(docs)` would go red, in another lane's file, to
distinguish two states with the same remedy and the same actor. The detail string
carries the distinction in the meantime. Worth revisiting when something actually
wants to count them apart.

**A ceiling per plan rather than per source.** One budget for the whole render
reads tidier and is what an HTTP client would do. Rejected because the questions
are independent by construction: a shared budget makes a page's regions compete,
so five quick sources lose their answers to whichever slow one was measured
first — which is the failure this decision is closing, rearranged. The same
argument rejects one budget shared between the data and submission seams, which
a page resolves as two separate steps.

**Leave it to the host.** Every host can wrap its own client and its own
adapters, and a framework that bounds things for you is a framework you argue
with. Rejected because the evidence is that hosts do not: three surfaces in this
repository, all written by routines that had read the seam, none of them bounded,
and the one that hit it spent a run finding out why. A default that can be
changed is a better answer than a promise nobody keeps.

**A `Clock`-driven ceiling, injectable like the runtime's other time.** The
runtime takes a `Clock` everywhere it stamps a revision, and consistency argues
for the same here. Rejected because a clock reads a time and a ceiling needs a
timer, which is a different capability; the tests get their determinism from
orders of magnitude — a promise that never settles against five milliseconds —
rather than from a seam that exists only for them.
