# What an ask from here may do

**Routine:** `Loom demo` · **Branch:** `demo-11-what-an-ask-from-here-may-do` ·
**31 August 2026**

The eleventh run of this routine, and the sixth in a row whose defect was a fact
the runtime had computed, typed, tested and never put on the screen in a form a
person could read.

This one is about **the last hyphenated code left in the light**, and about the
sentence beside it that had been asking, for eleven runs, what that code meant.

---

## What a stranger could not understand before this run

I drove the built page as somebody who has never heard of Loom, at 1440×900 and
390×844: land, press the green button, meet the hold, press **Apply this
change**, press **Put it back**. This is the card the primary press produces, as
it stands on `main` this morning, with nothing left out:

> **Waiting on you**                                        `user-instruction`
> *“Take the numbers band off the page.”*
> Loom will not make this change until you say yes.
> asked by a demo visitor
> **Riskier than a request from here is allowed to be without asking.**
> [ Apply this change ] [ No thanks ]

Read the last two lines together. The rule the Gate cited turns entirely on the
phrase **“from here”** — it is the whole of its claim — and **nothing on the card
said what *here* was.** A stranger is told a request from somewhere is allowed a
certain amount of latitude, is not told what the somewhere is or what the amount
is, and is then asked to make a decision on that basis.

The one thing on the card that came close was `user-instruction`, set in
monospace in the top right corner, at the size of a footnote, on the first card
this surface ever shows anybody. It is the runtime's enum for the *kind of act*
the ask was. As a token in a corner it read as a serial number.

### It is not a label. It is the input the rule read.

This is what makes it worth a unit rather than a tidy-up. `autoApplyCeiling` is
**keyed by origin**, and `demoPolicy` sets `user-instruction` to `low` on
purpose — `session.ts` says why: under the shipped default every change this demo
offers would auto-apply and the hold would never appear. So the Gate's comparison
on this exact card is *this origin's ceiling* against *these stakes*, and the
runtime is explicit about why an origin should have a ceiling at all:

> The highest stakes each origin may apply without asking. **An explicit human
> instruction earns more latitude than an adaptation nobody requested.**
> — `src/runtime/policy.ts`

That is one of the genuinely distinctive ideas in this project — *who asked
changes what may land alone* — and the demo was demonstrating it as a hyphenated
string with no verb.

**Everything needed was already exported.** `ceilingFor(policy, origin)` is the
function the Gate itself calls, public from `@loom/runtime`. `ASK_ORIGINS` in
`(portal)/_lib/vocabulary.ts` has translated all four origins into sentences for
weeks. `STAKES` names the four levels in plain words. The portal's own two
screens already settled where the code belongs: History's `whoAsked` and
Activity's `describeAsk` both print the actor as a sentence and file the origin
under `technical`. **The demo was the one surface with the code in the light and
no translation anywhere.**

Seventh instance of the diagnosis this lane filed on 25 August, and the first
where a sentence on the same card was pointing straight at the hole.

## What a stranger can understand now

Same press, same card, on this branch:

> **Waiting on you**
> *“Take the numbers band off the page.”*
> Loom will not make this change until you say yes.
> asked by a demo visitor
> **Riskier than a request from here is allowed to be without asking.**
> *Somebody using the site asked for this, and Loom will not let an ask like that
> land on its own above Low risk.*
> [ Apply this change ] [ No thanks ]

The rule sentence now has a referent instead of a dangling *here*. A stranger who
reads those two lines has been told, without meeting a single piece of
vocabulary: **what kind of ask this was, that Loom treats kinds of ask
differently, what this kind is allowed to do unsupervised, and that this ask
asked for more.** That is the Gate's whole reasoning, in the order it happened.

And the code went where the technical record goes. Open *Show the full record*
and the disclosure now opens on a section it never had:

```
THE ASK
origin        user-instruction
asked at      2026-08-31T20:02:54.236Z

THE VERDICT
decision      requires-confirmation
rule          stakes-above-ceiling
policy        demo
ceiling       low, for user-instruction
fingerprint   71ff452d:c5edb7b…
```

