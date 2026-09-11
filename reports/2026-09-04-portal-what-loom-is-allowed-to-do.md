# 2026-09-04 — "What Loom is allowed to do here"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-22-what-loom-is-allowed-to-do` (→ `main`).

Visuals — the real screen, from a production build of this commit, in a signed-in
browser, against a page **a live model actually changed during this run**:

| | |
| --- | --- |
| [The screen](2026-09-04-portal-what-loom-is-allowed-to-do.png) | 1280px |
| [One rule, opened — the click the technical record is one of](2026-09-04-portal-what-loom-is-allowed-to-do-open.png) | 1280px |
| [a phone](2026-09-04-portal-what-loom-is-allowed-to-do-phone.png) | 390px |

**How honest these are, stated plainly.** `LOOM_ANTHROPIC_API_KEY` is present in
this environment, so nothing was staged. Five requests were typed into the real
prompt box against the seeded tree — *"Change the heading to say Autumn
arrivals"*, *"Make the intro paragraph warmer and mention free returns"*,
*"Delete the card and everything inside it"*, *"Rewrite the whole page so it
reads like a shop rather than documentation"*, *"improve it"* — and every count
on screen is a fact about what the Gate did with them. Four produced a judgment;
three went through unattended and one is sitting in the review queue.

---

## What was asked

**No maintainer comment is open on any portal pull request.** #219, #227 and #234
carry only the deployment bot's comments and my own, so the plan decides.

The plan's redirection — *plain language by default, the technical record one
click away, nothing removed* — has now been applied to every screen in the
portal. `/portal/sign-ins` was the last one in the runtime's voice and #234
rewrote it. The rename queue is empty in the sense that matters: no screen leads
with a word out of `src/`.

So this run went after the other half of the brief: **what does the portal tell a
developer that they cannot get from the repo, the logs, or `git log`?** — and
found a question the portal had never answered at all.

## The gap

Every screen in this portal answers a question about something that already
happened. The review queue says what is waiting. Activity says what was asked.
History says what changed. Trust says whether the confidence held up. Checkup
says whether it still adds up.

**Nothing answered the question underneath all of them: what is Loom allowed to
do here, before anybody asks it for anything.**

That is the first honest question a person has about a system that lets an AI
edit their pages, and the portal's answer was to make them ask for a change and
find out. It is also the only question in the list whose answer exists on a
deployment where nothing has happened yet — which is to say, on the day somebody
new arrives, every screen the portal has was empty.

The rules were not hidden. They were visible **one instance at a time**: a review
card says *"Riskier than a request from here is allowed to be without asking"*
about the one change in front of you. Fifteen of those, read over a fortnight,
is not the same as being told the arrangement.

## What shipped

**`/portal/rules` — "What Loom is allowed to do here".** Eight cards. Seven are
rules the Gate consults; the eighth is the measurement the two rules about risk
are read against, and it says on its face that it decides nothing.

Each card carries three things, in this order:

1. **What the rule does**, in a person's words, with this deployment's own
   numbers in it — *"Below 70% it will not apply one by itself, however small —
   it writes the change down and asks you instead."*
2. **What it would do when it fires**, as a badge: *Turns the change down* or
   *Asks you first*. This is a property of the rule rather than of any change,
   because the Gate declares each rule with a fixed verdict — which is what lets
   the screen be useful before anything has ever run into one.
3. **What it has actually done** — *"Stopped to ask you about 1 change — 1 still
   waiting."*

And behind one click: the reason code the record keeps, the record's own sentence
for it, the field names and their values, and the caveat that makes the counts
readable — one reason is kept per decision, so each count is a lower bound.

### The half that exists nowhere else

The rules themselves are in a repository. The **record** is not.

`git log` can show you that somebody set `minimumConfidence` to 0.7. Nothing
outside Loom can show you that the setting has since stopped four changes, that
you said yes to all four, and that it is therefore very likely stricter than you
need. That last sentence is the one thing this screen recommends, and it is the
only recommendation on it — after four approvals with no refusal and nothing left
unanswered, a card says the rule looks stricter than it needs to be and stops
there. 0031 makes a reading of the runtime's own judgement a reader: it may say
what it sees and it may not act. There is no button on this screen, and a test
asserts there is not.

Two counts are worth naming because they are not obvious:

