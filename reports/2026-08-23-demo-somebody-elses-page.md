# Somebody else's page

**Routine:** `Loom demo` · **Branch:** `demo-03-somebody-elses-page` · **23 August 2026**

The third run of this routine. The first two fixed where the demo lives and how
its controls are ranked. This one is about the half of the screen neither of them
looked at, because it was never in the rail.

---

## What a stranger could not understand before this run

I used it the way somebody who had never heard of Loom would, at 1440×900 and at
390×844, and the failure is not in the instrument. It is that **there was no
specimen** — both halves of the screen were Loom.

The page on the stage was Loom's own marketing page. Its hero read *"Your AI can
change this page. You can see exactly what it changed."* at sixty pixels, four
inches from a rail whose heading said *"Ask this page to change itself"* at
twenty-four. Its logo cloud was **Proposals · The Gate · Revisions · Telemetry**.
Its six features began *"A model emits a delta against the tree it was shown."*
Its three figures were **4 delta operations**, **2 axes the Gate weighs**, **0
lines of markup in this page**. Its pull quote cited a decision record by number.
Its two largest buttons — larger than anything the rail offered — said *Read the
source* and *Read the decisions*, and went to GitHub.

Two things follow, and between them they are the whole of *clunky and doesn't
make sense*:

**The jargon was the wallpaper.** The direction binding this surface is that
plain language is the default and the technical record is one click away. The
rail obeys it: three plain steps, a sentence per state, the fingerprint behind a
disclosure. Then the page *behind* the rail printed *delta*, *the Gate*,
*primitive* and *revision* unbidden, at display size, before a visitor had
pressed anything — and one scroll gave them six more paragraphs of it. The record
was one click away and the vocabulary was the room.

**Nothing was at stake, so the Gate had nothing to be for.** This is the more
expensive one. The demo's best moment is *Loom will not make this change until
you say yes* — and it was being said about three figures concerning delta
operations. Nobody minds if those go. `docs/rollout.md` names who this surface
has to convert: regulated teams, agencies answering to clients, anyone with a
compliance function, *"people with something to lose"*. Not one of them could see
their own problem on that page, because the page had nothing to lose.

## What a stranger can understand now

The page on the stage belongs to **Harbourline Physiotherapy**, a clinic that
does not exist, and the bar above it says so in its first four words. It is an
ordinary small business page: what they treat, which insurers recognise them, the
numbers they are proud of, a patient's words, the questions people ask before
they book. Nothing on it names Loom. Nothing on it explains itself.

So the screen now has two voices instead of one saying the same thing twice, and
a visitor can tell them apart in a glance: **the light half is somebody's page,
the dark half is the thing operating on it.**

And the sixty seconds has a different ending. Press **Take the numbers off**. The
stage carries you to three figures — *3,400 appointments last year*, *24 years on
the same street*, *92% seen within a week* — ringed in amber, chipped *This would
be removed*; and in the rail, level with your cursor: **Waiting on you.** *Loom
will not make this change until you say yes. Riskier than a request from here is
allowed to be without asking.*

That is the same mechanism as last week, unchanged, on the same code path. What
changed is that a stranger now knows why anyone would want it, because the thing
being protected is a small business's proof that it can see you — and everybody
already understands why an AI should not take that off a page quietly.

## The changes, in order of how much they move that

### `_lib/page-tree.ts` — the specimen

Same eight bands, same primitive vocabulary, same node ids, every preset
unchanged in what it addresses. Only the words are different, and the words were
the whole problem.

Three decisions in it are not taste:

- **The contact points are reserved-for-fiction identifiers.** The clinic's calls
  to action are `mailto:reception@harbourline.example` and `tel:+442079460104` —
  RFC 2606's unroutable TLD and Ofcom's drama range. A specimen page has to be
  plausible enough to stand as a real page (§4d builds the real site from this
  same vocabulary) and must never reach a real inbox or a real telephone. That is
  now asserted rather than intended: every anchor in the rendered tree is one or
  the other, or the test fails.
