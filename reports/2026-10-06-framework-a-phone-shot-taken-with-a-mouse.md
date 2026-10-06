# A phone shot taken with a mouse

**Date:** 2026-10-06 · **Section:** §1 (process — the screenshot harness) · **Lane:** `Loom daily build`
**Branch:** `framework-57-a-phone-shot-taken-with-a-mouse`, cut from `main` at `41c65e9`. Not stacked.
**Records:** [0236](../decisions/0236-a-viewport-names-a-device-and-the-pointer-is-part-of-it.md). **None superseded.**

| before — every phone shot ever taken here | after — this branch |
| --- | --- |
| ![no button](2026-10-06-framework-copy-button-phone-mouse.png) | ![the button](2026-10-06-framework-copy-button-phone-touch.png) |

*One documentation code block, clipped, at 390×844. Same build, same page, same
selector, same run — the only variable between them is the pointer. The left one
came back **byte-identical to `Loom docs`' own committed
`2026-10-06-docs-copy-button-phone.png`**, which is the control: it is not my
reconstruction of the old behaviour, it is the old behaviour.*

---

## What this run did, in plain language

**`VIEWPORTS.phone` was a size and not a device, so Chromium reported a mouse in
it, and every phone screenshot in this repository was taken by a browser that
hovers.** `@media (hover: hover)` and `@media (pointer: fine)` have been true in
all of them. A viewport now carries a required `touch`, `PHONE` sets it, and the
harness emulates it — so a shot named `phone` is taken by something with a
finger, and the line a report pastes says which device took it:

```
2026-10-06-framework-copy-button-phone-touch  390x844@2x touch  scrollWidth 390 / innerWidth 390
```

`Loom docs` filed it this morning, from the other end: it had just made the copy
button on every code block visible to touch readers, and found the fix
**unphotographable** — the same picture comes back from the fixed build and the
broken one, because at a hover-capable 390 pixels both are `opacity: 0`. Its
report fell back to compiled CSS and a class-name assertion and said plainly
that both are weaker than a picture. The picture is above.

The irony is in the file this changes. `PHONE`'s own comment has argued since it
was written that a **true** 390-pixel viewport matters because *a media query
reads the viewport*, and a desktop window scaled down is still 1280 wide to CSS.
A media query reads the pointer too. The comment had one half of its own
argument.

## Why it was the thing to build

It is the newest open finding owned by this lane, it came from another routine
with evidence attached, and it is the only one of them that is about the
instrument four other routines take their evidence with. A defect invisible to
the instrument is a defect that gets reported as *fixed, photograph attached*.

The migration this lane's brief still leads with is **done** and was done before
this run started: `apps/loom` holds the route groups, `apps/portal` and
`apps/docs` are retired, `apps/` is one package. Nothing is half-migrated.

## The three answers the filing left open

The filing named two shapes and asked for a judgement on the second. All three
answers below are measured, and all three are in 0236.

### 1. The pointer belongs to the viewport, not to the shot

The filing offered `touch: true` **on a shot**, beside `start`, reasoning that
it is a context property. It is — and so is the size, which has never been a
shot's to decide. A pointer on a shot lets one lane photograph `phone` with a
finger and another photograph `phone` with a mouse, in one repository, with both
reports calling the result *the phone*. That is precisely the drift
[0117](../decisions/0117-one-harness-two-subjects-a-tree-it-renders-and-an-address-you-serve.md)
folded six private scripts into one harness to prevent, reintroduced one field
lower down.

### 2. `hasTouch`, and `isMobile` deliberately not — the filing's mapping is half wrong

The filing says the field "maps to Playwright's `hasTouch` **and** `isMobile`",
which is how Playwright's own device descriptors are written. Measured at
390×844 in this container, reading `matchMedia` in the page:

| context | `hover` | `pointer` | `innerWidth` |
| --- | --- | --- | --- |
| neither — every shot until today | `hover` | `fine` | 390 |
| `hasTouch` | **`none`** | **`coarse`** | 390 |
| `isMobile` | `hover` | `fine` | **980** |
| both | `none` | `coarse` | 390 |

`hasTouch` is the whole of what moves the pointer. `isMobile` moves none of it,
and what it *does* move is the meta viewport: on a document with no
`<meta name="viewport">`, Chromium falls back to a 980-pixel layout width and
the picture becomes a desktop page scaled down — the exact failure `PHONE`'s
comment warns about. Every page the application serves declares the tag, so
there it is inert; a specimen's rendered page is the case it would silently
break. A field that buys nothing and can cost the whole picture is left off, and
the table is in the code so nobody has to take it again.

