# The card printed both sides of a comparison and never the comparison

**Routine:** `Loom demo` · **Branch:** `demo-16-the-comparison-the-card-made` · **13 September 2026**

The sixteenth run of this lane. It is a copy unit, and the reason it is worth a
whole run is that the copy in question is the sentence the demo's entire
argument rests on.

---

## What a stranger could not understand before this run

**Why the change was stopped.**

Not *that* it was stopped — the badge says **Waiting on you** and the sentence
under it says *"Loom will not make this change until you say yes"*, and both
have been right for weeks. What a stranger could not get is the **reason**, and
the reason is a comparison between two numbers that were both on the card, three
lines apart, in two sentences that never once referred to each other.

Here is the held card as `main` prints it, in reading order:

> **WHAT LOOM WEIGHED**
> How much damage could this do?
> **Some risk.** Worth a look before you say yes, but nothing drastic.
> …
> A change this big is not something Loom may make on its own.
> *Somebody using the site asked for this, and Loom will not let an ask like
> that land on its own above **Low risk**.*

*Some risk.* *Low risk.* **Nothing anywhere on the page says which of those is
higher, or that they are points on the same scale at all.** The visitor is
handed both sides of an inequality and left to supply the operator — and on this
rule the operator *is* the verdict. `stakes-above-ceiling` is the only one of the
eight rules that reaches its decision by comparing two levels; it is the rule the
demo's leading button is tuned to trigger, and it fires on three of the five
presets.

Every term in those sentences is correct and every one comes from the shared
vocabulary. The card was not wrong. It just never said the thing it was about.

And in the middle of it, **the wrong person**: *"Somebody using the site asked
for this"* — said to the person who pressed the button two seconds earlier, four
lines above a sentence that already says *"You said yes."*

## What a stranger can understand now

The same card, same placement, same quiet type:

> A change this big is not something Loom may make on its own.
> *You asked for this yourself, so Loom may act on its own up to **Low risk** —
> and this one came in higher, at **Some risk**.*

One sentence, both levels, the direction between them, addressed to the person
reading it. The Gate's whole arithmetic is now on the card in the order it
happened: **this much risk** → **the rule saying it may not land alone** → **what
alone would have allowed, and which way this one went past it**.

Nothing was added to the card and nothing was taken off it. The line is the same
line, in the same place, at the same size.

## The three changes

### `_lib/ceiling.ts` — the sentence states the comparison

The note now reads `record.stakes` as well as the ceiling, and names both. Two
things about how, because both are the kind of thing that rots:

- **The second term is gated on a real `isAbove`, not on the rule code.**
  `stakes-above-ceiling` guarantees the stakes are above the ceiling — which is
  exactly why the check is made rather than assumed. A card that says *came in
  higher* because a rule code told it to is narrating arithmetic it did not do.
  A record that carries a verdict but no assessment gets the threshold alone,
  which is what this sentence said before there was a second term to say.
- **The level words are still the portal's `STAKES`.** A visitor told *"Some
  risk"* and a reviewer told the same thing three files away are looking at one
  product. That has not moved and must not.

### `_lib/ceiling.ts` — the pronoun, and only the pronoun

`ASK_ORIGINS["user-instruction"]` says *"Somebody using the site asked for
this"*, which is right in a review queue and wrong on the one surface where the
somebody is the reader. It becomes *"You asked for this yourself"*.

**The precedent is exact and it is in this lane already.** `answer.ts` takes
`ANSWERS.confirmed` and overrides only the pronoun, for the reason it states:
*"the two surfaces must agree on what a state is called and cannot agree on who
was in the room."* Same override, same reason, a table that had not had it yet.

It is scoped as narrowly as it can be: **only `user-instruction`**, which is the
only origin `actions.ts` writes. The other three describe somebody or something
that genuinely is not the reader, and they keep the shared label verbatim — held
by a test that walks all three, because that is what keeps this a pronoun
override rather than a second vocabulary growing in this lane by accretion.
Filed for `Loom portal`, whose table it is, as a note rather than a request.

