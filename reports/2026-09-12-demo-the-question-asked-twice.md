# The demo asked its leading question twice, and pointed at the wrong copy of it

**Routine:** `Loom demo` · **Branch:** `demo-15-the-question-asked-twice` · **12 September 2026**

The fifteenth run of this routine, and the first that spent its unit undoing
something rather than adding it.

I opened the built page as a stranger, pressed the button the rail puts first,
and the demo asked me the same question twice — two identical cards, two
identical green **Apply this change** buttons, five hundred pixels apart, with
nothing anywhere saying which one the page meant.

That has been live on `main` and on the deployed demo since 11 September.

---

## What a stranger could not understand before this run

**Which button to press.**

Not a subtle failing of tone or ordering, which is what the last eight units of
this lane have been about. The demo's single best moment — the Gate stops a
change, and a person who has never heard of Loom is asked to decide — arrived
as a duplicate, and a duplicated question is a question about the software
rather than about the page.

Measured on the built page at 1440×900, two seconds after **Take the numbers
off**:

| | `main` | this branch |
| --- | --- | --- |
| cards for one question | **2** | 1 |
| **Apply this change** buttons | **2**, at y=509 and y=1020 | 1 |
| elements carrying the record's id | **2**, the same id | 1 |
| the record section | **1,063px** in an 857px rail | 552px |
| the rail, end to end | 2,116px | 1,605px |

And at 390×844, where the rail and the page are one document:

| | `main` | this branch |
| --- | --- | --- |
| the record section | **1,611px**, near two screens | 826px |
| the whole document | 8,014px | 7,229px |

### What it actually was

Two `records.map` calls inside one `<ul>` in `demo/page.tsx`:

```tsx
<ul className="flex flex-col gap-2">
  {records.map((record) => (
    <RecordCard key={record.recordId} record={record} {...heldProps(record)} />
  ))}
  {records.map((record) => {
    …the real one: offer, asked, mark, heldProps
  })}
</ul>
```

The second is the card eight runs of this lane built. The first is a stripped
copy of it with no undo offer, no quoted ask and no mark pill. `git blame` puts
it in the merge of #255 — a unit about showing the part of the page a question
is about, whose own report does not mention a card list. Nobody decided this; a
squash resolved something badly and the result was valid React.

### The half that was not merely ugly

Both `<li>` elements carry `id={record.recordId}`, so the page had **two
elements with one id**, and the first was the stripped one.

That id is an address. `AnswerInView` finds the question waiting on an answer
with `getElementById` and scrolls the rail to it. `BackToTheRecord` — the whole
subject of the 9 September run — sends a phone visitor back up to it. Both were
silently resolving to the copy with the decoration missing. Three runs of scroll
work, pointing at the wrong card.

### Why nothing caught it

Sixth instance of this lane's standing diagnosis (25 August), arriving from a
direction it had not come from before. Not a last hop missing — **a last hop
performed twice**:

- every module involved was correct on its own, and none of them changed;
- both copies were valid React, so nothing warned except a duplicate-key
  message in a console nobody reads in CI;
- `pnpm verify` was green on `main` the whole time, and stayed green on this
  branch before a line of the fix was written — every test that existed passes
  against a page that asks its question twice.

And the reason it *could* not be caught is not this lane's alone. A Next route's
`page.tsx` is an async Server Component that reads a cookie, opens a session and
renders a `LoomTree`. **There is no test in this repository that mounts one.**
So the last composition step of every surface — which components, how many, in
what order — is the one step with no coverage at all, and it is exactly the step
a bad merge lands in. Filed for the other lanes, who have eleven such lists
between them.

## What a stranger can understand now

The same press, the same viewport: one question, one pair of buttons, and the
record of what was asked directly above them.

Nothing else on the screen moved. This unit adds no copy, no control and no
idea; it removes a copy of the one that was already there.

## The changes

### `demo/_components/the-record.tsx` — the list has a module now

The fix is three lines deleted. That is not the unit.

The unit is that the list is a **component** rather than a block inside a route
nothing can mount, so the three facts a stranger's eye catches before any of the
contents can be asserted:

- **one card per ask** — the count, which is the thing a test of one card
  structurally cannot see;
- **one element per record id** — stated as the rest of the surface depends on
  it, because `getElementById` is how two other components find a card;
- **one pair of controls per question** — the consequence a visitor meets.

It also took `awaitingAnswer` with it, exported and tested: which question the
rail scrolls to was a `records.find` in the middle of the page, and "never a
hold the page has moved past" is a rule with a reason (`SpotlightScroll`'s) and
no test of its own until now.

The page keeps everything that needs the store and the registry — the tree, the
holds, the effects, the plain readings, the rendered part-in-question — and
hands them over as a map keyed by record. That boundary is the honest one: those
four readings are precisely what a card cannot work out for itself.

### `_lib/answer.ts` — a quotation of a sentence that no longer exists

`Loom portal` filed on 1 September that `stakes-above-ceiling` had been rewritten
— *"Riskier than a request from here is allowed to be without asking."* became
*"A change this big is not something Loom may make on its own."* — and that this
lane's `answer.ts` illustrated the demo's cards with the old one. Fixed, and the
lead-in now says it is quoting what the shared vocabulary prints *today* rather
than what it printed when the comment was written, so the next rewrite makes the
comment stale in a way a reader can see.