- **Rescued.** A refusal the AI replaced with something allowed, which then went
  through (0006). A rule the model can always work around costs a round trip; a
  rule nothing gets past stops people. Those are different facts and a single
  "refused: 4" cannot tell them apart.
- **Never reached anybody.** A change the Gate held, whose custody did not
  survive. It is not waiting for you — nothing will ever arrive to answer it — and
  folding it into "still waiting" would send a reviewer looking through a queue
  for something that is not in it.

### One object, not two copies

The policy the screen describes and the policy the write path enforces are now
the same object. `_lib/policy.ts` exports `portalPolicy`; `_lib/write.ts` builds
`fixedPolicy(portalPolicy)` from it and the screen reads it. A page that
hard-coded the framework's defaults would agree with every host that had changed
nothing and be confidently wrong about every host that had — and would look
identical either way. A test parses a *different* policy and asserts the readings
move with it.

The bottom disclosure prints `policyId` and `policyFingerprint`. A change judged
under these rules carries that fingerprint in its own record, so a card on
Activity showing a different one was judged before something here changed. That
is the only way to tell the two apart after the fact, and until now the reader
had a hash on one screen and nothing to compare it against.

### The order is a reader's, and the screen says so

One reason is recorded per decision, so a change that runs into two rules is
counted under whichever the Gate reached first. **That order is not something a
consumer can read** — it is the finding filed on 28 August, and 0018 makes
reaching into `src/` to find out the wrong fix. So the cards are ordered by what a
reader cares about, and each card's disclosure says the count is a lower bound
rather than a tally of every change the rule touched.

## The finding this screen produced on its first run, about this deployment

**Twenty requests were typed into the real prompt box across this run, over four
server lifetimes. Not one of them was refused.**

The exact numbers, since a memory store starts empty each time the server
restarts and pooling them would be a claim about one window that is really four.
The batch behind the screenshots is 5 asks → 4 judged, 3 allowed unattended, 1
held. The batch before it — 15 asks against the same seeded tree, cleared by the
restart that picked up this commit's build — was 7 judged and **every one
allowed**, including *"Delete every single part of this page"*, *"Replace
everything on the page with a single card that says nothing"* and *"Take out the
card, the intro, the heading and everything under them"*. Across all four
lifetimes the only thing that ever stopped a change was the confidence rule, once,
and no rule refused anything at any point. The
arithmetic is on the screen: `autoApplyCeiling.user-instruction` is `medium`,
`removalThresholds.medium` is 3 parts and `high` is 12, and the seeded tree has
about ten parts in it. **A visitor can delete a card and everything in it,
unattended, on the deployment the maintainer opens.**

That is not a defect in the runtime and nothing here is misconfigured — it is
`defaultGatePolicy`, working exactly as documented. It is a fact about this
deployment that nobody could have read anywhere until today, and it is precisely
what the screen is for. Filed in `FINDINGS.md` rather than fixed, because
choosing this portal's policy is a decision with a reader on the other side of it
and I would rather it were made deliberately than by me on the way past.

## Two defects a screenshot found and the tests did not

Consistent with every run since 20 August; **eighteen across eleven runs** in this
lane's own count.

1. **The headline called one change "the rest".** With four judgments and three
   accepted, the page read *"3 went ahead with nothing objecting, and the rest ran
   into one of the rules below"* — over a record where the rest was one change.
   The sentence is `headlineOf` now, out of the JSX and under test, with all four
   arithmetic cases written down: nothing judged, all allowed, none allowed, and
   the mixed case that was wrong.
2. **The way out came between the heading and its own sentence, on a phone.**
   `justify-between` on a heading and a link puts them on one line at 1280 and
   wraps the link underneath the heading at 390 — so a reader met *what am I
   looking at → what else can I do → what this is*. The link now follows the lead
   paragraph at every width, and `reading-order.test.ts` pins the order and bans
   `justify-between` on this screen.

**`/portal/pieces` has the same phone defect**, in the same shape, and it is in
this lane. Not fixed here: it is a different screen and this diff is already one
unit. Filed.

Neither is a bug a browser could not have shown in three seconds. The 23, 24 and
25 August recommendation — that a screenshot at two widths belongs in
`docs/routines.md` rather than in this lane's habit — stands.

## Tests

`pnpm install && pnpm verify` **green** — typecheck, both suites, and `next
build` across all five route groups. Nothing weakened, nothing skipped.

