# 2026-09-02 — "What a green check actually checked"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-20-what-a-green-check-checked` (→ `main`).

Visuals — the real screen, from a production build of this commit, in a signed-in
browser, against a page **a live model changed twice during this run**:

| | |
| --- | --- |
| [The checkup, as a reader meets it](2026-09-02-portal-what-a-green-check-checked.png) | 1280px |
| [Both disclosures open — nothing was removed](2026-09-02-portal-what-a-green-check-checked-open.png) | 1280px |
| [a phone](2026-09-02-portal-what-a-green-check-checked-phone.png) | 390px |

**How honest these are.** `LOOM_ANTHROPIC_API_KEY` is present in this
environment, so nothing was staged. Two requests were typed into the real prompt
box on `/portal/pages/t_seed1` — *"Change the heading to say Autumn arrivals"*
and *"Make the intro paragraph warmer and mention free returns"* — the Gate
applied both, and every number on the screen is a fact about what happened to
that tree. **10 parts** is the seed's node count. **2 changes** is the head
revision. The verdict is a real `auditSnapshot` fold over both.

---

## What was asked

**No maintainer comment is open on any portal pull request.** #219 carries only
the deployment bot's comment and my own. So the findings queue decides, and the
oldest open item owned by this lane is the one below — filed by another routine,
which makes it the strongest kind of input this lane gets: a reader who is not me
saying a sentence of mine is not true.

## The finding this unit is a fix for

`Loom lessons` filed it on 25 August while writing lesson 16, which teaches
`auditSnapshot`:

> `readCheckup`'s green verdict said *"Loom replayed every change it has recorded
> for this page and got back exactly the page people are being served, **so
> nothing on it is unexplained**."* The second half is a claim about the page's
> history, and **the audit compares end states rather than histories**, so it
> cannot support it.

Their counterexample is nine lines and is Exercise D of the lesson, executed:

1. Create a tree, append one change removing the footer.
2. Audit it against a seed that is *wrong* — one text node differs from the real
   revision 0. Outcome `diverged`, with the node named. Correct.
3. Append a second change removing the header, which is where that text node
   lived.
4. Audit again, against the same wrong seed. Outcome **`agrees`**.

Nothing was fixed between 2 and 4. The seed is exactly as wrong as it was; the
revision that exposed it deleted the evidence. A deployment whose seed has
drifted sits on a green tick indefinitely, and *"nothing on it is unexplained"*
is what it is told.

### What the finding did not say, and what made this a unit rather than an edit

The red verdict has the same defect and it is worse:

> **`diverged` read *"One of the two is wrong, and until you know which, the
> history cannot explain what is on screen."*** A fold has **three** inputs — the
> seed, the log, the snapshot. "One of the two" names two suspects out of three
> and sends a reviewer to look at the page and its history when the fault may be
> in **neither**.

Under green the miscount costs false confidence. Under red it costs a search in
the wrong place, which is the more expensive of the two — and it is the verdict
somebody reads *because something is wrong*.

So the fix is not a softer sentence. Deleting the overclaim leaves a screen that
is merely quieter about a check nobody can see the shape of. **The third input
gets named, on the surface, with the numbers that went into it.**

## What shipped

### Both verdicts now say what they started from

| | Was | Is |
| --- | --- | --- |
| `agrees` | "Loom replayed every change it has recorded for this page and got back exactly the page people are being served, **so nothing on it is unexplained**." | "**Loom started from the shape it has on record for this page**, replayed every change it has recorded since, and got back exactly the page people are being served." |
| `diverged` | "Replaying the changes Loom recorded produces a different page… **One of the two is wrong**, and until you know which, the history cannot explain what is on screen." | "**Starting from the shape Loom has on record for this page** and replaying every change since produces a different page… Until you know **which of them** is wrong, the history cannot explain what is on screen." |

Neither is longer than it was. Both name three things where they used to name
two.

### "What this check compared" — the three inputs, with the real numbers

| | On the screen |
| --- | --- |
| **Where it started** | The shape Loom has on record for this page when it was first created — **10 parts**. |
| **What it replayed** | Every change accepted since — **2 changes**, in the order they were accepted. |
| **What it compared against** | The page people are being served right now. |

