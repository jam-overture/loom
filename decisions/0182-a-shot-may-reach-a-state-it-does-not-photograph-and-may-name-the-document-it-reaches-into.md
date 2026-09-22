# 0182. A shot may reach a state it does not photograph, and may name the document it reaches into

**Status:** Accepted
**Date:** 2026-09-22
**Section:** §1 (process)

## Context

[0159](0159-an-instrument-may-reach-a-state-and-may-never-assert-one.md) drew
the line this record is an application of — *an instrument may reach a state and
may never assert one* — and closed by naming what it had deliberately not built:

> What is still not offered, and is a finding rather than an omission if a lane
> wants it: typing into a field, hovering, scrolling to a position, and any wait
> that is for a *condition* rather than a duration.

Three lanes have now asked, in four findings, and every one of them is on the
reach side of the line:

| filed | lane | what it could not photograph |
| --- | --- | --- |
| 18 Sep | `Loom demo` | anything inside the frame the front door puts `/demo` in |
| 19 Sep | `Loom docs` | a search box with a query in it |
| 14, 19, 21 Sep | `Loom portal` | every screen in `(portal)`, because all of them are behind a session |

The cost is not that the pictures were missing. Every one of them was taken —
by a Playwright script written inside the run, against flags and a viewport
copied from the harness rather than taken from it, and deleted at the end of
it. That is the arrangement
[0116](0116-a-screenshot-is-taken-by-the-repository-and-playwright-is-never-a-dependency.md)
and [0117](0117-one-harness-two-subjects-a-tree-it-renders-and-an-address-you-serve.md)
exist to stop being normal, and the portal lane has now done it **six
consecutive runs** in a row. What is lost each time is reproducibility: no
picture taken that way can be retaken from anything in the repository, which is
the one property the harness exists to give.

The portal's ask is the one that shows what was actually missing, because it is
not a step. Signing in is *an address, visited, typed into and pressed, before
the address you want a picture of* — and a shot has one address by construction.
Every shot opens its own browser context, which is what keeps one picture from
depending on the one before it, and is also exactly why a session established
by a previous shot is not there for the next.

## Decision

**A shot may reach a state it does not photograph, and may name the document it
reaches into.** Four additions, none of which observes an outcome:

- **`{ fill: <selector>, text: <string> }`**, the step 0159 named first. An
  empty `text` clears the field, because a cleared field is a state a screen is
  in.
- **`{ waitFor: <selector> }`**, a step rather than only a property of the load.
  This is 0159's fourth item resolved the way 0159 said it resolves: *"wait
  until the selector appears" is `waitFor` and already exists*, while *"wait
  until the count is 3"* is an assertion wearing a wait's clothes and is still
  refused. The harness never reports whether the selector appeared; it fails the
  shot, exactly as the shot-level `waitFor` already did.
- **`frame` on an approach**, a selector naming the browsing context that
  approach's selectors are resolved against — `waitFor`, every step, and `clip`.
- **`before` on a shot**: one approach, made in the shot's own context, before
  its own address is opened, and never photographed.

`before` is what makes a session reachable, and it is deliberately **not** a
`signIn` step. The harness does not know what a password is, what a portal is,
or that the thing it just pressed signed anybody in. It opens an address, types,
presses, waits for the thing the lane named, and the cookie the server set is
still in the context when the shot's own address opens. A lane that signs in
with a magic link, a header or a seeded cookie writes a different `before` and
changes nothing here.

`Approach` is therefore the type, and `Shot` is an approach with a camera on the
end. The `before` and the shot itself go through one function in the capture
loop, because they are the same thing done twice and only one of them ends in a
photograph.

**One rule for `frame`, with no exceptions**: it is the document this approach's
selectors resolve against. It does not apply to `fullPage` or to the viewport
shot, and that is not an exception — a frame is not a page, and *all of the
page* means the page. Only a selector can be resolved somewhere else.

## Consequences

The adapter now resolves **every** selector to a locator before doing anything
with it. `page.click(selector)` and `page.waitForSelector(selector)` have no
frame-shaped counterpart and a locator does, so the older spelling was the
reason a frame would otherwise have been a second code path beside each call
rather than one field. Three call sites — the load's wait, every step, and a
clipped capture — go through one `locatorFor(frame)`, so they cannot disagree
about what `frame` means.

**Navigation is pinned in the top document only**, and a lane has to know it. The
capture-phase listener that refuses anchor navigation for the duration of a step
list is added by `page.evaluate`, which does not reach inside a frame — so a link
pressed in a framed approach still navigates that frame. The `waitFor` step is
how such a shot re-synchronises with the document it landed in. This is stated
rather than fixed because fixing it means reaching into frames the seam
deliberately does not model.

**The shot object is now `strict`.** A misspelled `frame` or `before` on a
permissive object is dropped in silence and what comes back is a correct
picture of the wrong thing — the exact failure the step union has been strict
about since it was written, and now reachable one level up because there are
fields up there worth misspelling.

**A `before` costs one extra page load per shot**, every shot, because contexts
are per shot. That is the price of pictures that do not depend on their
neighbours, and it is the right way round: a shot list of eight screens behind
one session signs in eight times and each of the eight can be re-run alone.

What is still not offered: hovering, scrolling to a position, an `initScript`,
and anything that reads a value out of the page. The first two are reaches and
would fit this record the day a lane asks. The third is
[the 17 September finding](../FINDINGS.md) and is the one with a posture problem
— it runs code it is handed, which is the shot-list-as-program that 0159
rejected — and it stays open.

## Alternatives considered

**A `signIn` step.** Rejected, and it is what the portal lane actually asked
for. It would put one deployment's authentication shape inside the shared
instrument: a selector for the email field, one for the password, one for the
button, and a guess about what to wait for. Every other lane would carry it and
none would use it, and the first sign-in that is a magic link would need a
second member beside it. `before` + `fill` says the same thing with nothing in
it that knows what a session is.

**One browser context shared by every shot, so a sign-in persists.** Rejected.
It makes each picture depend on the shots before it — the property that makes a
one-shot re-run reproduce what a full run produced — and it does not even work
across viewports, since a context carries one. The extra load per shot is worth
more than it costs.

**`before` as a list of approaches rather than one.** Rejected as designed
against no requirement. One address is what all four findings need; a lane that
needs two can file for it, and a field that is a list from the start is a field
every reader has to reason about being empty, being one, or being many.

**`frame` on each step rather than on the approach.** Rejected. The finding that
asked offered both. Per-step is strictly more expressive and the expressiveness
is not wanted: a shot list that presses one thing in the top document and the
next inside a frame is a journey, not a picture, and `waitFor` would still have
needed its own field. One field per approach covers the case and keeps the rule
statable in a sentence.

**A `waitFor` step with a timeout a lane sets.** Rejected. The ceiling is
0159's, which is
[0140](0140-a-call-into-foreign-code-has-a-ceiling-and-the-runtime-owns-it.md)'s
applied to an instrument: a harness that hangs reports nothing at all, and a
merge gate that hangs is indistinguishable from a merge gate that is slow. The
driver's own 30-second default is already exactly the `wait` ceiling, so a shot
cannot wait longer for a condition than it can for a duration.

**Letting a shot run a Playwright snippet, and closing all four findings at
once.** Rejected for the third time, and recorded again because this is the run
where it would have been cheapest. It is the current situation with the file
moved: what a lane writes in `/tmp` today it would write in a JSON string
tomorrow, unreviewed either way, and the shared flags would drift again the
first time somebody needed one more argument.
