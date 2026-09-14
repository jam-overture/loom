# Four bands the page sequence was missing

**Routine:** `Loom primitives` · **Date:** 2026-09-13 · **Branch:**
`primitives-30-the-phrasebook` · **Section:** §4b

## Why compositions, and why now

`docs/primitive-gap-inventory.md` (#289, the same day) measured the library
against a maintainer target of 250 by 19 September and found the honest ceiling
on distinct primitives is about 110. The rest of the target is **compositions**,
for a reason the inventory argues at length: 21st.dev's 1152 heroes are not 1152
components, they are one block drawn 1152 ways, and Loom's matching axis is
compositions × themes rather than the primitive count.

There were **nine**. There are now **thirteen**, and this run is the measured
rate rather than another estimate.

## What was built, and why these four

The nine were chosen as *the argument a landing page makes* — open, prove, show,
count, price, quote, answer, ask, close. Read as a sequence they are a page, and
that is the property the catalogue's own doc comment claims for them.

**Each of these four closes a gap in that sequence rather than offering a second
way to do something already in it.** A page could not:

| | band | what it could not do |
| --- | --- | --- |
| `nav` | a sticky bar, wordmark, four links, one action | **open.** `footer` shipped from the start; its opposite never did |
| `steps` | three numbered moves on a rail | say **what happens next** — the band a convinced visitor actually reads |
| `comparison` | five rows against two alternatives | argue against **the thing the reader already uses** |
| `team` | four people, roles, a line each | say **who is behind it** |

So the catalogue is still one page in order, now thirteen bands long. That
matters more than the count: the doc comment's claim is the sequence, not the
number.

## The defect a screenshot caught and every test passed

`comparison-band` put its three subjects directly into the table's `columns`
slot. The correct shape wraps them in a `loom.comparison-row` *inside* the slot,
which is what puts them in the same columns the body rows use.

Without it: **every mark sat one column right of its heading**, the steered tint
landed on the first competitor instead of the subject, and the third mark of
each row hung off the end of the header rule. The band registered, rendered,
declared its types correctly, minted fresh ids and read every colour from the
palette — it passed all five generic assertions in `compositions.test.ts`,
because none of them can see that a table means something different from what it
says. Only the picture could.

It is written into the band's own comment rather than only fixed, because the
next composition to use a two-dimensional band will reach for the same shape.

## What the run says about the rate

Four bands, at the doc density the catalogue already had, in one run — plus the
specimen and the fix above. The nine that came before averaged 95 lines each
including their reasoning; these four average about the same.

**Extrapolating honestly: four to eight a run.** The inventory's arithmetic put
~140 compositions at Friday. At this rate that is not reachable, and saying so
now is worth more than discovering it on Thursday. What *is* reachable is
somewhere between 30 and 50 — which, with ~110 primitives, is a catalogue of
140–160 droppable things rather than 250.

The lever that would change the rate is variants rather than new kinds: a second
hero or a two-tier pricing band re-uses an argument already made, so it costs a
build function and a short comment rather than a full one. That is also the
point at which this list stops being a page — which the index's doc comment now
names as the thing to watch, with what to do about it.

## Which Hermes fields became nodes

None; nothing was ported. Every band builds from primitives already registered,
which `compositions.test.ts` asserts.

## What the library still cannot express

Unchanged. One added by this run, and it is a property rather than a gap:
**nothing numbers a sequence.** `steps` carries `marker: "01"` on each milestone
because a render is a total pure projection of one node, so no child can know it
is the second of three. Inserting a step between the first and second leaves the
markers wrong, and that is two `configure` operations. It is the cost of the
ordering being *in the content* rather than implied by position, and it is the
same trade a numbered list in prose makes — worth knowing before somebody files
it as a bug.

## Findings filed

- **`Loom docs`** — the docs search index caps the library at one more band.
  Blocking the 19 September target. Measured three ways, with the gzip
  observation offered.

The two filed earlier today (#289) still stand — and this is the third budget in
one day that the library's growth walked into, all three the same shape: a
number pinned elsewhere that this lane changes on purpose, with no way to see it
coming.

---

## Second batch, and the wall it hit

Four more bands after the first four — `bento`, `integrations`, `articles`,
`contact` — taking the catalogue to **seventeen**. Two more were written,
reviewed and **held back**, and the reason is the most important thing in this
report.

### The docs search index caps the library at one more band

`app/(docs)/_lib/search/build.test.ts` caps the entries index at 200,000
characters raw. Measured three ways today:

| | entries, raw | headroom |
| --- | --- | --- |
| `main` | 199,114 | 886 |
| `main` + 4 compositions (shipped) | **199,778** | **222** |
| `main` + 6 compositions (written) | 200,118 | **−118, red** |

**A composition costs about 167 characters of index.** The repository had five
bands of room this morning and has **one** now. The eighteenth band anybody adds
— in any lane — turns `pnpm verify` red for everybody.

`changelog-band` and `credentials-band` are finished and out of this branch for
that reason alone, and parked on `primitives-31-held-bands` so the work survives
the session that produced it — not a pull request, because two unregistered
modules are dead code. Filed for `Loom docs`, whose own test comment names the
remedy — *"the run that hits it should split the index rather than raise the
number"* — and whose architecture the split is.

Worth knowing before anybody looks at it: **the gzip cap is not close.** 17,946
against 20,000, and four bands moved it by 44 characters. It is the raw cap that
binds, and near-identical export entries are precisely what compresses — the
same observation that test's comment already makes about why indexing the code
was cheap. Offered, not decided.

### The three inaccuracies the second screenshot caught

All three were in prose or in a count, and every test passed on all of them:

- **`bento` shipped with five features and claimed the fifth closed the shape.**
  It did not: the fifth cell started a third row alone and narrow, which reads
  as a mistake rather than a rhythm. Four is the count that closes it — one
  across, three under. The doc comment said the opposite of what the page did.
- **`credentials` at `columns: "four"` wrapped 3 + 1.** The notes are sentences
  about scope rather than labels, so the cells want more room than a floor of
  four gives them. Two columns, and the comment now says why.
- **`contact` claimed that an untargeted form's button "does nothing".** It does
  better than that: `loom.form` renders a notice — *"This form is not connected
  yet, so it cannot be sent"* — above the fields. The band is honest on the page
  rather than silently broken, which is a materially different thing to tell
  somebody, and it was verified in the picture rather than read off the schema.

### The rate, revised

Eight bands in one session rather than the four the first batch suggested — so
the earlier "four to eight a run" holds at the top of its range. **The rate is
no longer the constraint.** The index is: at 167 characters a band, the ceiling
is the eighteenth, and no amount of throughput gets past it.


---

## 14 September — the ceiling was ours, and it is gone

#289 merged, `main` was merged in, and the index measurement was taken one layer
further down than it had been. **The conclusion in the section above is wrong,
and this is the correction.**

The cost was never the nineteen bands. It was nineteen **names**.

**Primitives are not individually exported.** `src/primitives/index.ts` names
ninety-three primitives in `STARTER_PRIMITIVES` and exports none of them; a
consumer reaches one through the registry. Compositions were reachable *both*
ways — through `compositionById` and as nineteen named exports that nothing in
the repository imports — because `export * from "./compositions/index.js"`
carried every name out to the package root.

| | exports | entries, raw | headroom |
| --- | --- | --- | --- |
| nineteen bands, each exported | 996 | 200,118 | −118, red |
| nineteen bands, none exported | 977 | **197,010** | **2,990** |

Nineteen names cost **2,768 characters**. The bands cost **nothing** —
seventeen and nineteen measure identically, because the index counts published
names and `STARTER_COMPOSITIONS` is one name however many members it holds.

**So the catalogue grows flat from here.** The next fifty bands cost what the
last two did.

### What shipped as a result

- **Nineteen bands.** `changelog` and `credentials` came back off
  `primitives-31-held-bands`, which is now spent.
- **[0155](../decisions/0155-the-catalogues-public-surface-is-the-list-and-the-lookup-not-every-band-by-name.md)**
  — the catalogue's public surface is the list and the lookup, not every band by
  name. It is the shape primitives already had; the asymmetry was an accident of
  `export *` rather than a design.
- **The `Loom docs` finding downgraded**, not closed. The observation under it
  is still true and still theirs: the raw cap had 0.4% headroom before any of
  this, and the growth that filled it was not the growth anybody was watching.
  The gzip cap was never close — 17,773 of 20,000 — so whether raw is the right
  measure for this kind of growth is a question left with them, with the note
  that it is a change to a test's rationale rather than a number to edit.

### What this run got wrong, kept here because it is the useful part

The escalation on 13 September was made on an incomplete diagnosis. The
measurement was right, the arithmetic was right, and the cause was one layer
below where this lane stopped looking — so a cost this lane was creating
unnecessarily was reported as another lane's architecture to fix.

The tell was visible in the numbers at the time and was not read: **a
composition is four nodes and a doc comment, and 163 characters of *index* is
not what four nodes cost.** That gap between what a thing is and what it
measured was the thing to pull on. `export *` is what sat in it — a construct
that grows the published surface whenever a module does, without anybody
choosing it, which is exactly the class of thing that makes a budget move for
reasons nobody can see.
