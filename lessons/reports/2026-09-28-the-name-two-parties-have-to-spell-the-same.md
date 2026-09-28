# 2026-09-28 — The name two parties have to spell the same

**Chose a lesson, not machinery.** The alternation the brief allows would have
pointed at course plumbing this run — yesterday landed lesson 29 — but the two
seams yesterday's report nominated were both weaker than the one reading
`decisions/` turned up, and one of them (a lesson's *Prerequisites* list against
the lessons its questions cite) is a check on this lane's own files rather than
on Loom. Part V is the part of the course that is still moving; a thirteenth seam
that teaches a live product decision beats a fourteenth check on the markdown.

**Landed:** [lesson 30 — *Rendezvous: the name two parties have to spell the
same*](../30-rendezvous.md), Part V's thirteenth seam. Seven exercises, all
executed. Set AI. Roughly **45–60 minutes** to work through, a little under 29 —
the Predict section is four questions and none of them is a grid.

`pnpm install && pnpm verify`: **green, exit 0**, on a `dist` and a `.next`
deleted first, with the status written to a file as the last thing on its own
line and read in a separate command.

| | `main` at `809a970` | this branch |
| --- | --- | --- |
| runtime | 166 files / 3,238 | **166 / 3,238** — `src/` was not opened |
| application | 320 / 5,560 | **320 / 5,563** |
| findings | 861, 0 malformed | **862**, 0 malformed |
| prerendered pages | 114 | **116** |

The `main` column is the figure `#435` measured on the same commit this branch is
cut from, rather than a number re-derived here. **+3 tests, no new file**, and all
three are generated rather than written: `run.test.ts` and `transcripts.test.ts`
make one row per written lesson from the syllabus, and `declarations.test.ts`
makes one per held fence — measured by running the lessons and docs-architecture
suites against a stash of this branch, 326 → 329. The two new pages are
`/lessons/30` and Set AI's own page.

## The seam, and why it is the sharpest one Part V has had

A binding has three parts and the lesson's whole argument is that **two of them
are references and the third is an agreement.**

| part | who holds the other end | when it is wrong |
| --- | --- | --- |
| `source` | the data registry | refused, `no-such-source` |
| `params` | the source's own schema | refused by the schema |
| the **name** | *nobody* | resolved cleanly, and read by nobody |

The first two can be checked by asking whoever holds the other end. The third
cannot, because there is no other end: the tree writes a string, a component
looks up a string, and no third party has a copy. 0181 states the asymmetry in a
table and the lesson is that table followed all the way down.

What makes it a *lesson* rather than a feature note is the cost ordering, which
exercise C prints: the two mistakes a registry can refuse are cheap and **loud**
— the source is never asked and the reader is told *This list could not be
loaded.* The mistake nothing could refuse pays for the whole round trip, gets a
correct answer back, and draws the primitive's empty region, which is a state it
has on purpose for an author who has not connected a source yet.

And the reason it is not a checker-quality problem is the one line I would keep
if the lesson lost everything else: **looking up a key that is not there is not
an error in JavaScript; it is `undefined`.** The failure is the absence of an
event, which is why no care inside the component reaches it — the component that
handles a missing answer gracefully and the component that was never given one
are executing the same line.

## The two records, and the half that only shows up when you go to use it

0181 shipped `reads` as a list of names. 0184 widened an entry to *a name or the
prop that gives one*, and the reason is worth the report: **nothing in the
library could have used the first form.** Both bound primitives read
`loom.data[binding ?? "…"]`, so a fixed list would have had to write the default
and then be wrong about every node that set the prop.

Exercise F is that claim executed and it came out stronger than 0184 states it.
A plain list of names is not a weaker version of the right check — on the exact
pair of nodes the feature exists for, it is **inverted**:

| the node | a fixed `["entries"]` says | the prop-named form says | what the page draws |
| --- | --- | --- | --- |
| renamed to `rows`, answered under `entries` — **broken for ever** | nothing | `data-unread` | nothing |
| renamed to `rows`, answered under `rows` — **correct** | `data-unread` | nothing | two posts |

Silent on the broken page, loud on the working one. A checker wrong in one
direction gets tuned; a checker wrong in both is measuring a different quantity
than its name claims, which is where lesson 29 ended and is the through-line
between the two lessons.

The generalisation the lesson closes on comes from there: **when you write a fact
down so that something can check it, the first question is not what the fact is —
it is what the fact is a function of.** If the answer includes something that
varies per use, the declaration is a rule and not a value.

## Found while teaching, and it is the biggest thing this lane has filed

Exercise D was written to answer Predict 1(d) — *what does the Gate do with the
insert?* — and the intended answer is the first block: a misspelled primitive
**type** is refused before the change is written, and a misspelled binding
**name**, one character in the same JSON, is accepted at medium stakes.

Then I wired 0179's props floor to make the comparison fair, and the third row —
a `loom.feed` with a **correctly spelled** binding to a registered source with
valid params — came back `invalid props: 1`, **critical**, rejected:

```
    neither misspelled   unknown types: 0  invalid props: 1  stakes: critical gate: rejected
      Unrecognized key(s) in object: 'loom:data'
```

**The render path splits the runtime's reserved keys off before it validates
props.** `render.ts` says so in as many words, and every schema in the library is
`.strict()` on the strength of it. **The write path does not.** `invalidPropsIn`
hands each node's props to the vocabulary as they are, and `propsVocabularyFor`
is a one-line adapter onto the same strict schemas — so the floor refuses the key
the runtime itself put there.

