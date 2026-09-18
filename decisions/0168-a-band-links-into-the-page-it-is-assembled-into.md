# 0168. A band links into the page it is assembled into, and the page is where that is checked

**Status:** Accepted
**Date:** 2026-09-18
**Section:** §4b

> **Why this number.** The highest record on `main` is `0166`. `0167` is claimed
> by #328, open at the time of writing. `0168` is the next number free on `main`
> and on every open branch, which is the discipline #313 had to be renumbered
> for not following.
>
> **Why `Accepted`.** It contradicts no `Accepted` record and it widens no
> schema. `linkUrlSchema` already accepts what this record tells the catalogue
> to use — the bare fragment landed on #294, closing a finding the maintainer
> filed — and [0053](0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md)'s
> allowlist is untouched, including the two schemes named below, which it has
> listed since it was written. What is decided here is a convention inside
> `src/primitives/compositions/` and where a property of the assembled page is
> asserted, both of which are this lane's own.

## Context

Three things were true at the same time on the morning of 18 September, and no
two of them had ever been in the same room.

**One.** Every band in the catalogue carries an `anchor`. `anchor.ts` says which
primitives may have one and why, in the narrowest possible terms:

> **Which primitives carry one.** The bands a page's own navigation points at,
> and nothing else.

Nineteen of them are on the assembled page and
[0165](0165-an-anchor-belongs-to-the-part-and-is-unique-over-the-assembled-page.md)
made them unique over it eight days ago.

**Two.** `linkUrlSchema` has accepted a bare `#fragment` since 14 September. It
was added to close a finding the maintainer filed on 12 September from
`prototypes/ski-apparel` — *a single long page with a nav bar across the top* —
whose complaint was precise: `href: "#helmets"` was refused, so the page wrote
`/#helmets`, which is correct only at a site root and anywhere else silently
leaves the page the reader is on.

**Three.** **Nothing in the catalogue pointed at any of it.** Nineteen marked
destinations, a schema that had been able to address them for four days, and
not one link anywhere in thirty bands that used either. `navBand` — the one band
whose entire job is to be the page's own navigation, and the band `anchor.ts`
names in its own header as the reason anchors exist — pointed at `/product`,
`/pricing`, `/docs` and `/changelog`: four routes of a site that does not exist,
on a page that had a section for each of them.

It was not an oversight that a reader could have caught. `compositions.test.ts`
asserted this, of every href in every band:

```ts
expect(href.startsWith("/")).toBe(true)
```

So the catalogue was **structurally prevented** from using the mechanism the
maintainer had asked for and been given. The test's stated reason is about
outbound links — *"a live outbound link in it is a link this library chose on a
host's behalf"* — which is a good reason, and its rule was one destination
narrower than its reason. A fragment is not an exception to *stay on this site*.
It is the strongest possible case of it: a path reaches this origin, and
`#pricing` reaches no origin at all.

## Decision

**A starting composition's internal links name parts of the page it is
assembled into, as bare fragments, and `PAGE_SEQUENCE` is where they are
checked.**

Three parts.

### A band may link to an anchor it does not itself carry

This is the part that makes the property a page's rather than a node's. A nav
bar that could only link to its own anchors would not be a nav bar. So the
catalogue's rule is not *every fragment resolves within this band* — that would
rule out navigation entirely — but *every fragment resolves within the assembled
page*, which is the tree this lane owns and the same place, for the same reason,
that 0165 put anchor uniqueness.

`compositions.test.ts` builds `PAGE_SEQUENCE`, collects every anchor and every
fragment, and fails if a fragment names nothing. It is the exact walk `url.ts`
asked for and declined to fake:

> **It does not check that the anchor exists.** That is the same fact about a
> tree rather than about a node that `anchor.ts` records for uniqueness, and it
> belongs to whatever walks the whole tree. A schema that pretended to enforce
> it would be enforcing nothing.

The two tests are a pair and a page can fail either while passing the other: one
refuses two bands answering to one name, the other refuses a name nothing
answers to. Both failures are equally silent — a fragment naming nothing scrolls
nowhere, renders perfectly and reports nothing.

### The catalogue's link rule is *reaches no origin, or reaches this one*

The assertion becomes a path, a fragment, or one of the two schemes 0053 has
always allowed and the catalogue had never written: `mailto:` and `tel:`.
Neither reaches an origin. Both hand the destination to the reader's own mail or
dial client, so neither can fetch, redirect, refer or track, and the one thing
an outbound link actually risks — that somebody else's server learns about this
page — is not available to either.

