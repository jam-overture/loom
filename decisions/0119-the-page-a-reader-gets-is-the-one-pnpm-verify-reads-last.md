# 0119. The page a reader gets is the one `pnpm verify` reads last

**Status:** Accepted
**Date:** 2026-09-09
**Section:** §1 (process)

## Context

On 9 September `Loom docs` published a sentence that read *"16of those blocks
are TypeScript"*. The source is one ordinary paragraph:

```tsx
<p className="mt-3">
  {ARRIVAL_TOTALS.compiled} of those blocks are TypeScript, …
</p>
```

Under `vitest` that renders `16 of those blocks are TypeScript`, and a test
asserting exactly that string on `container.textContent` **passed**. The same
component in `next build`'s output is:

```html
<p class="mt-3">16<!-- -->of those blocks are TypeScript, …
```

The finding was reproduced deliberately before it was filed: the fix was
reverted, `next build` run again, the prerendered HTML carried `16<!-- -->of`
with the RSC payload showing the text child as `16,"of those blocks`, and **all
eight of the component's tests still passed**. It was caught in a screenshot. A
run that skipped the visual would have shipped it green.

The paragraph is not the point. The point is the sentence in the finding that
generalises it:

> The unit test cannot catch this class of defect at all. It is not that the
> assertion was too weak; it is that the assertion was made against a different
> transform's output.

Every test in this repository that asserts on `textContent` inherits that blind
spot, on any of the four surfaces, because they all now share one build. What
`pnpm verify` checks is that the *source* is right. Nothing has ever opened
what came out — which is the artefact a reader is served, and which the same
command has been producing on every run since `apps/loom` existed.

## Decision

**`pnpm verify` ends by reading the prerendered pages `next build` just wrote.**
`pnpm prerender:check` (`tools/prerender/`) walks
`apps/loom/.next/server/app/**/*.html` and fails the run on a hazard, after the
application's own verify rather than inside it, because that is when the
artefact exists.

Three things fix its shape:

**One hazard, named precisely.** React writes `<!-- -->` between two adjacent
text children so hydration can find the boundary. Wherever it appears, two runs
of text were placed side by side and somebody answered the question of whether a
space belongs between them — or, above, did not notice they were being asked.
The check reads **the two characters the separator sits between** and fails when
both are `[A-Za-z0-9]`. `$16` and `16%` pass, because `$` and `%` are not
characters that run together. `16of` does not.

**No exemption list.** A junction that is genuinely meant to run together has an
honest fix that is also the clearer source: make it one text child, `` {`${n}px`} ``
rather than `{n}px`, which emits no separator and is never asked about. An
exemption list would be a second way to say the same thing and would leave the
next reader unable to tell which was meant.

**A pass says what it read.** The run prints `73 prerendered pages, 307 text
junctions, 0 run together`. A check over build output can pass because the
output is clean or because it opened nothing, and from a green tick those are
identical. Reading zero pages is a failure with its own message naming the build
command, not a quiet success.

## Consequences

The gate every lane must pass now includes one step that runs after the
application build. A surface that ships a run-together sentence gets a red
`pnpm verify` naming the page and printing the sentence as a reader sees it —
`docs/introduction.html: reads "6o" — 16of those blocks are TypeScript` —
rather than a screenshot somebody happened to take.

Measured on this branch: 73 pages, 307 junctions, 0 run together. The check was
verified end to end rather than reasoned about — a probe page carrying the
defect shape was built with `next build`, the check failed on it with exit 1 and
named it, and the probe was removed.

It costs about a second and it opens no browser, which is what makes it
affordable as the last step of a gate that four routines wait on.

What it does not catch is a space lost across a tag: `16<!-- --><span>of</span>`
reads `16of` and passes here, because the character after the separator is `<`.
Widening to the rendered text stream means deciding which elements introduce a
space of their own, which is a second question with its own wrong answers. Left
open, and stated in the module rather than hidden.

The check is also blind to any hazard nobody has met yet. It is one class, the
one that shipped. Adding a second is a function and a test beside this one, and
the argument for each should be a defect that reached a reader — not a hazard
somebody imagined. The first candidate considered and rejected is below.

## Alternatives considered

**A list of expected sentences per page**, which is what the finding suggested:
*"a test asserting a handful of rendered sentences against `.next`'s prerendered
output"*. Rejected on ownership and on decay. The sentences belong to four other
lanes, so the shell would hold a copy of every surface's prose and go stale the
first time any of them edited a paragraph — and the lane that broke the check
would be the one that may not fix it. It also catches only the sentences
somebody thought to list, which is the failure that let this one through.

**Scanning for `undefined`, `NaN` and `[object Object]` in visible text**, the
usual companion hazards. Built and measured before being dropped: the API
reference publishes TypeScript signatures, so `readonly props: readonly
CataloguedProp[] | undefined` is prose there, and the scan reported over a
hundred sites across four pages, every one of them correct. A check whose first
run is a hundred false positives is a check somebody turns off.

**Making the check a `vitest` test.** It would be the cheaper wiring and it
cannot work: `@loom/app`'s verify runs `next build` last, so a test reads either
nothing or a previous run's output. Reading a stale `.next` is worse than not
looking — it passes on bytes nobody shipped.

**Serving the built app and reading it through a browser**, which `pnpm shoot`
(0117) can already do. Rejected as the wrong instrument for a gate: it needs a
browser, a port and `next start`, for an answer that is in a file on disk. The
browser harness stays for what needs a browser — layout, overflow, what a page
looks like — and this stays a file read.