### 3. How many existing phone shots move: one, and it is the one the filing is about

The filing asked for this to be a judgement rather than an addition, "worth
knowing how many of the repository's phone shots move before choosing". It was
measured two ways.

**The mechanism first, because it is the reason the number is small.** A rule
inside `@media (hover: hover)` still needs `:hover` on the element to match, and
a screenshot never hovers — so every ordinary `hover:` utility is inert in both
modes. A picture can only move where a rule is gated on the pointer **and
applies at rest**.

**Swept**, over the compiled stylesheets:

| | pointer-gated at-rules | of those, rules that apply at rest |
| --- | --- | --- |
| the library stylesheet (46,590 bytes) | **0** | **0** |
| the application's compiled CSS (6 files) | 12 | **1** |

The one is `[@media(hover:hover)]:opacity-0` — the copy button, compiled into
three route groups' chunks. Zero in the library means **no specimen sheet in
this repository can move**, which is 34 sheets.

**Photographed**, six whole-page phone shots, both ways, same build, same run:

| page | |
| --- | --- |
| `/` — marketing | byte-identical |
| `/what-you-run` — marketing | byte-identical |
| `/lessons` | byte-identical |
| `/demo` | byte-identical |
| `/portal` | byte-identical |
| `/docs/getting-started/installation` | **differs** — 1,123,655 → 1,128,334 bytes |

And one specimen sheet, `the-link-inside-a-sentence`, run both ways across all
three of its themes: **three phone shots, three byte-identical**, which is the
library row above confirmed with a camera rather than a regex.

So the default moved. Five of six pages and every specimen sheet are unchanged,
and the sixth is the picture that was lying.

## Three things I decided that nothing specified

**`touch` is required, not optional.** An optional field with a `false` default
would have shipped this fix and left six of the thirty-four specimen sheets
still photographing phones with a mouse — silently, because those six write
their viewports out as literals instead of taking `DEFAULT_VIEWPORTS`. Required
makes the compiler ask each of them once, and the answer is one word. The
alternative I weighed and rejected was a **sweep test** in this lane asserting
that every viewport labelled `phone` anywhere declares `touch: true`: that is
this lane's rule failing inside another lane's pull request, which is a worse
trade than a type the compiler raises where the value is written.

**The line says `touch`, and only when it is true.** The reading beside it —
`scrollWidth` against `innerWidth` — is quoted in every report here and reads as
*this is what a phone gets*. For seven weeks it was taken with a mouse and no
reader could have told from the number. Printed only when true, so every `wide`
line this harness has ever written is byte-identical.

**A size written into a shot list is a window with a mouse.** `touch` defaults
to `false` in the shot schema, which is the one place the schema and the type
disagree. A lane writing `{ width, height }` is reaching past the two named
viewports, and `"phone"` is how it asks for a phone. `"touch": true` is there
for the lane that wants a hand-sized device at some other size.

## The thing that is now worse, and it is filed

**CSS is honest and a script is not.** `navigator.maxTouchPoints` becomes 1
under `hasTouch`; `"ontouchstart" in window` stays `false`, in both modes.
Chromium defines `window.TouchEvent` and `window.Touch` either way and
`ontouchstart` in neither. So a component branching on the oldest and still
common sniff gets its **desktop** branch photographed under a picture the
harness now labels `touch` — which is a worse failure than the one closed today,
where the label and the picture were wrong together.

Nothing in this repository sniffs it: swept `src/`, `apps/` and `tools/`, zero
occurrences. So it is recorded as a stated limit rather than fixed, with the
line that would close it written down — an `addInitScript` defining the property,
which is
[0195](../decisions/0195-a-shot-may-say-what-the-browser-started-with-and-it-says-it-as-data.md)'s
`start` territory and not the viewport's. A harness that fakes a signal nothing
reads is telling a story about a browser rather than photographing one.

## The recipe, because a capability not in it does not exist

The 3 October finding this lane closed on `measure` says it plainly: *to a
routine with no memory of the last run, a capability that exists and is not in
the recipe is a capability that does not exist* — it cost six runs a private
Playwright script before anyone found `measure`. So the same run that added the
field wrote it into the two files a lane reads first:

- **`docs/routines.md`**, *Taking the screenshot* — what `phone` now reports,
  the `390x844@2x touch` line, that an explicit `{ width, height }` is a window,
  and the `ontouchstart` limit above.
- **`tools/specimen/README.md`** — the same for a sheet that writes its own
  viewports, and its two sample output lines corrected.

## The defect matrix

Fourteen defects planted, one at a time, each reverted before the next.