### `_lib/weighed.ts` — a sentence that did not agree with its own number

On the free-text path, with a delta that retained one node, the plain half of
the record read:

> **The 1 piece it takes off the page are kept**, so the exact opposite of this
> change already exists.

The count went through a `plural` helper that inflected the noun and left the
verb behind. Both halves of the agreement are in one function now, because
splitting a number from its verb is how they came apart. The numeral is spelled
at one for the same reason nothing else in that box has a digit in it: *"The 1
piece"* is a field value wearing a sentence.

**It was reachable and it was live.** Found by typing *"Make the headline
shorter and add a line about free parking"* into the box a curious visitor uses,
against the real model, on the built page.

## Decisions taken that were not specified

- **The comparison is one sentence, not two.** A second sentence would have read
  as a second fact; the whole defect was two facts that needed to be one
  relation. The em-dash keeps it a single breath at the size it is set.
- **"Higher", not "one step higher".** The distance is computable and I did not
  compute it. The ladder has four rungs, the gap can be one or three, and a card
  that says *one step* is a claim that needs arithmetic to stay true where
  *higher* needs only the comparison already made.
- **`ceiling.ts`'s module comment is rewritten, not patched.** The 12 September
  finding was explicit that a find-and-replace would leave a paragraph reasoning
  about a phrase no longer in the quotation above it. It reasons about today's
  sentence now, and keeps the history of why the line exists at all.
  `weighed.ts`'s and `record-card.tsx`'s narrations of the old wording are dealt
  with in kind: `weighed.ts` keeps its quotation and says it is quoting what the
  vocabulary printed *then*, `record-card.tsx`'s argument is rewritten because
  its substance was what changed.
- **Three tests that pinned the old wording were replaced, not deleted.** All
  three now read the sentence off `ceilingNote` itself, so they assert the thing
  they are about — where the line sits, what it must not contain — and a future
  reword is a one-file change. See below: they were checked against the defect.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing was escalated and nothing was left out.
- **No file outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and this report. `src/` was not opened at all.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**.

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 143 | 2,415 |
| `@loom/app` | 244 | 4,144 |

Nothing failed, nothing was skipped, **no test was weakened**. The demo lane's
own suite is 29 files, 357 tests.

**Seven tests are new and they were checked against the defect rather than only
against the fix.** Each fault was put back on the branch, one at a time, and the
suite re-run:

| defect restored | what fails |
| --- | --- |
| the `plural` helper, verb left behind | *agrees with its own number when a change keeps exactly one piece* — and nothing else |
| `whoAsked` returning the shared third-person label | *speaks to the visitor who asked, rather than about a stranger* — and nothing else |
| the comparison clause removed | *names both levels the Gate compared* and *says which of the two is higher* |

The two guards are tested from both sides: a record with **no stakes** and a
record whose stakes are **not above the ceiling** each get the threshold alone
and neither is allowed to say *higher*.

The test that let the plural defect through is worth naming, because the lesson
is not about plurals. It read `toContain("1 piece ")` — an assertion on the
subject of the sentence, on its own — so the single test covering that clause
was the single test the broken verb could satisfy. **A subject-and-verb fault is
not visible in a substring of the subject.** The clause is asserted whole now,
at one and at four.

## Findings

**Closed:**

- `Loom demo`'s 12 September entry — *the ceiling line is the second half of a
  sentence the portal has since rewritten*. It asked whether the line still
  earned its place. It does; what was wrong was different and larger, and the
  entry records what the run with the screen in front of it actually found.

**Filed:**

- `Loom demo` (this lane): **the shape** — *a surface that prints two values a
  decision was made by has not shown the decision until it prints the relation
  between them*, and *an assertion on a fragment of a sentence cannot see a
  fault between two of its parts*. Recorded because both recur: the portal's
  checkup and its review queue print levels beside thresholds, and four lanes
  interpolate counts into prose.