The numbers are why this earns surface rather than a disclosure. A reader who has
just been told their page adds up has no other way to learn whether the verdict
weighed a whole history or an empty one — and a fresh deployment's answer is the
empty one, which gets its own sentence rather than a `0`: *"Nothing yet. No change
has been accepted on this page since it was created."*

### The assumption is on the surface, not behind the disclosure

> *"A green result does not prove the starting shape above is right. That shape is
> assumed, not checked — so if Loom held the wrong one for this page, and a later
> change replaced the part it was wrong about, this check would come back green
> anyway."*

This is the sentence the unit exists for, and putting it one click down would
have told the reader the same wrong thing the old sentence did. It is worded per
verdict, because one fact has two consequences and a reader only ever meets one:
under red it reads *"Three things went into this and the starting shape above is
one of them… so this disagreement can mean the page is wrong, or the recorded
changes are wrong, or that Loom simply holds the wrong starting shape."*

### Nothing was removed

Every one of the three inputs has the runtime's own reading beside it, under one
disclosure that reads on its own — *The seed handed to auditSnapshot: revision 0,
re-derived from the builder in source…*, *Revisions 1 to 2 of the log, folded in
order…*, *The stored snapshot at revision 2 — the materialised view 0016 made the
log the truth of.* — plus a fourth entry, **What it assumed**, carrying the
end-states-not-histories argument in full. Both screenshots are the same screen,
shut and open.

### Where the words live

- **`_lib/checkup-basis.ts`** — the three inputs and the two assumptions. Pure,
  and deliberately not in `audit-view.ts`: `describeAudit` reads a
  `SnapshotAudit`, and the size of the seed is not something the runtime's verdict
  carries.
- **`portal/checkup/_components/checkup-basis.tsx`** — the section.
- **`_lib/audit-view.ts`** — the two verdict sentences, and one new field.

### The one type change, and why it is a type

`AuditReport` gained `revision: number | null` — **null exactly when nothing was
compared**, the mirror of the existing `stoppedAt`. The basis renders nothing at
all under `unreplayable`, because a fold that stopped part-way replayed no number
of changes anybody can print, and a basis reading *"it replayed 12 changes"* under
a verdict reading *"nothing could be checked"* would be the same class of
overclaim one screen further down. That guard is now a narrowing the compiler
performs rather than a thing to remember.

## A defect a screenshot found and the tests did not

Consistent with every run since 20 August; **fifteen across nine runs** in this
lane's own count.

**The assumption read as a fourth input.** It shipped as `text-ink-muted text-xs`
in the same `gap-3` column as the three `dd` lines above it — the same size, the
same colour, the same spacing — so the eye filed it as one more thing the check
compared, which is the exact opposite of what it says. It is ruled off now
(`border-t pt-3`). None of the twenty-five new tests could see it — they assert
what the section says and where each sentence sits, and every one of them was
green. The first screenshot showed it immediately.

## Tests

`pnpm install && pnpm verify` **green, exit 0** — build, typecheck, both suites,
and `next build` across all five route groups. Nothing weakened, nothing skipped.

| Suite | Files | Tests |
| --- | --- | --- |
| `@loom/runtime` | 119 | 1860 (untouched by this diff) |
| `@loom/app` | 161 | 2522 |

**25 net new tests**, in four files, three of them new:

- **`_lib/checkup-basis.test.ts` — 10, new file.** The three inputs and their
  order; both counts in the singular and the plural; the empty history saying so
  rather than printing a zero; the revision range in the technical reading. Then
  the two that carry the argument:
  - **The plain-language guard, as a property.** Every heading, every `plain`
    line and both assumptions are checked against the same regex
    `audit-view.test.ts` uses — `fold|snapshot|seed|delta|node|tree|revision|log|
    gate|id` — and must not match.
  - **The other half of it, which matters more: every `technical` string *must*
    match, and must not equal its `plain` twin.** Nothing is removed, asserted
    rather than trusted. Two tables over one set of facts drift, and a technical
    reading that has become the plain one is how the disclosure silently stops
    being worth opening.
- **`portal/checkup/_components/checkup-basis.test.tsx` — 7, new file.**
  Including **renders nothing at all when the fold compared nothing**, which is
  the defect the whole component was written to avoid; that the assumption is
  outside `<details>` and not inside it; and that all four runtime readings are
  inside it.
