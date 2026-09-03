# 2026-09-03 — "Is anybody trying to get in?"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-21-is-anybody-trying-to-get-in` (→ `main`).

Visuals — the real screen, from a production build of this commit, in a signed-in
browser, against a live server whose lockout was **driven rather than staged**:

| | |
| --- | --- |
| [Nothing is happening — which is what a fresh deployment shows](2026-09-03-portal-is-anybody-trying-to-get-in-quiet.png) | 1280px |
| [**Somebody is locked out** — the state this screen exists for](2026-09-03-portal-is-anybody-trying-to-get-in.png) | 1280px |
| [The same screen, all three disclosures opened](2026-09-03-portal-is-anybody-trying-to-get-in-opened.png) | 1280px |
| [a phone](2026-09-03-portal-is-anybody-trying-to-get-in-phone.png) | 390px |

**How honest these are.** Nothing is mocked. `next start` was run against this
commit with a real session secret and a one-entry reviewer roster; a browser
signed in with the key; a second browser context then submitted six wrong keys
from the same address, which is what put `1 of 1 caller is locked out right now`
on the screen. Every number in the second and third pictures — `5 failed
attempts`, `60 seconds`, `less than a minute ago` — is a fact about what that
second browser actually did.

---

## What was asked

**No maintainer comment is open on any portal pull request.** #219 and #227 carry
only the deployment bot's comments and my own. So the plan decides, and the plan's
highest-priority thread is the 18 August redirection: plain language by default,
the technical record one click away, nothing ever removed.

**`main` is green.** `pnpm verify` on this branch is exit 0 across both suites,
and nothing in this diff touches the record count or the lesson runner — the two
things that had `main` red for most of the last fortnight. #216, #217 and #218
landed the backlog, and this is the first portal branch since 25 August that
carries no half of somebody else's fix.

## The finding this unit is a fix for

Going screen by screen through the route group looking for the runtime's voice,
there is exactly one left, and it is the one no run has ever reopened:

> **`/portal/sign-ins` was headed `sign-ins`** — the route, in lower case, as an
> `<h1>`. Every other screen in the portal either names a thing a person has
> (`Your pages`) or asks the question they arrived with (`Can you trust the AI?`,
> `Does this page add up?`).

Underneath it, three more instances of the same thing:

1. **Six monospace cells of the record's own field names, above the fold and
   under no disclosure** — `callers counted`, `failures held`, `locked now`,
   `longest wait`, `most recent`, `oldest held`. Each one is *also* said in
   words in the sentence directly above them, so on the surface they were the
   runtime's phrasing of something the reader had just been told.
2. **Two paragraphs of caveat before anything that had happened.** A reader met
   the limits of the table before they met the table.
3. **No answer to "what do I do now?"** — and this is the sharp one, because the
   answer existed and was in the wrong place:

> The screen's own source said *"There is nothing here to act on and nothing to
> click, deliberately"*, followed by two sentences of genuinely useful reasoning
> about **why** — a button that lifted a lockout would be a way to lift a lockout
> from a browser. That is a comment. The only people who could read it were the
> people who did not need it.

## What shipped

**The screen a person came with a question to, answering it, in this order:**
what is happening → what to do → the numbers.

| | Was | Is |
| --- | --- | --- |
| Heading | `sign-ins` | **Is anybody trying to get in?** |
| Lead | *"Failed sign-ins the throttle is still holding against somebody…"* + two more caveat sentences | *"Sign-ins to this portal that failed recently, and whether anyone is currently locked out because of them."* |
| Next move | nothing on screen | a **What to do** panel, different in all three states |
| The six numbers | a monospace `dl` on the surface | seven rows behind *"The numbers this is counted from"* |
| The lockout rule | a grey line at the bottom, unlabelled | behind *"What locks somebody out"* |
| The two caveats | above the answer | behind *"What this can and cannot tell you"*, word for word |
| A failed read | `survey.error.detail` raw, in the notice body | inside `TechnicalDetail`, where every other screen puts one |

### The next move, and why it is a question rather than a button

`nextMove` gives each of the three states its own answer. The interesting one is
`locking`:

> **Find out whether it is one of yours, then look in front of this app.**
>
> If somebody on your team is locked out, issue them a new key — a correct
> sign-in clears the count at once, and no wait has to be served. If it is nobody
> you know, this app has already done what it can; slowing the caller down
> further belongs to whatever your traffic passes through before it reaches here.
> There is deliberately no button on this screen that lifts a lockout, because
> that would be a way to switch the lockout off from a browser.