| Suite | Files | Tests |
| --- | --- | --- |
| `@loom/runtime` | 119 | 1860 (untouched by this diff) |
| `@loom/app` | 162 | 2544 |

**47 new tests, in four new files:**

- **`_lib/rules-view.test.ts` — 11.** The one that earns its place is
  **coverage**: every reason code the Gate can record is named by exactly one card,
  asserted against `dispositionReasonCodeSchema.options`. A rule added to the
  runtime with a new code fails this test, which is the moment somebody can still
  write the sentence for it — the alternative is a rule refusing changes on a
  deployment whose own screen says nothing about it and gives no sign anything is
  missing. Then: the readings move with the policy they are given; an origin the
  host never set still gets a row, through the runtime's own `ceilingFor` rather
  than a default this file guessed at; and the plain-language guard, which bans
  `gate`, `disposition`, `delta`, `node`, `primitive`, `revision`, `proposal`,
  `policy`, `stakes`, `provenance`, `telemetry`, `episode`, `intent` and `custody`
  from anything shown unasked while requiring the field names one click down.
- **`_lib/rule-record.test.ts` — 21.** The fold, including the four ways a hold
  can end and the difference between a repair that went through and one that was
  itself refused; and `headlineOf`'s four cases.
- **`_components/rule-card.test.tsx` — 9.** Surface against disclosure, and that
  the card offers nothing to press.
- **`reading-order.test.ts` — 6.** Including the property that separates this
  screen from every other one: **the rules render whether or not the read that can
  fail succeeded.** A refactor that moved the list inside the `page.ok` branch
  would break no component test anywhere and would turn the one screen that works
  on an empty deployment into another screen that shows a failure notice.

## The high-schooler test

*Could somebody who has never read a decision record say what happened and what
they should do next?*

From the first screenshot, unaided: *Four changes have been judged. Three just
happened; one was stopped because the AI wasn't sure enough of itself, and it is
waiting for me. There are eight rules. Two of them turn a change down outright and
the rest stop and ask me. Nothing has ever hit six of them. If somebody using my
site asks for something, Loom will do it on its own as long as it isn't too
risky — and I can see exactly where that line is.*

Where it stops, correctly: `stakes-above-ceiling`, `autoApplyCeiling.user-instruction`,
the fingerprint — all of them behind a disclosure, none of them on the way to the
answer.

## What this tells a developer that they could not get from the repo, the logs, or `git log`

**Which of your own rules are doing anything, and what they have cost.**

The policy is in a repository; that half is not the claim. The claim is the
pairing. A threshold in a config file is a number somebody chose once. The same
threshold beside *"stopped to ask you about 14 changes — you said yes to all 14"*
is a decision with evidence against it, and there is no log, diff or build output
anywhere that holds the second half. A refusal changes nothing, so it appears in
no diff. A hold lives in the runtime's hold store and has never been seen by a
repository. A repair that rescued a refusal is two records in a journal and
nothing at all in the tree.

And on the first run of this screen it produced a fact about this deployment that
nobody had — that fifteen typed requests, including four that asked to delete the
whole page, were never once stopped.

## What I did not do

- **`src/` is untouched.** Nothing was wanted from it. The Gate's rule order is
  the one thing this screen would have liked and could not have; it is an open
  finding, and reading the file to get it would be exactly what 0018 forbids.
- **No decision record.** A read-only screen over a public export touches nothing
  in the tree schema, the delta model or an Accepted record.
- **Did not change this deployment's policy**, despite the finding above. That is
  a decision with a reader on the other side of it.
- **Did not fix `/portal/pieces`'s phone header**, though it is my lane and the
  same defect. One unit per branch.
- **Did not lift `surfaceOf`/`recordOf` into one module.** This is now the third
  copy, and the two existing ones are on unmerged branches — a shared helper
  landing in three places at once is the collision this repository has already
  paid for. The finding is refreshed with the new count.
- **No follow-up scheduled.** Token discipline.

## Recommendations

1. **Merge something.** Three portal pull requests are open and unmerged — #219
   (the front door), #227 (the checkup's verdict) and #234 (sign-ins) — and this
   is the fourth consecutive portal unit cut from a `main` that cannot see the
   previous three. `/portal` is still a `redirect` on `main`.
2. **Decide whether `defaultGatePolicy` is the right policy for the deployment
   people look at.** The screen now makes the consequence legible; the choice is
   yours.
3. **Nothing blocking.**