- **`portal/checkup/reading-order.test.ts` — 5, new file.** The fourth guard of
  this shape, after the page screen's, Activity's and History's. It pins the
  verdict above the basis, and one that is new: **`describeAudit` is called
  exactly once**, so the verdict and the basis cannot describe two different
  folds of the same page with nothing on screen saying which.
- **`_lib/audit-view.test.ts` — 3 new.** `revision` carried on both compared
  outcomes and null on the third; and the two verdict sentences asserted by what
  they must **no longer** say — `not.toContain("unexplained")`,
  `not.toContain("One of the two")` — so a revert is a red test rather than a
  quiet regression.

## The high-schooler test

*Could somebody who has never read a decision record say what happened and what
they should do next?*

Applied to `/portal/checkup`. From the first screenshot, unaided: *My page adds
up. Loom started from the shape it had on record for this page — ten pieces —
replayed the two changes made since, and got back exactly what people are being
served. There's nothing for me to do. One caveat: it never checked that the
starting shape itself was right, so this could be green and still be wrong if
Loom had the wrong starting shape and something later covered it up.*

That last sentence is the one a reader could not have got off this screen
yesterday, and it is the one an auditor would ask for first.

Where it stops, correctly: `t_seed1`, `auditSnapshot`, `revision 2`, `0016` —
names, all of them behind the disclosure.

## What this tells a developer that they could not get from the repo, the logs, or `git log`

**What your integrity check is actually resting on, and where it is blind.**

`git log` can tell you a file changed. A test suite can tell you a fold agrees.
Neither can tell you that the fold agreeing depends on a starting shape your
deployment holds in source and has never verified — and that the failure mode is
not noisy: a drifted seed shows `diverged` only for as long as the node it
differs at is still in the tree, and the revision that removes that node makes
every audit after it come back green.

That is a property of Loom's own model, visible nowhere else, and it is the
difference between a green tick you can hand to somebody and one you cannot. A
check that does not say what it assumed is a check you have to take on faith,
which is what the reviewer was trying to avoid by running it.

## What I did not do

- **`src/` is untouched.** Nothing was wanted from it — `collectNodeIds` is
  already public, so the seed's size needed no framework change. **No framework
  gaps this run.**
- **No decision record.** What a portal screen says about a fold it renders is a
  portal decision; nothing here touches the tree schema, the delta model, or an
  Accepted record. `auditSnapshot` is unchanged and 0016 and 0028 describe it
  exactly.
- **Nothing that would make a drifted seed detectable.** It cannot be detected
  from inside the audit, because the audit is what the seed is an input to — it
  would need a second, independent record of a tree's original shape, and this
  deployment has one. That is a framework-shaped question and it is recorded in
  `FINDINGS.md` as a limit rather than filed as work, because nothing about
  `auditSnapshot` is wrong. What was wrong is that the portal claimed more than
  it did.
- **No `diverged` screenshot.** Producing one means writing a tree that
  contradicts its own log, which this portal has no path to do and should not
  grow one for a picture. The red wording is covered by tests instead, and the
  component test renders it.
- **No follow-up scheduled.** Token discipline.

## Findings

**Closed:** the `Loom lessons` entry of 25 August.

**Filed:**

1. **The plain-language guard now exists in two test copies** (mine). It is the
   sharpest test in this lane and two copies is how a rule stops being one. It
   wants `apps/loom/test/plain-language.ts` and then applying to the screens that
   have no such guard at all, which is most of them.
2. **Every screenshot any lane publishes is taken against a browser the sandbox
   pins by build number and the repo does not depend on** (`Loom daily build`).
   Four briefs ask for a screenshot; nothing in the repository takes one, so seven
   lanes each rediscover that `npx playwright install` cannot work here and that a
   current Playwright looks for a chromium build the sandbox does not have. This
   run's recipe is in the finding. It wants `apps/loom/scripts/`, beside
   `db-push.ts`.

## Recommendations

1. **#219 and this branch do not overlap** — it rebuilt `/portal`, `_lib/nav`,
   `_lib/vocabulary` and the waiting card; this touches the checkup screen and
   `_lib/audit-view`. `FINDINGS.md` is the only file both append to, and both
   append at the end.
2. **Nothing blocking.**