That is the source comment, promoted to the screen and finished. The reason it is
a question and not an action is a property of the log rather than a design
preference: 0039 keeps a keyed digest and nothing else, so **a colleague on a
mistyped key and a stranger working through a list produce an identical screen**,
and the only thing that distinguishes them is a conversation the reader can have
and this app cannot.

### Seven rows where there were six, and each names its own field

`pressureFacts` returns a plain label, a value already in words, and the
`SignInPressure` members the value was built from. The third column is the
technical record kept beside the number rather than instead of it — `locked,
lockedIsExact` sits next to `at least 2`, which is how a reader learns that a
floor is a floor.

The seventh row is `counted`. **It has been on the type since the day the type was
written and this screen has never printed it**, which is the exact failure the
`fields` list makes impossible from now on: a test asserts that every member of
`SignInPressure` is reached by some fact, so a number added to the record cannot
silently fail to reach the screen.

## What I renamed, and one thing I deliberately did not

| | |
| --- | --- |
| `<h1>sign-ins</h1>` | `Is anybody trying to get in?` |
| `callers counted` | Callers with a failure counted against them |
| `failures held` | Failed attempts still counted |
| `locked now` | Locked out right now |
| `longest wait` | Longest wait still owed |
| `most recent` | Most recent failure |
| `oldest held` | Oldest failure still counted |
| *(never shown)* | How many rows the numbers above were worked out from |
| "the throttle remembers" / "The throttle is doing its job" | "this deployment still remembers" / "That is the lockout working as it should" |

**The rail still says `Sign-ins`, and that is the decision rather than an
omission.** The industry's word for this rail entry is `Security`, and it is a
claim four sizes larger than the screen: this reports failed sign-ins *to this
portal* and nothing else — not the runtime's permissions, not what a proposal was
allowed to do, not who may edit a page. A rail entry promising those would send a
reader looking for them. `sign-ins` was a bad **heading** because a heading is
where a question goes; it is a perfectly good **rail label**, because a rail is a
list of places and a noun is what names a place. Written into `nav-items.tsx`
beside the four renames that did happen, so the next run does not have to
re-decide it.

## One defect a screenshot found and the tests could not

Consistent with every run since 20 August; **sixteen across ten runs** in this
lane's count. This one is a good example of the class:

> **The disclosure rendered louder than the sentence it sits under.**
> `TechnicalDetail` sets no text colour of its own, and every previous use in the
> portal happens to sit inside a `StateNotice`, whose wrapper is `text-ink-muted`.
> This is the first screen to mount one at page level — so the plain sentence a
> person reads first came out muted and the technical record one click below it
> came out in the body ink, **darker and more prominent than the thing it is a
> footnote to.**

Every test passed. The disclosure held exactly the right content, in the right
order, behind a closed `<details>`. "The record must not out-shout the sentence"
is not a claim about text content and no assertion I can think of would have
caught it.

Fixed on this screen. **Not fixed in the component**, and filed — the component's
default is ten screens wide, this run could look at one of them, and a default
nobody chose is how it got here in the first place.

## Tests

`pnpm install && pnpm verify` **green, exit 0** — typecheck, both suites, and
`next build` across all five route groups. Nothing weakened, nothing skipped.

| Suite | Files | Tests |
| --- | --- | --- |
| `@loom/runtime` | 119 | 1860 (untouched by this diff) |
| `@loom/app` | 160 | 2524 |

**27 net new tests**, in three files, two of them new:

- **`portal/sign-ins/_components/pressure-summary.test.tsx` — 9, new file.** The
  component's **first rendering test**; it shipped on 26 August with the
  arithmetic and the sentences well covered underneath it and nothing that could
  see what the component did with them. Three of the nine earn their place:
  - **The next move is asserted in all three states**, including `quiet` —
    because "nothing to do" is an answer that has to be given, and an empty
    screen is not it.
  - **Nothing is removed**, checked from both ends: every fact's label, value and
    field names are found in the render, *and* they are found inside a `<details>`
    that is closed. A component that put all seven rows back on the surface would
    pass the first half and fail the brief.
  - **The next move is not inside the coloured band.** A way out printed in the
    refusal colour reads as a fourth line of alarm — which is the defect #227
    found on the checkup screen, asserted here so this screen cannot repeat it.
- **`portal/sign-ins/reading-order.test.ts` — 6, new file.** The fourth guard of
  this shape, after the page screen's, Activity's and History's. It pins that the
  question comes before the answer and the answer before the caveats, that both
  caveats survive word for word behind their disclosure, and that the store's own
  error string is behind `TechnicalDetail` rather than in the notice body.
