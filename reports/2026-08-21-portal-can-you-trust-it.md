# 2026-08-21 — "Can you trust the AI?"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-08-can-you-trust-it` (→ `main`).

Visuals, both from a clean local production build of this commit:
[the page as it arrives](2026-08-21-portal-can-you-trust-it.png) ·
[every disclosure opened, which is the same page with nothing hidden](2026-08-21-portal-can-you-trust-it-open.png).

---

## What was asked

No maintainer comment is open on any portal pull request, and no open finding
owned by this lane was ahead of the plan. So this run is the next item on the
rename queue the 20 August report left: after `/portal/pages`'s empty state and
the sign-in page, the brief names calibration as the surface where the value is
highest and the language worst — *"where the AI's own confidence has proven
wrong. Nothing else in the ecosystem can show this, and it is unreadable
today."*

It was unreadable. The page opened with a lower-case `h1` reading
**`calibration`**, then a badge reading **`claimed more than it delivered`**,
then a row of monospace figures — `judged 23 · survived 57% · mean claim 79% ·
undos (not scored) 3 · waiting on a human 5 · broke mid-flight 1 · unfinished in
this window 2` — and then a ten-row table headed `claimed / judged / survived /
observed vs claimed`. Every number on it is worth having. Not one of them
answers the question somebody opened the page with.

## What shipped

**The route is `/portal/trust`.** Calibration is a statistical property; what a
person wants from it is whether the thing proposing changes to their pages can
be believed. `/portal/calibration` answers permanently with a 308 — the same
shape `/portal/trees` got a run ago, and for the same reason: a rename that
breaks every bookmark is a rename that gets reverted. The nav label moved with
it, `Calibration` → **Trust**.

**The page leads with a verdict and a next move.** One of four sentences, in a
tone-coloured card:

| | |
| --- | --- |
| **The AI has been about as right as it says it is** | *When it said it was sure, it usually turned out to be. Its confidence is worth reading.* → Nothing to do. |
| **The AI has been over-sure of itself** | *It said it was confident more often than it turned out to be right.* → Read what a change would do before you accept it, however sure the AI sounds. |
| **The AI has been harder on itself than it needed to be** | *Changes went through more often than it predicted.* → You are probably being asked about changes that did not need you. Worth loosening a rule. |
| **Not enough answers yet** | *Nothing here has been settled either way.* → Come back once a few changes have been accepted or turned down. |

Under it, the numbers as a sentence rather than a table: **"23 changes have been
answered. 13 went through. The AI expected about 18."** Counts, because a rate
is the compact form and the wrong one for somebody meeting the page — *57% of
what, out of how many, expected by whom* are three questions a percentage does
not answer and a count answers at once.

**Nothing was deleted.** Every figure that used to be on the surface is one
disclosure down and all of it is still in the DOM, which is where browser
find-in-page reaches it:

| Was on the surface | Is now |
| --- | --- |
| `claimed more than it delivered` and its sentence | *The exact numbers, and what is left out of them* |
| `judged`, `survived`, `mean claim`, `undos (not scored)`, the three unjudged counts | same disclosure, unchanged |
| the ten-band confidence table and its two caveats | *How sure it said it was, band by band* |
| the by-policy breakdown | *Careful: your rules changed while these were judged* |
| the `unattributed` footnote | inside the band disclosure, where the bands it qualifies are |

The second-worst screen on the page was the policy breakdown, and it needed more
than a fold. It exists to raise a caveat — *these numbers pool gates that did
not agree* — so hiding it entirely would hide the warning with the table. The
warning is now the summary line itself, so a **closed** disclosure still says
what is wrong; the table it opens onto is unchanged.

**The misses moved up, above the tables.** They are the only thing on the page
that names a class of change a reader can act on, and the bands are how the
verdict was computed — which is a different question and not the first one.

### What got renamed, in full

| Was | Is |
| --- | --- |
| `/portal/calibration` | `/portal/trust` (308 from the old path, query string carried) |
| nav `Calibration` | nav `Trust` |
| `h1` `calibration` | `Can you trust the AI?` |
| `where the grade was wrong` | `Where it was wrong about itself` |
| `a band reads as on the mark and is not` | `The table below looks better than this is` |
| `by the gate that judged` | `Careful: your rules changed while these were judged` |
| `claimed 94% · rejected` | `Said it was 94% sure · turned down` |
| `claimed 10% · survived` | `Said it was 10% sure · went through anyway` |
| `off by 94%` | `94% wide of the mark` |
| `sure about a change the Gate would not take on trust` | `sure about a change your rules would not take on trust` |
| `sure, the Gate agreed, and a person said no` | `sure, your rules agreed, and a person said no` |
| `The journal could not be read.` | `We couldn't check the AI's track record.` |
| `No claim on this page has been settled yet.` | `Nothing has been answered yet, so there is nothing to check.` |

**The Gate is "your rules" throughout.** That is not a new coinage — it is what
`vocabulary.ts` has called it since the 19 August run, in the sentences the
review queue already shows. This page was the last one still saying *the Gate*
at a reader who has not met it.

### The two readings cannot disagree