That widening is bounded by a second assertion rather than by good intentions,
because *reaches no origin* is a fact about the scheme and says nothing about
the address. **Every address the catalogue ships is in a reserved namespace that
provably resolves nowhere**: `.example` for mail (RFC 2606) and the UK's
reserved drama range for telephone. It is the mechanism `url.ts` already uses
one layer down, where `SAME_ORIGIN_PROBE` is `https://loom.invalid` for the
stated reason that *"a value that somehow escaped into a real request would fail
rather than reach a host someone owns"* — with the added property, which matters
for a placeholder a host may forget to change, that a reader can see it is a
placeholder without anything having to tell them.

### A multi-page site is a `configure` per link, and that is the cheap direction

`navBand` now ships four fragments. A host whose site really does have
`/pricing` changes four props, one operation each, against nodes that already
exist — the cheapest edit the delta model has.

The reverse was not cheap and that asymmetry is the whole argument. An author
who wanted same-page navigation out of the old band had to first discover that a
bare fragment was legal, which it was not until four days ago, and which nothing
in the catalogue demonstrated afterwards. A starting composition's job is to put
the reachable thing in front of someone; a mechanism nothing in the catalogue
uses is a mechanism most callers never find. That is the same argument
`metrics-chart` made on #321 one level down, and it was right there too.

## Alternatives considered

**Leave `navBand` pointing at routes, and add a second nav design that uses
fragments.** The instinct the catalogue has been running on for two weeks: when
two shapes are both defensible, ship both. Rejected because
[0162](0162-the-catalogue-is-a-phrasebook-and-the-page-is-one-path-through-it.md)
forbids it and is right to — a menu pointing at `#pricing` instead of `/pricing`
builds the **same four `loom.link` nodes** with different props, which is a
`configure` of the first band and not a second design. Shipping it would have put
a catalogue entry where a one-operation edit belongs, which is the precise
mistake 0162 exists to refuse. That the rule bit its author here is the first
evidence it is load-bearing rather than decorative.

**Keep `startsWith("/")` and write `/#pricing`.** What the maintainer's
prototype had to do, and it passes the old test without touching anything.
Rejected because it is the defect the finding was filed about rather than a way
around it: `/#pricing` is correct only when the page is the site root, and on any
other route it leaves the page the reader is on and lands them at the front
door's anchor. Nothing reports it, because nothing is wrong. A starting
composition that shipped it would be teaching the workaround to everyone who
dropped one in.

**Assert the fragment check over `STARTER_COMPOSITIONS`.** The larger list, and
symmetrical with where `mailto:` is checked. Rejected for the reason 0165 gives
for the same choice: a band in isolation may legitimately name an anchor it does
not carry — that is what a nav bar *is* — so the assertion would either fail on
the one band it most needs to pass, or would have to exempt navigation and
thereby exempt the only case it was written for.

**Give `Composition` a `links: CompositionPart[]` field and derive the hrefs.**
Tempting, because it would make the check structural rather than a walk over
built nodes: a band could not name a part that is not in `COMPOSITION_PARTS`.
Rejected because it moves a fact about *the nodes* into metadata beside them, and
the two can then disagree — a band could declare `links: ["pricing"]` and build a
link to `#faq`, and the check would be measuring the declaration. The walk reads
what the band actually builds, which is the thing a reader gets. It is also a
field every band but one would leave empty.

**Widen the link rule to any scheme in `linkUrlSchema`.** `http:` and `https:`
are on the allowlist too, so the catalogue's rule could simply defer to the
schema. Rejected because the schema's job and this test's job are different: the
schema refuses what is *dangerous*, and the catalogue refuses what is *somebody
else's*. An `https://github.com` link is perfectly safe and is still this library
choosing an outbound destination for a host who has not read the page yet. The
two named schemes are added because they reach no origin, not because they are
allowed.

## Consequences

**A new band that links off the page is now a decision rather than a default.**
Paths are still allowed and the footer still ships sixteen of them, because a
footer legitimately points at things that are not on this page — legal pages,
documentation, careers. What changed is that a band pointing at `/pricing` when
the page has a `#pricing` is now visibly a choice somebody made.

**The fragment check binds `PAGE_SEQUENCE` and not the phrasebook**, so a band
that names an anchor no canonical design carries fails the build even though the
band alone is fine. That is the correct severity — it is precisely the defect
that is invisible otherwise — but it means a part whose canonical design drops
its anchor breaks whatever links to it, which is a dependency between bands that
did not previously exist. It is also the dependency a page *has*, now written
down where a red test can say so.

**It does not check the anchor is reachable on a host's own page.** A band
dropped into a real site alongside bands this catalogue did not build is outside
what any test here can see, and the render seam's whole-tree walk — still
unbuilt, still the framework's, named in `anchor.ts` and again in 0165 — remains
the only thing that could. This record narrows the gap to pages nobody assembled
from the catalogue; it does not close it.