- **The insurers are invented.** A logo cloud on a clinic's page is a claim about
  who will pay, which is the cheapest way to put something at stake without
  writing a word about stakes. A real insurer's name there would be a claim about
  a real company made by a page that is not theirs.
- **The fiction is disclosed in the chrome, not the footer.** A page invented for
  a demonstration says so where it cannot be missed. It is the bar's first
  clause, above the page, before anything else is read.

### `_lib/presets.ts` — what gets added stopped narrating the runtime

The inserted band used to read *"This band did not exist a moment ago — it
arrived as an insert against the page root, was weighed by the Gate, and appended
a revision."* That is the page explaining Loom, which is the one job on this
surface the page does not have — and it was the third time the same fact was
stated, after the record card and after the green ring labelled *New — just
added* forty pixels from the cursor. It is now the clinic's address and opening
hours, which is what a page like that would plausibly be missing.

The labels moved with it, into the page's own terms: *Repaint the top band*,
*Add the opening hours*, *Take the numbers off*, *Move the testimonial up*. Each
still promises the movement and never the verdict, for the reason `presets.ts`
gives — the Gate decides at assessment time and a label predicting it would be
wrong the first time the policy moved.

### The rail says *that* page, and has a way out

*"Ask this page to change itself"* worked when there was one page. With a
clinic's page beside it, "this page" became the one question a stranger must
never have to ask, so the heading points instead: **Ask that page for a change.**

And the demo stopped being a cul-de-sac. `Loom marketing` filed on 22 August that
this whole route group contained one `<a>` and it was the skip link, while the
front door had just begun offering `/demo` from six places — every one of them a
one-way door walked through by the visitor most likely to be interested. Its
recommendation was two links, and both are built:

- **The wordmark goes home**, which is the convention every visitor already has
  and what the marketing chrome does, so the two surfaces agree.
- **The foot of the rail offers the docs** — *"Want this on a page of your own?
  Read the docs →"* — placed at the end because that is the question a visitor
  has only *after* watching a few changes land. `/docs` is the honest
  destination and needs no account; the portal would be the dishonest one, being
  a review queue behind a sign-in (0019).

Both paths are read from `(marketing)/_lib/site.ts` rather than typed here, so
they stay correct across anything that lane does behind them.

## Decisions taken that were not specified

- **No decision record this run.** Nothing here touches the tree schema, the
  delta model or an `Accepted` record. It is copy in a tree, two labels, and two
  links. Nothing was escalated and nothing was left out for review.
- **A clinic rather than a bank or an insurer**, though those carry more obvious
  compliance weight. A specimen has to be legible to *everyone* in about two
  seconds, and a page that invites a visitor to parse a financial product spends
  the seconds the demo needs. A clinic is understood at a glance and still has
  something to lose.
- **The specimen keeps all eight bands and every node id.** It would have been
  easy to redesign the page while rewriting it. Every preset addresses nodes by
  type and position, the spotlight resolves against the tree on the stage, and
  the store keys the tree by an id derived from it — so a structural change would
  have been a second unit hiding inside this one, with the tests for both
  landing at once.

## Real test numbers

`pnpm install && pnpm verify` — **green**, exit 0.

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 103 | 1578 |
| `@loom/app` | 110 | 1583 |

Nothing failed, nothing was skipped, and no test was weakened. **Five tests are
new**, all in this lane, and three of them found something:

- `_lib/page-tree.test.ts` — **2 new.** The first is the property this run
  exists for and the one that will rot silently: the tree's *spoken* words
  contain none of *Loom, delta, the gate, primitive, runtime, proposal,
  telemetry, revision*. It reads the text with the machinery stripped out,
  because the raw markup is full of legitimate Loom — the hoisted stylesheet, the
  `data-loom-type` attributes, the design system's class names — and the rail is
  exempt by construction, since the rail is supposed to say Loom. The second
  asserts every anchor on the page is unroutable by RFC 2606 or Ofcom's drama
  range.