Nothing was removed to make room. The origin is still on the card, in the
runtime's own word, one click away — and `asked at`, which the record has carried
since the surface was built and neither half of this card had ever printed, is
beside it.

## The changes, in order of how much they move that

### `_lib/ceiling.ts` — new, and most of it is about when to say nothing

`ceilingNote(record)` returns the sentence and its technical twin, or `undefined`.
It returns `undefined` on seven of the eight rules the Gate can cite, because
only `stakes-above-ceiling` reads a ceiling — a card whose verdict was
*within-policy* would be answering a question the Gate never asked. That is the
same restraint `answer.ts` uses for the visitor's yes: one sentence, on the one
state where it is the missing term.

Three decisions inside it are load-bearing:

- **The ceiling is asked of the runtime, not read off the policy.** `ceilingFor`
  is what the Gate calls, `?? "low"` fallback and all. A surface that indexed
  `autoApplyCeiling` itself would claim a different ceiling than the Gate applied
  the first time an origin had none.
- **The words come off the shared tables.** `ASK_ORIGINS[origin].label` and
  `STAKES[ceiling].label`, so a rewording in the portal fails a test here rather
  than leaving two surfaces describing one verdict differently. This surface
  writes no vocabulary of its own.
- **It stays quiet on a record decided under another policy.** The demo runs one
  policy, so this is a guard against a future rather than a live case — but the
  alternative is telling a visitor what *this* policy allows about a verdict
  another policy reached.

### `_components/record-card.tsx` — one span out of the light, one line into it

The origin span is gone from the header, the sentence sits directly under the
rule it completes (quieter than it, because it is that sentence's second half
rather than a claim of its own), the disclosure gains **the ask** — the only
section on the card that renders unconditionally, so a record that never reached
a verdict cannot drop the field rather than move it — and **the verdict** gains a
`ceiling` row beside the `policy` it came from.

## Decisions taken that were not specified

- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record: it renders a field the record already carried, through
  a function the runtime already exported, in words a shared table already had.
  Nothing was escalated and nothing was left out for review.
- **`asked by a demo visitor` stays, unchanged, directly above the new
  sentence.** They overlap in feel and not in fact — one names the person, the
  other names the act — and 0017 is precisely that those are two fields. The
  demo is where a stranger is meant to learn the difference.
- **The sentence is not added to the auto-applied card**, though `within-policy`
  is the other half of the demo's two-act structure. Its rule sentence already
  ends *“so it went ahead on its own”*, which is a complete thought; a ceiling
  it did not consult would be reasoning nobody did.
- **The stake level is not restated.** *How risky was this* is #202's line on
  this card and it is the other half of the same comparison. If both land, they
  compose — the level from one, the limit from the other — and if #202 lands
  first, nothing here needs changing.

## Real test numbers

`pnpm install && pnpm verify` from the repository root — **one failure, and it is
not this lane's.**

| suite | files | tests | result |
| --- | --- | --- | --- |
| `@loom/runtime` | 111 | 1741 | all green |
| `@loom/app` | 135 | 1974 | 1973 green, **1 failed** |
| `app/(demo)` alone | 17 | 154 | all green |

The failure is `app/(marketing)/_lib/facts.test.ts` — `FACTS.decisions` says
`"94"` and `decisions/` holds 95 records. **It fails identically on `main` at
`3a57feb`**, verified before this branch existed, and it has been red since 28
August. It is another lane's file, #174 already carries the bump, and no test was
weakened to get around it. Filed again, dated on the standing entry.

**Eleven tests are new**, all in this lane:

- **`_lib/ceiling.test.ts` — 8 new, a new file.** That the level named is the one
  the policy actually sets (asserted through `ceilingFor`, so a retune rewrites
  the sentence rather than falsifying it); that both halves come off the shared
  tables; that no runtime code survives into the sentence, matched on word
  boundaries so a future wording containing *allowed* is not read as containing
  *low*; that `developer` — an origin the policy trusts further — produces a
  different sentence from the same function, which is the fact the demo exists to
  show; and three states it must stay silent on.