- `Loom portal`: **`ASK_ORIGINS` is written for a reader who is not the asker,
  and one surface's reader always is.** A note, not a request — nothing in
  `(portal)` is wrong. It records the second pronoun override in this lane so
  the portal learns it here rather than from a diff, and names the shape that
  would head off a third if one ever comes.

**Re-verified in place rather than re-filed**, because a third of `FINDINGS.md`
is entries filed twice and that is itself an open finding:

- `21st.dev` is `EGRESS_BLOCKED` — **fifteenth consecutive run.**
- The `Loom demo` brief still opens with *"Two problems to fix before anything
  else"*, whose first problem landed on 21 August. **Twenty-three days, ninth
  consecutive run.** The cost is no longer nil and the entry now says so: it is
  the first instruction a fresh session reads, and this run spent its opening
  minutes confirming a move that was three weeks old instead of opening the
  page. One line in the brief buys that back for every future run.

## The one thing I did not fix, said plainly

**The card repeats itself across asks, and I left it alone.**

By the fourth press the rail is 2,123px of cards, and the same ~75 words — the
weighing box, the rule, the ceiling line — are printed verbatim on every one of
them. A stranger stops reading, and what they stop reading is the record, which
is the thing this surface exists to make them read.

I did not touch it because the fix is a design change with a real chance of
being the wrong call — the maintainer's direction is *plain language by default,
the technical record one click away, nothing ever removed*, and collapsing a
repeated weighing into a line with a disclosure is defensible under it but is
not obviously right. It wants a decision rather than a run's judgement. It is
the largest thing I can see on this surface that is not already filed, and it is
in **Open questions** below rather than in the channel, because it is a question
for the maintainer and not a job for another lane.

## Open questions

Nothing blocking. One new, three carried:

- **New — does the record earn its repetition?** As above. My recommendation, if
  it is wanted: on the *second and later* cards, collapse the weighing box and
  the rule to one line each with the full text one click down, and leave the
  newest card whole. That keeps the first card — the one a stranger in their
  sixty seconds actually reads — exactly as it is, and stops the rail from
  turning into a wall by the fourth press. It removes nothing.
- **"Ask about just this"** — the scope control, reasoned out in this lane's
  22 August finding, still the largest unbuilt idea here.
- **The rail and the stage scroll independently** and neither knows the other
  did (7 September). Recommendation unchanged: make the chip a link to its card,
  or leave it.
- **A refusal can say a repair was declined** and this surface still does not say
  it (framework finding, 21 August).

## The visuals

| | |
| --- | --- |
| [before](2026-09-13-demo-the-comparison-the-card-made-before.png) | `main` at 1280×900, two seconds after **Take the numbers off**: *Some risk* in the box, *above Low risk* eight lines below, and nothing between them |
| [after](2026-09-13-demo-the-comparison-the-card-made-after.png) | the same press on this branch — one sentence carrying both levels and the direction |
| [applied](2026-09-13-demo-the-comparison-the-card-made-applied.png) | and after **Apply this change**, where the comparison sits above *"You said yes"* in the same person |
| [phone](2026-09-13-demo-the-comparison-the-card-made-phone.png) | 390×844, the same card |

Both wide frames are the same script driven against two real `next build`
outputs — `main`'s and this branch's — so the only difference in the frame is
the change. Not the preview deployment, which this environment cannot open
(`vercel.app` is not on the sandbox's egress allowlist; the standing 19 August
finding).

**Preview:**
`https://loom-git-demo-16-the-compari-25aa10-jpizzolato36-6341s-projects.vercel.app/demo`

Read off the deployment comment on the pull request rather than opened, for the
reason above.

**To see it yourself:** open `/demo`, press **Take the numbers off**, and read
the two quiet lines under *"A change this big is not something Loom may make on
its own."* On `main` they name a stranger and one number. On this branch they
name you and both.