- **`_lib/signin-view.test.ts` — 12 new (16 → 28).** Including the one that is
  the point of `fields`: **every member of `SignInPressure` is reached by some
  fact.** `counted` is the proof that this needed a test rather than care.

## The high-schooler test

*Could somebody who has never read a decision record say what happened and what
they should do next?*

From the second screenshot, unaided: *Someone has failed to sign in to my portal
five times and they're locked out for the next minute. That's the lockout doing
its job. I should check whether it's someone on my team who has the wrong key —
if it is, I send them a new one and they're straight back in. If it isn't, there's
nothing more to press here and I'd want to slow them down further up.*

From the first: *Nobody is being turned away. Nothing to do.*

Where it stops, correctly: `subjects`, `lockedIsExact`, `longestWaitMs` — all of
which are one click down, and none of which is on the way to anything.

## What this tells a developer that they could not get from the repo, the logs, or `git log`

**Whether somebody is working through a list of keys against their deployment,
right now.**

This is the sharpest instance of the value question this lane has had, because the
answer is not "somewhere else, less conveniently" — it is **nowhere else at all**.
A lockout is *computed* at the moment a caller knocks and written down nowhere;
`git log` has never seen one, the build output has never seen one, and the
application log does not contain it either, because the rows it is derived from
are keyed digests and the derivation happens on read. Until the survey was built
the only way to answer "is anybody being locked out" was to open a psql session
while it was still happening — and the honest reason nobody did is that you have
to already suspect it to think of looking.

What this run adds on top of that is the half that makes it usable: the same fact,
said in a sentence, with the next move attached. A lockout nobody can read is not
an advantage.

## What I did not do

- **`src/` is untouched.** Nothing was wanted from it.
- **No decision record.** How a portal screen words itself is a portal decision;
  nothing here touches the tree schema, the delta model, or an Accepted record.
- **`TechnicalDetail`'s default colour.** Filed, not taken — see above.
- **No route rename.** `/portal/sign-ins` is already a person's phrase, unlike
  the four routes that were renamed (`trees`, `calibration`, `audit`,
  `primitives`). Renaming it to `/portal/security` would widen a claim the screen
  cannot meet, and a redirect is not free.
- **No follow-up scheduled.** Token discipline.

## The preview, and a wrong answer I published before the right one arrived

**This pull request first went up with no preview, and it was my fault rather
than the deployment's.** I committed as `Loom portal <jpizzolato36@gmail.com>`;
that address resolves on GitHub to an account which is not on the Vercel team, so
Vercel refused to start the build and reported `Deployment was blocked`. Both
commits are re-authored to the environment's default identity — the one #233 used
two hours earlier on a branch that deployed — and force-pushed before any review
existed. It is the **fourth** occurrence of this on the repository and the finding
asking for three lines in `docs/routines.md` now has four data points.

The part worth more than the fix: **I diagnosed it wrong, and said so out loud
first.** Working from the status alone — the explanatory bot comment arrives on a
delay — I built a table showing #229 to #233 deploying that morning and #234
blocked at 18:00, concluded a spend or usage cap had been reached during the day,
filed it as a finding, said it in the pull-request comment, and sent it to the
maintainer. Every fact in that table was true. The conclusion drawn from them was
false, and it would have sent somebody to a Vercel billing page over a git author
line.

Two lessons, both cheap and both mine:

- **A status without its comment is half the evidence.** `Blocked` is Vercel's
  word for at least two unrelated conditions and the status does not distinguish
  them. The thing that did was a bot comment ninety seconds later.
- **A pattern found by correlating across pull requests can be a coincidence.**
  #233 deployed and #234 did not, two hours apart, and the difference was never
  the time.

The finding is filed with the wrong answer in it rather than tidied away, and the
one I filed on the wrong diagnosis is deleted rather than amended.

## Recommendations

1. **Nothing blocking.**
2. **#219 and #227 are still open**, and both are self-contained. This branch
   touches neither's files.
3. **Three lines in `docs/routines.md`: never override the git author.** Fourth
   occurrence, four separate lanes, same repair each time. It is procedure, and
   `FINDINGS.md` is read for work — which is why four runs have met it in the
   file where it is not.
4. **The screenshot recipe is in `FINDINGS.md` and it works.** Four briefs ask
   for a picture and nothing in the repository takes one. It cost this run two
   failed attempts to rediscover, and it is thirty lines that belong in
   `apps/loom/scripts/`.