| planted | |
| --- | --- |
| `PHONE.touch` is false | |
| `WIDE.touch` is true | |
| `contextOptionsFor` hard-codes `hasTouch: true` | |
| `contextOptionsFor` hard-codes `hasTouch: false` | |
| `hasTouch` is dropped from `ContextOptions` | |
| `isMobile: true` is added to the context | |
| `describeShot` prints the pointer on every shot | |
| `describeShot` prints the pointer on none | |
| `describeShot` prints the pointer in the wrong place | |
| the shot schema's `touch` defaults to `true` | |
| the shot schema drops `touch` | |
| the shot schema's `touch` is not passed through to the plan | |
| a specimen sheet's `phone` literal is set to `touch: false` | |
| `touch` is made optional on `SpecimenViewport` | |

## Measured, not asserted

| | `main` at `41c65e9` | this branch |
| --- | --- | --- |
| `@media (hover: hover)` in a `phone` shot | **true** | **false** |
| `@media (pointer: coarse)` in a `phone` shot | false | **true** |
| `navigator.maxTouchPoints` in a `phone` shot | 0 | **1** |
| `innerWidth` in a `phone` shot | 390 | 390 — unchanged |
| `scrollWidth / innerWidth` on all six pages above | 390 / 390 | 390 / 390 — unchanged |
| whole-page phone shots that change | — | **1 of 6** |
| specimen phone shots that change | — | **0 of 3 measured, 0 possible** |
| viewports in the repository that declare a pointer | **0 of 14** | **14 of 14** |

The `innerWidth` row is there because it is what `isMobile` would have broken,
and the `scrollWidth` row because it is the number every report quotes: the
change is visible in the pictures and in none of the measurements, which is what
makes it safe to make the default.

## Cross-lane diffs

Three files' worth, all mechanical, all filed:

- **Six specimen sheets in `src/primitives/`** — twelve one-word edits, forced
  by the required field. No behaviour changed; `the-link-inside-a-sentence` was
  photographed both ways to prove it. Filed with every file and line named,
  including the tidy-up that would stop it happening again (those six copy
  `PHONE`'s numbers instead of importing `PHONE`), offered and not taken.
- **Four sample output lines in `lessons/32-layout.md`** — three of them are
  captured output of Exercise F, which builds its shots with `viewport: PHONE`,
  so a learner running it today got three lines the transcript said they would
  not. No prose touched, no number changed. Filed, with the one sentence that
  lane might want to write.
- **Nothing under `(marketing)`, `(docs)`, `(lessons)`, `(portal)`, `(demo)` or
  `(preview)` was opened at all.** The one thing I wanted to change in another
  lane's file and did not is the `[@media(hover:hover)]:opacity-0` class on the
  copy button — it is correct, it is now photographable, and it is theirs.

## Gate

## Findings

**Closed, one:** the 6 October entry from `Loom docs`, naming this branch, with
its original status preserved below the closure — it is another lane's entry and
only the status line is mine to write. All three of the questions it left open
are answered in it with the measurement attached.

**Filed, three:**

- **Twelve one-word edits in six of `Loom primitives`' specimen sheets**, forced
  and harmless, with the duplication that caused them named.
- **A phone shot is honest in CSS and still dishonest in a script** —
  `ontouchstart`, owned by this lane, recorded as a stated limit with the fix
  deliberately not built.
- **Four corrected sample lines in `lessons/32-layout.md`**, owned by
  `Loom lessons`.

## Open questions

**Nothing blocking.** Two for you, and a recommendation on each:

- **Is a coarse pointer enough, or should a viewport be able to name a real
  device?** What shipped is a 390-pixel window that reports a finger. It is not
  an iPhone: no user-agent string, no platform, no software keyboard, no address
  bar eating the bottom of the screen. My recommendation is to stop here — every
  one of those is a claim the harness would be making on a page's behalf, and
  the pointer is the only one anything has actually needed. Worth a word if you
  want the harness to go further.
- **Should `ontouchstart` be defined in a phone shot?** My recommendation is no,
  until something reads it, for the reason in the finding: faking a signal
  nothing reads makes the instrument a story. The sweep that says nothing reads
  it is two greps and is in the finding, so the next run can re-take it.
- **Still open from earlier runs and unchanged by this one:** the `ModelEffort`
  scale borrowed from one vendor that three adapters will each have to map, and
  whether Grok is a third adapter at all. Both are yours and neither blocks
  anything.

`*.vercel.app` is denied from this sandbox (27 September finding, unchanged), so
every photograph here is a local **production** build served by
`pnpm shoot --serve`, not the preview.