- **`_components/record-card.test.tsx` — 3 new.** That the sentence is in the
  light and the ceiling row is in the disclosure; that the origin code is in the
  disclosure and not in the light; and that a change the ceiling did not decide
  grows no sentence about one.

**Two of the three card tests were confirmed to fail against the unmodified
component** before being kept — 2 failed, 11 passed. The third is a negative
guard and passes both ways by construction; it is there to fail the day somebody
prints the sentence unconditionally, and I am saying so rather than implying it
was earned.

`src/` was not opened. No framework gap was found and no primitive was wanted.

## Findings

**Closed:** none.

**Filed:**

- `@jonathanbravecredit`: **five demo pull requests are open at once and four of
  them edit this one card.** #170, #178, #186, #194, #202. The lane branches off
  `main` and never stacks, correctly, so every run since 26 August has been
  diagnosing the 25 August card — and four of the raw strings still in the light
  today are already fixed on branches nobody has merged. Recommendation in the
  entry: merge in number order, then let the next run measure the merged card
  whole and cut what the five made redundant. That is the one job this lane
  cannot do for itself.
- `@jonathanbravecredit`: `main` red on `FACTS.decisions`, fourth consecutive
  day. Dated on the existing entry.
- `Loom demo` → itself: the diagnosis, seventh instance, with the new wrinkle
  that a sentence on the same card had been pointing at it.
- `@jonathanbravecredit`: `21st.dev` still `EGRESS_BLOCKED`, verified again.
- `@jonathanbravecredit`: `docs/rollout.md:19` and the brief's opening task, both
  ten days stale. Eighth consecutive run.

## The one thing I did not fix, said plainly

**`WHAT THIS WOULD CHANGE` is still `delete loom.stat-grid / loom.page / and 3
nodes under it`** — three more raw strings, in the light, on the same card, two
inches below the code this run moved. It is the single ugliest thing left on the
screen and it is visible in every screenshot here.

I did not touch it because **#186 already fixes it** and has been waiting since
28 August. Writing a second plain-language pass over the same block on a branch
that cannot see the first would produce two competing translations and a
conflict the maintainer has to arbitrate, which is worse than the defect. Same
for the spotlight chip landing on the quote (#178) and `“Undo revision 1.”`
(#170). This is the concrete cost of the pile, and it is why the merge-order
finding is the one I would act on first.

## Open questions

Nothing blocking. Two carried, unchanged:

- **A refusal can say a repair was declined and this surface still does not say
  it** (framework finding, 21 August).
- **“Ask about just this”** — the scope control, from this lane's 22 August
  finding. `scopeNodeId` is on `EditIntent` and no surface offers it.

## The visuals

| | |
| --- | --- |
| [before](2026-08-31-demo-what-an-ask-from-here-may-do-before.png) | `main` this morning. `user-instruction` in the corner of the card, and a rule sentence whose *“from here”* points at nothing |
| [held](2026-08-31-demo-what-an-ask-from-here-may-do-held.png) | the same press on this branch. The corner is clean and the rule has its second half |
| [record](2026-08-31-demo-what-an-ask-from-here-may-do-record.png) | *Show the full record*, open: **the ask** at the top, `ceiling  low, for user-instruction` in **the verdict** |
| [applied](2026-08-31-demo-what-an-ask-from-here-may-do-applied.png) | after pressing *Apply this change*: the whole account in one card — what was asked, what the rule read, what an ask from here may do, and that a person allowed it |
| [phone](2026-08-31-demo-what-an-ask-from-here-may-do-phone.png) | 390×844. The sentence wraps to two lines and the card header is one badge rather than a badge and a serial number |

Every screenshot is this branch's `next build` output driven in Chromium — not
the preview, which this environment cannot open (`vercel.app` is not on the
sandbox's egress allowlist; the standing 19 August finding).

**To see it yourself:** open `/demo`, press the green button, and read the two
lines under *asked by a demo visitor* without scrolling. Then open *Show the full
record* and look at the first section and the `ceiling` row — that is the same
fact, in the runtime's words, one click down.
