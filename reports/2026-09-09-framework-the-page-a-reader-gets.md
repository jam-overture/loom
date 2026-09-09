# 2026-09-09 — The page a reader gets, read last

**Routine:** `Loom daily build` · **Section:** §1 (process)
**Branch:** `framework-25-where-the-face-is` (#230), eighteenth unit
**Visual:** `reports/2026-09-09-framework-the-page-a-reader-gets.svg`

## What was completed

`pnpm verify` now ends by reading the pages `next build` just wrote.
`pnpm prerender:check` walks `apps/loom/.next/server/app/**/*.html` and fails
the run on a sentence whose words have run together — the defect `Loom docs`
published this morning and caught in a screenshot rather than in a test.

Their paragraph is one ordinary line of JSX. Under `vitest` it renders
`16 of those blocks are TypeScript` and a test asserting exactly that string on
`container.textContent` **passed**. In `next build`'s output the same component
is `<p class="mt-3">16<!-- -->of those blocks are TypeScript, …` and a reader
gets *"16of those blocks"*. They reproduced it deliberately before filing:
reverted the fix, rebuilt, found `16<!-- -->of` in the prerendered HTML with the
RSC payload showing the text child as `16,"of those blocks` — and **all eight of
the component's tests still passed**.

The paragraph is theirs and they have already fixed it on `docs-21`. What landed
here is the sentence in their finding that generalises:

> The unit test cannot catch this class of defect at all. It is not that the
> assertion was too weak; it is that the assertion was made against a different
> transform's output.

Every test in this repository written on `textContent` inherits that blind spot,
on any of the four surfaces, because all four now share one build. There is no
stricter assertion that fixes it. What fixes it is opening the artefact — which
this repository has been producing on every `pnpm verify` since `apps/loom`
existed, and which nothing had ever read.

## How the check is shaped, and why

**One hazard, named by characters rather than by meaning.** React writes
`<!-- -->` between two adjacent text children so hydration can find the
boundary. Wherever it appears, two runs of text were placed side by side and
somebody answered the question of whether a space belongs between them — or did
not notice they were being asked. The check reads the two characters the
separator sits between and fails when both are `[A-Za-z0-9]`. `$16` and `16%`
pass; `16of` does not.

**No exemption list.** A junction genuinely meant to run together has a fix that
is also the clearer source: make it one text child, `` {`${n}px`} `` rather than
`{n}px`, which emits no separator and is never asked about. An exemption list
would be a second way to say the same thing, and the one that leaves the next
reader unable to tell which was meant.

**A pass says what it read.** The run prints `73 prerendered pages, 307 text
junctions, 0 run together`. A check over build output can pass because the output
is clean or because it opened nothing, and those are the same green tick to
everybody downstream. Reading zero pages is a failure with its own message
naming the build command.

**It runs after `@loom/app`'s verify, not inside it.** That package's own verify
is `typecheck && test && build`, so a `vitest` test would read either nothing or
a previous run's `.next` — and passing on bytes nobody shipped is worse than not
looking.

## Produced, not reasoned about

The check was verified end to end against a real build. A probe page carrying
the defect shape went into the tree, `next build` ran, and the prerendered HTML
carried `<p>16<!-- -->of those blocks are TypeScript, checked` — the same byte
sequence the finding quotes. The check failed on it with exit 1:

```
zz-prerender-probe.html: reads "6o" — 16of those blocks are TypeScript, checked
74 prerendered pages, 308 text junctions, 1 run together
```

The probe was then removed. The message prints the sentence with the markup
stripped out, because the whole value of it is that it shows the wrong sentence:
the first draft printed the raw window, `v hidden=""><!--$--><!--/$--></div><p>16`,
which is a haystack with the needle still in it.

## Decisions taken that were not specified

- **The check reads characters, not the rendered text stream.** `16<!-- --><span>of</span>`
  also reads `16of` to a reader and passes here, because the character after the
  separator is `<`. Seeing it would mean deciding which elements introduce a
  space of their own — a second question with its own wrong answers. Left open
  and stated in the module rather than half-answered.
- **`undefined`, `NaN` and `[object Object]` were built as a second hazard and
  dropped.** The API reference publishes TypeScript signatures, so
  `readonly props: readonly CataloguedProp[] | undefined` is prose there. The
  scan reported over a hundred sites across four pages and every one was
  correct. A check whose first run is a hundred false positives is a check
  somebody turns off.
- **`docs/rollout.md`'s demo path was corrected and nothing else in it was.**
  See below.

## Records

- **[0119](../decisions/0119-the-page-a-reader-gets-is-the-one-pnpm-verify-reads-last.md)**
  — the page a reader gets is the one `pnpm verify` reads last. Accepted.
  Nothing superseded. Numbering: 0119 was the only free number after listing
  `decisions/0*` across all 178 remote branches; 0120 is claimed elsewhere.
  `pnpm decisions:index` exits 0, printing the two familiar `note:` lines for
  0106 and 0110, which are holes here and other lanes' records.

## The other thing that landed, and why it is in this pull request

`docs/routines.md` gained a section: **Commit identity, and the preview that goes
missing.** `Loom docs` filed the commit-identity trap on 4 September as the
seventh recorded instance, with the cause worked out and two fixes ranked, and
asked for exactly one thing — a line in that file, beside the network policy,
where the other environment-shaped rule already lives.

Nothing about the trap fails. The commit is fine, the push succeeds, the tests
are green, and the only symptom is a pull request with no preview URL; several
runs reported that as *"the preview came back Blocked"* without connecting it to
the author line. The cause is that every session opens with the maintainer's
email address for identifying the user and nothing says what a commit's author
must be, so a run that sets one reaches for the address it was given — and
Vercel refuses it.

The sentence written is *do not set an author at all*, which is narrower than
naming one and is what the evidence supports: every commit on this branch is the
session default `Claude <noreply@anthropic.com>` and #230 has had a Ready
preview on every push. The stronger fix the finding ranked second — a committed
repository-local `user.name` — is **not** taken: it would decide the author line
for every human who clones this repository, to fix a problem only unattended
sessions have.

It is three paragraphs of documentation rather than a second unit, and it is
here because it closes a finding this lane owns that has now cost seven runs a
preview between them.

## Findings closed

| filed by | date | what it asked for | what happened |
| --- | --- | --- | --- |
| `Loom docs` | 9 Sep | a check that reads the **built** HTML | `pnpm prerender:check`, last step of `pnpm verify` |
| `Loom demo` | 9 Sep | `docs/rollout.md` puts the demo at a path it left on 21 August | corrected to `apps/loom/app/(demo)/demo` |
| `Loom docs` | 4 Sep | the commit-identity trap, seventh instance — one line in `docs/routines.md` | written, as above |

The first two were filed **after this morning's run had already swept every branch** —
the docs entry at 14:10 UTC on `docs-21`, the demo entry at 20:17 on
`demo-08`. The cross-branch sweep is three runs for three, and this is the first
time it has picked up work filed the same day rather than a backlog. `main` has
not moved since 1 September, so neither entry was readable from it.

## Findings filed

- **`docs/rollout.md` is stale in three more places**, and each belongs to
  somebody else: the test count (1,173, against 2,130 and 2,497 today), the
  primitive count, and a Phase 1 table still listing `Loom docs` and
  `Loom marketing` as **disabled** when both have run daily for weeks and both
  have open pull requests today. Owned by the maintainer. A routine rewriting
  the status of four other routines inside his rollout plan would be the kind of
  self-report nobody asked for; the path was a fact about this lane's own tree,
  which is why that one was taken.

## Open questions

- **A space lost across a tag is still invisible**, as above.
- **One hazard is one hazard.** The check catches the class that shipped. Adding
  a second is a function and a test beside this one, and the argument for each
  should be a defect that reached a reader rather than one somebody imagined.
- **The four surfaces are read, and none of them opted in.** Unlike the citation
  check, which stops at this lane's boundary by choice, this one reads every
  prerendered page because the artefact is one build and cannot be split by
  route group. It has nothing surface-specific in it and holds no copy of
  anybody's prose, which is what makes that acceptable — but it is a gate this
  lane put in front of four others, and it is stated here rather than buried.

## Test numbers

`pnpm verify` green, **exit 0**, run on a clean `.next`:

| | this run | this branch before it |
| --- | --- | --- |
| runtime tests | **2,130** across 132 files | 2,117 across 131 files |
| application tests | **2,497** across 158 files | 2,497 across 158 files |
| prerender check | **73 pages, 307 junctions, 0 run together** | did not exist |

Thirteen new tests, all in `tools/prerender/prerender.test.ts`. Nothing was
skipped, nothing was weakened, and no test was changed to accommodate this. One
build was thrown away and redone: the probe page left a stale
`.next/types/validator.ts` naming a route that no longer existed, which failed
`tsc --noEmit` — `rm -rf apps/loom/.next` and the full run went green.
