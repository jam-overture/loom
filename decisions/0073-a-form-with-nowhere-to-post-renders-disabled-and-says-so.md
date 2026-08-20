# 0073. A form with nowhere to post renders disabled, and says so

**Status:** Accepted
**Date:** 2026-08-20
**Section:** §4b → §4g

## Context

[0065](0065-a-submission-names-a-destination-and-never-carries-one.md) built the
submission seam and gave a form three distinguishable conditions, deliberately
refusing to let any two of them collapse:

> A form has a target, or has a named reason it does not, or was never given
> one. […] There is deliberately no way to express "no target, and that is
> fine" — a submit button that silently goes nowhere is the failure this shape
> exists to prevent.

It then said what it had not done: *"Nothing enforces that a form primitive has
a target. A primitive that needs one and is given none renders untargeted, and
only its own author knows that is wrong."* And: *"No primitive in the starter
library posts anywhere yet."*

`loom.form` is that primitive, and it has to decide what the two states that are
not `ready` actually look like on a page a visitor is reading. The decision is
worth a record rather than a line in a report, because it is a **contract every
form primitive in this library or a host's own now inherits**, and because the
mechanism it lands on answers a structural question the seam leaves open: the
outcome reaches the node that *declared* the submission and not its children, so
the control that would need to know is the one node that cannot be told.

## Decision

**A form that is not `ready` renders its whole body inside a disabled
`<fieldset>`, above an undimmed line saying what is wrong in plain language.**

Three states, three renderings:

| `loom.submit` | what renders |
| --- | --- |
| absent | no `action`, `<fieldset disabled>`, "This form is not connected yet, so it cannot be sent." |
| `unavailable` (`unavailable`) | same, "This form cannot be sent just now. Please try again in a moment." |
| `unavailable` (`refused`) | same, "This form is not accepting messages at the moment." |
| `ready` | `action`, `method`, the host's hidden fields, nothing disabled |

Four things follow from that, and each is the reason for a line of the
implementation:

**`<fieldset disabled>` is the mechanism, not a `disabled` prop.** A disabled
fieldset disables every control it contains, without any of them knowing why.
That matters because `loom.submit` reaches only the declaring node: a
`loom.button` inside a form *cannot* discover that the form has no address, and
a `disabled` prop on the button would be a rule no schema states, that some
other node has to set correctly, and that every edit to the tree can break.
`loom.button` therefore has no `disabled` prop at all.

**The hidden fields stay outside the fieldset.** A disabled control is not a
successful one, so a CSRF token inside a fieldset that is ever disabled is a
form that posts without its token on the day the endpoint has a bad afternoon.

**The notice is outside it too**, and undimmed. The one thing worth reading is
the one thing not greyed out.

**The strings are declared, not written into the component and not taken from
the tree** ([0063](0063-a-declared-string-travels-with-the-primitive.md)). Three
of them rather than one, because the seam distinguishes three conditions and a
visitor acts on them differently — one is a page that is not finished, one is
worth trying again in a minute, and one is not. None of them names an endpoint,
a registry or a reason: `unavailable.detail` says the token store timed out, and
that belongs in the render diagnostics where the person who can fix it is
looking, not on the page in front of someone who wanted to send a message.

## Consequences

- **A form always renders.** It never refuses, never throws, and never
  disappears — 0008's totality, applied to the one primitive with an external
  dependency. A page with a broken contact form is still a page.
- **The failure 0065 named is now unreachable from this library.** There is no
  configuration of `loom.form` and `loom.button` that produces a pressable
  submit with no destination.
- **The audit 0065 deferred now has a candidate.** Its own words were that "the
  audit is cheap to add once a primitive exists that would fail it" — one does.
  A `submits` declaration on `definePrimitive`, the way `interactive` is
  declared, would let `auditRegistry` tell a host that a registered form
  primitive was rendered with no submission wired at all. Filed for the
  framework routine rather than built here; the disabled state means the cost of
  not having it is a visible notice rather than a silent failure.
- **A host's own form primitive is free to render these states differently**,
  and this record is what it should read first. The three states are the seam's;
  the fieldset is this library's answer to them.
- **There is still no success state.** A form that posts leaves the page, and
  what a visitor sees next is the host's response — a route the deployment owns.
  Nothing in the tree describes it, and nothing here pretends to.

## Alternatives considered

**Render no `<form>` element at all when there is no target.** Safest-sounding,
and it changes the page's structure between states: a landmark appears and
disappears, and a reviewer comparing two renders sees a different tree rather
than a disabled one. The `<form>` with no `action` cannot leak anything — every
control inside it is disabled, and a form with no action posts to the page a
visitor is already on.

**Render the form enabled and let the submission fail.** What most component
libraries do, because their forms have a handler and the handler is somebody
else's problem. Here it is precisely the failure 0065 exists to prevent, and it
sends someone's typed message into a page reload.

**Say nothing — render disabled with no notice.** A form greyed out for no
stated reason reads as a bug in the reader's browser. The whole value of the
seam's three states is that they are *distinguishable*, and a rendering that
distinguishes them only by opacity throws that away at the last step.

**Put the reason on the page.** `describeSubmissionUnavailable` produces a good
sentence — "the endpoint could not be reached — the token store timed out" — for
an operator. On a public page it is an internal detail told to a stranger, and
in the `no-such-endpoint` case it lists the deployment's registered endpoint ids.