- `demo/_components/demo-bar.test.tsx` — **3 new**, a new file. The bar's comment
  has always claimed it says three things; two of them were not actually said,
  and both are one copy-edit from going again. That the page belongs to somebody
  who does not exist, and that the wordmark is a way out.

**One existing test changed, and the change is the point.** `ask-panel.test.tsx`
spelled out three preset labels to check that the panel honours `available` — so
a retune of the *copy* failed a test about the *filter*. It now reads the labels
off `DEMO_PRESETS`. Weakening nothing: the assertion is the same one, against the
table that owns the words.

## Findings

**Closed:** the 22 August `Loom marketing` finding — *the demo has no way out of
it* — by building both links it recommended, for the reason it gave.

**Filed:**

- `Loom demo` → itself: **the specimen diagnosis**, recorded because it outlives
  the fix and because the no-Loom-words property is invisible while it holds.
- `Loom demo` → itself: **the mark's chip lands on the words** when a band's
  content starts at its top right. Visible in this run's `applied` screenshot,
  and honestly pre-existing — see below.
- `Loom marketing`: the front door's blurb for `/demo` says *"a real page"*,
  which is true and is no longer the best thing it could say. One clause, not a
  blocker, and no link needs changing.
- `@jonathanbravecredit`: `21st.dev` is still `EGRESS_BLOCKED`, verified a third
  time from this lane. Dated on the existing entry rather than opened again.

**No framework gaps, and `src/` was not opened.** This run wanted nothing the
published entry points do not already expose. No primitive was wanted either: the
specimen is composed entirely from the registered library, which is the same
claim it was making before.

## The one blemish in the screenshots, said plainly

The `applied` shot shows the green *"Something was removed here"* chip sitting on
the first line of the quote that moved up into the gap. That is the exact defect
the 22 August run named — *a mark that covers what it is pointing at has undone
itself* — appearing on the corner that run moved the chip **to**.

It is pre-existing: the quote this replaced also ran the band's full width and
would have collided identically. Nothing about the new copy caused it; what
changed is that the applied state is now worth screenshotting.

I did not fix it in this run because the fix is *which corner is free*, and CSS
cannot know that. Each honest option needs measuring in a browser against every
band the mark can land on — a top padding moves the page it is describing, which
is why the ring is an `outline` and not a border; bottom-right trades the quote
for the stat grid's captions; straddling is what the clipping correction already
ruled out. It is filed as its own unit rather than bolted onto the end of this
one.

## Open questions

Nothing blocking. Two worth a sentence, both carried:

- **A refusal can say a repair was declined and this surface still does not say
  it** (framework finding, 21 August). Still the next thing I would build after
  the chip.
- **"Ask about just this"** — the scope control, reasoned out in full in my own
  22 August finding. Unchanged by this run, and the demo tree is still eight
  bands, so the saving would still be about zero and the *claim* would still be
  worth making.

## The visuals

| | |
| --- | --- |
| [arrival](2026-08-23-demo-somebody-elses-page-arrival.png) | the first screen: a clinic's page, and an instrument. Two voices, and the bar says which is which before either of them speaks |
| [held](2026-08-23-demo-somebody-elses-page-held.png) | *Take the numbers off* — 3,400 appointments, 24 years, 92% seen within a week, ringed amber, and **Waiting on you** beside it. This is the sixty seconds |
| [applied](2026-08-23-demo-somebody-elses-page-applied.png) | one click later: the numbers are gone, the gap is ringed green, revision 1, *Put it back*. The chip collision described above is in this frame |
| [phone](2026-08-23-demo-somebody-elses-page-phone.png) | stacked at 390×844: the disclosure survives two lines of bar, and the rail still leads |

Every screenshot is this branch's `next build` output driven in Chromium — not
the preview, which this environment cannot open. See the pull request for the
preview URL.

**To see it yourself:** open `/demo` and press *Take the numbers off* without
scrolling first. Read the amber chip on the page and the amber badge in the rail,
then press *Apply this change*. Nothing about that path is new this week. What is
new is that it is happening to somebody.