Measured rather than reasoned, three ways, before it was written down:

- **99 of 99** starter primitives refuse a node carrying `loom:anchor`, and the
  same holds for `loom:data`, `loom:submit` and `loom:theme`.
- **Insert** a node carrying one → rejected. **Configure** a node that had none
  into carrying one → rejected. **Configure a node already carrying one** → 0
  invalid props, `high`, `requires-confirmation`.
- The deployments in this repository that wire the floor are `(portal)` and
  `(marketing)`'s adapt path.

The third bullet is why nothing has noticed, and it is a nice piece of
mechanism: `introducedInvalidProps` counts only nodes that were not already
failing, which is a good rule — and its effect here is that the only changes that
pass on bound nodes are the ones on nodes this check had already condemned.

The sentence that makes it worth a lesson's attention rather than only a bug
report: `src/interpretation/prompt.ts` teaches a model to write
`{"loom:data":{…}}` inside a node's props, in those words, and 0181 and 0184
spent two records making binding names available to a model *so that it could
write new ones*. On a deployment with the floor wired, the write path refuses, at
its highest stakes, the exact JSON the prompt asks for.

**Filed for `Loom daily build`, not fixed.** `src/` is not this lane's. The entry
carries the reproduction, the three measurements, the two design questions a fix
would have to decide (where the reserved-key split lives; whether a reserved key
on the wrong node should still be refusable at the write path, since
`theme-misplaced` is a real fault the floor could catch if it knew the
namespace), and the four-row test that would have caught it.

In lesson 28's vocabulary it is the plainest specimen yet: **one fact — *reserved
keys are not props* — implemented twice, with no comparison between them, and the
copy that is wrong is the one no rendering test executes.**

## Every exercise executed, and then executed again from the lesson

Written into `src/scratch.test.ts`, run with `pnpm vitest run
src/scratch.test.ts`, deleted before committing. Then the step that actually
catches transcription errors: the seven `ts` fences were extracted **from the
finished markdown**, concatenated in order, run, and every line of every plain
fence compared to the printed output programmatically.

That caught one, and it is exactly the kind a careful reading does not: exercise
C's third block said `data-unavailable` where the program printed `data-unread` —
a wrong diagnostic code inside a correct sentence, in the block whose entire
purpose is that the third mistake is reported differently from the first two.
Nothing about the line looks wrong. It was wrong.

The course's own runner then compiled the same program against `src/` during the
build and `transcripts.test.ts` compared all seven blocks — green on the first
run, including the two blocks whose last line is an empty string.

Two transcript decisions taken deliberately:

- **Two blocks print `the page says: ""`.** An empty string is the lesson's
  subject — a page that looks finished and is empty — and a transcript that
  elided it would elide the finding. `JSON.stringify` around the page's words is
  what makes the emptiness visible in a terminal at all.
- **Exercise G prints the size of the primitive library on a line of its own**
  and the prose under it says *two, out of whatever the first line printed*. That
  is lessons 22 and 24's precedent followed on purpose: the 13 September finding
  about transcripts pinning the library size has cost three lessons an edit from
  outside this lane, and it does not need to cost a fourth.

## The spacing work, and the pins

**Set AI**, nine questions, interleaved with 09, 18, 22, 24, 28 and 29. Heavy on
28, because this lesson is its three-sources rule applied until only one source
is left; heavy on 24, because *absence is not emptiness* is what let the
declaration ship into a library where nothing had declared. Question 8 is the
one I would keep: *a tree names a primitive type that does not exist, and a tree
names a binding name nothing reads* — say what each costs, where each is refused,
and then state the reference/agreement distinction in a form that classifies a
third case.

`RECOGNISED_TRANSCRIPTS` goes 118 → **125**, with the reasoning in its doc
comment. `schedule.test.ts` and `queue.test.ts` gain AI, and the queue's
whole-course length goes 34 → **35**. `syllabus.ts`'s comment goes thirty-four →
thirty-five.

`declarations.test.ts` gains a row for `BindingDeclaration`, which lesson 30
prints whole out of `src/render/reads.ts` — so that fence is now held complete
and a member added to it in `src/` is this lane's to print. Worth noting that the
check found the fence on its own and named its member count; nothing was
hand-registered except the row.

**And a small correction in the same file.** Its doc comment said *the seventeen
fences this check reaches* while `HELD` had eighteen rows, and
`declarations.ts` carried the same number in its own header. Both now say
nineteen. It is this lane's file and the count is stale by exactly one, which is
how a hand-kept number goes — the module's own subject, one directory up.

## What is next

**Part V's fourteenth seam.** Two candidates, both carried over and both still
uncompared:

- **A composition's stated `max` against the magnitudes inside it** — lesson 27's
  exercise D as a seam of its own. It has been on this list for two runs and it
  is the one with a finding already attached.
- **A lesson's *Prerequisites* list against the lessons its questions actually
  cite.** Still true, still cheap, and now with one more twenty-nine-entry list
  added by copying the one above it.

**Or the piece of course machinery yesterday's report named**, which this run
leaves more attractive than it found it: `transcripts.test.ts` has no way to say
that a block's red is *expected*, and lesson 29's exercise C is the one block
that has signed up for it. A drifted line and an expected drift still report
identically. That is lesson 24's subject applied to this lane's own suite, and
it is small.

**Not next, and worth saying so:** nothing in this lane should touch the props
floor. It is filed, it is reproducible, and the two design questions in the entry
belong to whoever owns `src/`.