`readGap` — the technical sentence — is untouched, and `readTrust` is the plain
one derived from the same `gap` and the same `isOnTheMark` tolerance. A test
asserts they agree in tone across every band including both edges of the
tolerance, so a project the headline calls over-sure cannot be a band the table
calls settled. A second test asserts **no digit appears in the verdict's three
sentences**: a verdict is a statement about the AI, and the moment it contains a
percentage it is the thing it replaced.

## The high-schooler test

*Could somebody who has never read a decision record say what happened and what
they should do next?*

**Yes, on this screen.** What happened: the AI said it was sure 23 times, it was
right 13, and it is over-rating itself. What to do next: read what a change does
before accepting it — and, more usefully, the three groups underneath say
*which* changes it keeps being wrong about (ones that cannot be undone, ones a
person turned down anyway, one it hedged on that was fine).

Where it stops: `house-rules-strict`, `aaaaaaaa:1111111111111111` and a
`treeId` are all still on the page, behind disclosures. That is correct — they
are what the technical record is *for* — but it means a bright high schooler
gets an answer and a reviewer gets the evidence, which is the split the
redirection asked for rather than a screen written down to one of them.

## What this tells a developer that they could not get elsewhere

The strongest answer this lane has had. Their repository knows what the code
says. `git log` knows what changed. Neither knows **what the AI claimed about
itself before the change was judged, or whether the claim held.** That fact only
exists because the runtime records a self-graded confidence and then records
what became of the proposal, and the pairing is what 0007 made self-grading
conditional on.

What a developer gets, in one sentence and then in evidence: *your AI is
over-rating itself specifically on changes that cannot be undone, six times this
window, at a mean claim of 91%.* No linter, log or diff produces that. Before
this run the same data was on screen and required knowing what a confidence gap
was to read.

## Tests

`pnpm install && pnpm verify` **green** — build, typecheck, both suites,
`next build`.

| Suite | Files | Tests |
| --- | --- | --- |
| `@loom/runtime` | 101 | 1489 (untouched by this diff) |
| `@loom/app` | 85 | 1047, up from 1025 |

**22 new tests**, nothing weakened, nothing skipped:

- `_lib/calibration-view.test.ts` — 9 new (22 → 31). `readTrust` in each of its
  four states, the tone agreement with `readGap` across eight gaps, the
  no-digits property, and `plainScoreline`'s counts, singular, null and
  rounding.
- `portal/trust/_components/trust-summary.test.tsx` — 6, new file. The verdict
  and next move on the surface, the scoreline, **every one of the seven figures
  still present** inside the disclosure, the disclosure being closed, the
  technical reading kept beside the numbers, and no scoreline when nothing was
  judged.
- `portal/calibration/[[...rest]]/redirect.test.ts` — 7, new file. The bare
  redirect, the scope carried, extra and repeated parameters, a valueless one
  dropped, a deeper path, and encoding.

`guarded-pages.test.ts` gains the new redirect to its named exemption list —
it renders nothing and reads nothing, the same standing `/portal/trees` has.

The redirect test is the one that earns its place. A 308 that drops `?tree=`
still redirects, still renders, and quietly widens a link about one page into a
verdict over all of them — the failure looks exactly like success.

A local runtime rebuild (`pnpm --filter '@loom/runtime' build`) was needed once
before the app suite would resolve `@loom/runtime/write` — the same stale-`dist/`
symptom the last two portal reports flagged, same fix.

## Found while building

**Two portal pages were rendering `kept.No database` with no space.** A
`<strong>` that ends a source line loses the space between it and the text on
the next line — JSX strips the trailing whitespace before joining them. It has
been on `/portal/pages` since that notice was written, and this run reproduced
it by copying the shape. Both now use `{" "}`. Filed, with the general lesson:
anything checked only by eye is checked only on the runs where somebody looks.

## What I did not do

- **`/portal/audit` and `/portal/activity` still speak the runtime's words.**
  The brief's own instruction is to rename as I touch each surface rather than
  in one sweep. `audit` is a compliance word for what a person calls history,
  and it is the next candidate.
- **`_lib/calibration-view.ts` and `_lib/calibration-misses.ts` keep their
  names.** They read a `CalibrationReport` from `@loom/runtime/telemetry`; a
  module named after the runtime type it maps is not the problem the
  redirection is about, and renaming them would churn the diff without changing
  a word anybody reads.
- **`src/` is untouched**, and nothing was wanted from it. Every export used
  here — `calibrationOf`, `episodesOf`, `describeTelemetryError`,
  `rulesetContinuityOf`, `verdictOf` — is public, which is 0031's own
  requirement of itself.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an Accepted record. The route rename is a portal surface decision.
- **No follow-up scheduled.** Token discipline.

## Recommendations

1. **The demo-scoped journal.** Third run in a row where the only way to show
   this page is a temporary route over a fixture fold. It is the change that
   would let you — or anyone arriving through a pull request — actually use a
   telemetry surface, and it is in my lane whenever it is worth a run.
2. **`Trust` as a nav label** is my call and it is the one word here I would
   most like overruled if it reads as over-claiming. The page measures one
   thing (whether the AI's self-grade has held up), and "trust" is what a person
   is trying to decide with it. `Accuracy` and `Track record` were the two
   alternatives.
3. **Nothing blocking.**
