# 0236 — A viewport names a device, and the pointer is part of it

**Status:** Accepted
**Date:** 2026-10-06
**Section:** §1 (process)

> **Numbered 0236**, which is the next free number on `main` and is claimed by
> none of the three open pull requests — #535, #536 and #537 carry no
> `decisions/` file between them. That check is the recommendation standing in
> the collision entry `FINDINGS.md` has now carried six times, and it is
> performed here rather than cited.

## Context

[0117](0117-one-harness-two-subjects-a-tree-it-renders-and-an-address-you-serve.md)
folded six private screenshot scripts into one harness and listed what the
consolidated harness owns: it finds the browser, serves the page, **sizes the
viewport**, reduces motion, measures the overflow, names the file.
[0159](0159-an-instrument-may-reach-a-state-and-may-never-assert-one.md) and
[0195](0195-a-shot-may-say-what-the-browser-started-with-and-it-says-it-as-data.md)
then drew the two axes a shot may move along — *what happens after the page is
open*, and *what the browser held before it loaded* — and both insisted the
answer is a closed set of named states declared as data rather than a script.

Nothing in that sequence asked what **device** takes the picture, because the
answer looked like it was already in the word `phone`.

On 6 October `Loom docs` filed that it is not. `VIEWPORTS.phone` is
`390x844` at `deviceScaleFactor: 2`, and that is the whole of it: no `hasTouch`,
no pointer emulation anywhere in either harness. Chromium in a 390-pixel window
therefore reports a **fine, hovering** pointer, so `@media (hover: hover)` and
`@media (pointer: fine)` have been true in every phone screenshot this
repository has ever taken.

For most subjects that changes nothing, which is why it went seven weeks
unnoticed. It changes everything for anything gated on the pointer, and Tailwind
4 gates a great deal on it by default: every `hover:` and `group-hover:` utility
compiles inside `@media (hover: hover)`. The lane that filed it had just shipped
the copy button on every documentation code block, which is hidden until hover
and so must be *shown* where there is no hover — and found the fix
unphotographable. The same picture comes back from the fixed build and the
broken one, because at a hover-capable 390 pixels both are `opacity: 0`. Its
report fell back to compiled CSS and a class-name assertion, and said plainly
that both are weaker than a picture.

The filing is also where the irony is. `PHONE`'s own comment has argued since it
was written that a **true** 390-pixel viewport matters because *a media query
reads the viewport*, and a desktop window scaled down is still 1280 wide to CSS.
That argument has a second half. A media query reads the pointer too.

## Decision

**A `SpecimenViewport` carries a required `touch: boolean`, `PHONE` sets it and
`WIDE` does not, and the harness emulates it with `hasTouch` and nothing else.**

Four parts, and each is a choice the finding left open.

**1. The pointer belongs to the viewport, not to the shot.** The finding offered
it as `touch: true` on a shot, beside `start`, on the reasoning that it is a
context property. It is — but so is the size, and the size has never been a
shot's to decide: a shot names `"phone"` or `"wide"` and the harness owns what
those mean. A pointer on a shot would let one lane photograph `phone` with a
finger and another photograph `phone` with a mouse, in the same repository, with
both reports calling the result *the phone*. That is the drift 0117 exists to
prevent, reintroduced one field lower down. The device is the viewport's.

**2. Required, not optional.** An optional `touch` with a `false` default would
have shipped this fix and left six of the thirty-four specimen sheets in this
repository still photographing phones with a mouse, silently, because those six
write their viewports out as literals rather than taking `DEFAULT_VIEWPORTS`. A
required field makes the compiler ask each of them, once, and the answer is one
word. A viewport that says nothing about its pointer is a viewport whose author
did not think about it, and that is exactly how a named `phone` came to be a
desktop window.

**3. `hasTouch`, and `isMobile` deliberately not set.** Playwright's own device
descriptors pair the two, so declining the pair needs a measurement rather than
a preference. Taken in this container at 390×844, reading `matchMedia` in the
page:

| context | `hover` | `pointer` | `innerWidth` |
| --- | --- | --- | --- |
| neither — today | `hover` | `fine` | 390 |
| `hasTouch` | `none` | `coarse` | 390 |
| `isMobile` | `hover` | `fine` | **980** |
| both | `none` | `coarse` | 390 |

`hasTouch` is the whole of what moves the pointer. `isMobile` moves none of it,
and what it does move is the **meta viewport**: on a document with no
`<meta name="viewport">` Chromium falls back to a 980-pixel layout width, and
the picture becomes a desktop page scaled down — which is precisely the failure
`PHONE`'s comment has warned about since it was written. Every page the
application serves declares the tag, so there `isMobile` is inert; a specimen's
rendered page is the case it would break. A field that buys nothing and can cost
the whole picture is left off.

**4. The line a report pastes says which device took it, and only when it is a
finger.** `describeShot` now prints `390x844@2x touch`. The reading beside it —
`scrollWidth` against `innerWidth` — is quoted in every report in this
repository and reads as *this is what a phone gets*; for seven weeks it was
taken by a browser with a mouse, and no reader could have told from the number.
Printed only when true, so every `wide` line this harness has ever written is
unchanged.

## Consequences

**The default moved, and the finding asked for that to be a judgement rather
than an addition**, on the grounds that it changes existing pictures. Measured
rather than estimated, it changes almost none, and the mechanism says why: a
rule inside `@media (hover: hover)` still needs `:hover` to match, and a
screenshot never hovers. So every ordinary `hover:` utility is inert in both
modes. A phone shot moves only where a rule applies **at rest** and is gated on
the pointer — and the library stylesheet carries no pointer query at all, so no
specimen sheet in this repository can move. In the application's compiled CSS
there is exactly one such rule today, `[@media(hover:hover)]:opacity-0` on the
documentation copy button, and it is the one the filing was written about. The
numbers are in the report beside this record.

**A page that sniffs the pointer in a script is still not photographed
truthfully**, and this is a measured limit rather than an assumed one.
`navigator.maxTouchPoints` becomes 1 under `hasTouch`, but `"ontouchstart" in
window` stays `false`. CSS is now honest; `ontouchstart` is not. Filed.

**Six files in `src/primitives/` were edited from outside the lane that owns
them** — one word per viewport literal, twelve in all, no behaviour changed in
any of them. Filed with each file named. They are the sheets that copy `PHONE`'s
numbers instead of importing `PHONE`, and the duplication is the reason the
compiler had to ask them at all; collapsing it is theirs to do and is not
required by anything here.

**What a lane writing a size into a shot list gets is a window with a mouse.**
`touch` defaults to `false` in the shot schema, which is the one place the schema
and the type disagree, and it is the honest default there: a size written into a
shot list is a lane reaching past the two named viewports, and `"phone"` is how
it asks for a phone.

**No viewport claims to be a device it is not, and nothing yet claims to be a
particular phone.** A coarse pointer and a 390-pixel window is not an iPhone: no
user-agent string, no platform, no software keyboard, no address bar eating the
bottom of the screen. This record buys the pointer and says so narrowly.

## Alternatives considered

**Derive it from the width** — anything narrower than some threshold is a phone.
It needs no field, costs no cross-lane edit, and fixes all six specimen sheets
for free. Rejected: it is an implicit rule nobody declared, it is wrong for the
narrow desktop window somebody will eventually photograph, and the next run to
meet it will file it. The thing being fixed here *is* a size standing in for a
device.

**Leave it optional and sweep the sources with a test** — a check in this lane
asserting that every viewport labelled `phone` anywhere in the repository
declares `touch: true`. Rejected: it is this lane's rule failing inside another
lane's pull request, which is a worse trade than a required field the compiler
raises at the point of writing. The type is the right instrument for a question
about a value's shape.

**Take `isMobile` as well, because the device descriptors do.** Rejected on the
measurement above, and the table is in the code so the next run does not have to
take it again.

**A `hover` step in a `do` list**, so a shot could photograph the revealed
state. Not rejected and not decided — it is a different question, on 0159's
axis rather than this one, and it is about a *state* rather than a device.
Nothing has asked for it.