**Three other comments in this lane still hold the old sentence and were left
alone deliberately.** `ceiling.ts`, `weighed.ts` and `record-card.tsx` each
narrate the card *as it was* before a unit fixed it, and `ceiling.ts`'s argument
is specifically about the words *from here* having no referent. A
find-and-replace would leave a paragraph reasoning about a phrase that is no
longer in the quotation above it. What that leaves open is filed: the ceiling
line is the second half of a sentence the portal has since replaced, and whether
it still earns its place is a copy question that wants the built page beside it.

## Decisions taken that were not specified

- **The list is a component, not a smaller `page.tsx`.** Deleting three lines
  would have shipped a green build and left the next merge free to do it again.
  The counting has to live somewhere a test can reach.
- **`held` is a map rather than a function the list calls.** A function would
  have worked and would have made the list's own tests need one. The map is data,
  so a test hands it two entries and reads what the cards say.
- **`awaitingAnswer` re-derives "the page has moved past this" from the reading
  rather than being handed a second set.** Same test the page applied, one
  source, and it cannot drift from what the card underneath is showing.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record — it renders the same components once instead of
  twice. Nothing was escalated and nothing was left out for review.
- **No file outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and this report. `src/` was not opened at all.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, first attempt.

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 124 | 2,052 |
| `@loom/app` | 233 | 3,869 |

Nothing failed, nothing was skipped, no test was weakened. **Twelve tests are
new**, all in `_components/the-record.test.tsx` (dom suite).

**They were checked against the defect rather than only against the fix.**
Restoring the duplicate loop inside the new component fails **six of the
twelve**:

| test | what it reports on the defect |
| --- | --- |
| shows one card per ask, and never two | `expected […] to have a length of 2 but got 4` |
| gives each record exactly one element carrying its id | two elements, one id |
| puts one pair of controls under a question, not two | `length of 1 but got 2` |
| reads each card's undo offer from the whole list | the withdrawn button is back |
| hands each waiting card its own reading | `Found multiple elements with the text` |
| shows a question the page has moved past as shut | two *Ask for this again* buttons |

The other six cover the marks, the rail's legend, the empty state and
`awaitingAnswer`'s three cases.

## Findings

**Filed:**

- `Loom demo` (this lane): **the duplicated question**, with the measurements
  and the test that now holds it — recorded because the *shape* recurs even
  though the instance is closed.
- `Loom portal`: **a route's `page.tsx` is the one file in a surface nothing can
  mount, and four lanes render lists in one.** Eleven inline lists across
  `(portal)`, `(lessons)` and `(docs)`. The cheap half — move the list to a
  component and assert the count — is worth more than any way of mounting a
  route.
- `@jonathanbravecredit`: **`git checkout -b <branch> main` branches off a
  `main` forty-one commits stale.** The container starts with `HEAD` detached at
  the real `main` while the local `main` ref points ten days back. Step 3 of the
  procedure, written the obvious way, produced a branch off 1 September code and
  said `Switched to a new branch`. This run caught it only because an edit failed
  to match a string it had read minutes earlier.
- `@jonathanbravecredit`: **`21st.dev` is still `EGRESS_BLOCKED`**, fourteenth
  consecutive run.
- `@jonathanbravecredit`: **`docs/rollout.md` still says the demo lives at
  `apps/loom/app/(portal)/portal/demo`**, twenty-two days on.
- `Loom demo`: **the ceiling line completes a sentence the portal has rewritten.**
  Open, with the reasoning, for a run that has the page in front of it.

**Closed:**

- `Loom portal`'s 1 September finding — `answer.ts`'s stale quotation.

## The one thing I did not fix, said plainly

**I do not know what else that merge dropped or doubled.** I found this by
pressing one button on one page. The same squash touched `page.tsx` in five
places, and the four other lanes' merges are outside my lane entirely. The
finding above is the general answer — a list with no count is a list that can be
wrong silently — and acting on it for the other eleven lists is not mine.

## Open questions

Nothing blocking. Three carried:

- **“Ask about just this”** — the scope control, reasoned out in this lane's
  22 August finding, still the largest unbuilt idea here.
- **The rail and the stage scroll independently** and neither knows the other
  did (7 September). Recommendation there is unchanged: make the chip a link to
  its card, or leave it.
- **A refusal can say a repair was declined and this surface still does not say
  it** (framework finding, 21 August).

## The visuals

| | |
| --- | --- |
| [before, wide](2026-09-12-demo-the-question-asked-twice-before-record-wide.png) | `main` at 1440×900, the record section alone: the same question twice, two green buttons |
| [after, wide](2026-09-12-demo-the-question-asked-twice-after-record-wide.png) | the same press on this branch — one card, half the height |
| [before, phone](2026-09-12-demo-the-question-asked-twice-before-record-phone.png) | 390×844, where the duplicate costs the visitor a second screen of scrolling |
| [after, phone](2026-09-12-demo-the-question-asked-twice-after-record-phone.png) | the same, once |

Both pairs are the same script driven against two real `next build` outputs —
this branch's and `main`'s — so the only difference in the frame is the change.
Not the preview deployment, which this environment cannot open (`vercel.app` is
not on the sandbox's egress allowlist; the standing 19 August finding).

**Preview:** read off the deployment comment on the pull request, for the reason
above. One push, one preview.

**To see it yourself:** open `/demo` on `main`, press **Take the numbers off**,
and scroll the right-hand rail down past the two buttons. The card underneath is
the same card. Then do it on this branch, where it is not there.
