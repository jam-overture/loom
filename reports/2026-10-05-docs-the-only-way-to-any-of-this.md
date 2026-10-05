# 5 October 2026 — the rail nothing rendered, and the menu that stayed open

**Routine:** `Loom docs` · **Branch:** `docs-46-the-only-way-to-any-of-this` ·
**Section:** §4c

No open pull request from this lane at the start of the run, so this is a fresh
branch off `main` at `f79e1d9`. No maintainer comments were outstanding on any
pull request of this lane's. The work is the top of this lane's own list on the
4 October report — *a render test for `sidebar` and `mobile-nav`* — and the
oldest open instance of this lane's 2 October finding.

## The hole, in one sentence

`nav.test.ts` holds the model behind the rail about as hard as a model gets held
on this site: every href unique, no empty section, reading order, the pager's
walk forwards and backwards, a section boundary crossed rather than stopped at,
a landing page's address and that it is not listed twice, a summary on every
page that reads as a sentence. **Every one of those assertions stays green if
the rail prints nothing at all** — and the rail is how a reader reaches any page
of this site other than the one they are on. On a phone it is the only way.

That is the 2 October class entry exactly, on the two of its six remaining
components that are not decoration. Twenty-five assertions over two new files,
and the second of them found a defect.

## What the two files hold

**`_components/sidebar.test.tsx`** reads the rail back out of the document and
holds it against `docsOrder` in both directions. The count is asserted first and
separately, because every other test walks a list and compares it to the page —
a rail that printed nothing would satisfy a membership check and an order check
at once.

| | |
| --- | --- |
| a link per page | `hrefsOf(rail)` has `docsOrder.length` entries, and `docsOrder.length > 1` |
| reaches everywhere, and nowhere else | the **set** of hrefs equals the set `docsOrder` gives |
| in reading order | the **list** of hrefs equals `docsOrder`'s, in order |
| by the right name | each link's text is that entry's `page.title` |
| grouped | each section's `<ul>` lists exactly `docsPagesIn(section)`, in order |
| a section's own name | a link where `docsLandingOf` answers, a `<p>` where it does not |
| and not twice | nothing under a section's name links to the section's own page |
| where the reader is | `aria-current="page"` on exactly one link, and it is this page's |
| not only in colour | `font-medium` on that link and on no other |
| the mono face | on every page of a `generated` section and on none of a `written` one |
| dismissal | **every** link pressed, both places the handler is spread |

Two of those are worth a sentence. **Reading order is a coincidence of two
decisions rather than one fact**: the rail puts a section's own page on the
section's title and the rest underneath it, and `docsOrder` flattens a landing
page first, so the rail's links in document order are `docsOrder` exactly. And
**"not only in colour" is asserted as weight**, because the two greys either
side of the mark are `text-ink` and `text-ink-muted` — a rail that marked the
current page in colour alone would look very nearly right and would say nothing
to a reader who cannot tell those two apart. The component's docblock states the
rule twice and nothing held it.

**`_components/mobile-nav.test.tsx`** drives the menu: closed to begin with with
**no links in the document** rather than hidden ones, open on a press and closed
on the next, the glyph `aria-hidden` in both states, the rail inside it the whole
site in reading order, and every link in it closing the menu.

## The defect

`MobileNav` held `useState(false)` and cleared it from `Sidebar`'s `onNavigate`
— which is a link pressed **inside the menu**, and the only navigation it knew
about.

It is mounted by `docs/layout.tsx`, and a layout is preserved across every
navigation inside it. That is what a layout is for, and it means the flag was
preserved too. **Every other way of leaving a documentation page left the menu
open over the page the reader had just asked for**, and on a phone that is most
of them:

- the search dialog in the header, which `router.push`es its result;
- a cross-reference in the prose, which is the commonest of all — the
  quickstart page alone has six;
- the pager at the foot of the page;
- the wordmark, which goes to `/docs` and from there to the first page.

In each case a reader asks for a page, gets it, and is looking at a list of
forty-six links instead — with the one control that would clear it being a *Close*
button for something they do not remember opening.

**Nothing in the component was wrong.** `onNavigate` does exactly what it was
written to do. The gap is between a component's lifetime and a route's, and it
is invisible from inside the component: not one of those four navigations is
something `MobileNav` could be told about.

### The fix is to stop holding a flag

The state is now **which page the menu was opened on**:

```tsx
const pathname = usePathname()
const [openAt, setOpenAt] = useState<string | undefined>(undefined)

const open = openAt === pathname
```

Every navigation closes it, including the ones nobody has thought of, with no
effect to run and nothing to clean up. `onNavigate` stays, and both halves are
load-bearing: a route pushed from inside the panel takes a moment to commit, so
without the callback the menu is over the page for as long as it is pending.

Two tests hold it, and **both are red against the version that shipped** —
confirmed by restoring `mobile-nav.tsx` from `origin/main` and running the file:
7 passed, 2 failed, the two being *a navigation the menu had no part in closes
it* and *opens again on the page it landed on, marking that page*.

## Decisions taken that were not specified

**No decision record.** Nothing here touches the tree schema, the delta model or
an `Accepted` record. No primitive is added, no page's prose changes,
`git diff origin/main -- src/ tools/` is empty, and the prerendered HTML is
byte-identical in the one number that would see it move (below).

**A fix rather than a finding, because it is this lane's own file.**
`apps/loom/app/(docs)/_components/mobile-nav.tsx` is the documentation route
group. The *class* it belongs to is filed, with the one other instance of the
shape named for its owner to judge rather than fixed from here.

**The dismissal test presses every link rather than a sample.** The handler is
spread in two places inside `Sidebar` — a section's own name and a page under it
— and the section's name is the one that would be missed. Forty-six presses cost
0.4 seconds.

**`aria-current` is asserted by count, not by presence.** *At least one link is
marked* is satisfied by a rail that marks all of them; the test that a page in
the middle is current is the same assertion as the test that the others are not.

## Tests

`pnpm install && pnpm verify` at the repository root, on a `dist` and a `.next`
deleted first: **green, exit 0**, with the status written to a file as the last
thing on its own line and read in a separate command. Both columns below are
full runs under the same conditions, so the library numbers being identical is a
measurement rather than an inference.

| | `main` at `f79e1d9` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 180 files / 3,803 tests | **180 / 3,803** — `src/` was not opened |
| `@loom/app` | 378 / 6,776 | **380 / 6,801** |
| findings ledger | 996 entries, 0 malformed | **998**, 0 malformed |
| `prerender:check` | 124 pages / 1,536 text junctions | **124 / 1,536**, 0 run together |

**+25 tests, +2 files. Nothing weakened, skipped or deleted**, and no existing
assertion was changed: the diff adds two test files, rewrites eleven lines of
one component, and appends to the ledger.

**The junction count is the figure worth a second look, because it did not
move.** This branch changes a component that every documentation page renders,
and the prerendered HTML is unchanged — which is the right answer: the menu is
closed in every prerender, and a closed menu was a button and nothing else
before this change and is a button and nothing else after it.

## Green is not evidence — twenty-six mutations, and none survived

Each introduced one at a time against the committed code and reverted before the
next, with both files run each time.

| what was broken | tests that went red |
| --- | --- |
| the rail draws no sections at all | 19 |
| a section lists none of its pages | 15 |
| a section's name is never a link | 12 |
| a section lists its own page under itself too | 11 |
| the sections come out in reverse order | 9 |
| the rail is an unnamed landmark | 7 |
| a page's pages come out reversed | 6 |
| every page in the rail is the current one | 6 |
| the closed menu is in the document and merely hidden | 5 |
| no page in the rail is ever the current one | 4 |
| the current page is not marked for a screen reader | 3 |
| pressing a page in the rail dismisses nothing | 2 |
| pressing a section's name dismisses nothing | 2 |
| the toggle's two labels are the wrong way round | 2 |
| **the menu is a flag rather than the page it was opened on** | **2** — this is the defect |
| the rail calls a page by its slug | 1 |
| the current page is marked in colour alone | 1 |
| a current section's name is underlined by nothing | 1 |
| a section's name is never the current page | 1 |
| every page in the rail is set in the mono face | 1 |
| no page in the rail is set in the mono face | 1 |
| the toggle never reports itself open | 1 |
| the toggle opens and never closes | 1 |
| the menu hands the rail nobody to tell | 1 |
| the glyph is read aloud | 1 |

The two one-red rows at the bottom of the colour half are the ones the pass was
run for. *The current page is marked in colour alone* and *a current section's
name is underlined by nothing* are the component's own stated rule, and before
this file nothing anywhere went red for either. They go red for one test each
now, which is the honest number: it is one claim, asserted once.

**A note on the method rather than the result.** One mutation was written and
reported as `NOT APPLIED (2 matches)` instead of running — the anchor for
*pressing a section's name dismisses nothing* was a six-space `{...dismiss}`,
which is a substring of the twenty-space one. The script says so rather than
silently mutating the wrong line, which is the only reason it was noticed. It
was re-run against a longer anchor and is in the table at its real number.

## The visual that could not be taken

The shot that would show this defect is one shot: open the menu, press the
pager, photograph the page it lands on. **No shot list can take it.** A `do`
list runs `pinNavigation` first — a capture-phase listener calling
`preventDefault` on every click inside an `a[href]`, for the duration of the
steps, decided by
[0159](../decisions/0159-an-instrument-may-reach-a-state-and-may-never-assert-one.md)
and for a reason that is right for the case it was written for.

The failure mode is the bad kind. The harness exits 0, every measurement is
internally consistent, and the picture it produces is of the page the shot
started on with the menu still open — which is **precisely the broken behaviour
this branch fixes**, photographed from a build that does not have it. It took a
second shot list, pressing `a[rel=next]` with no menu involved at all, to
establish that the press was the thing not working: `a[rel=prev]` came back
`no match` on a page that would have had one.

It is filed, as an extension of this lane's closed 13 September entry whose own
closing note is the sentence that became this limit, with a remedy that does not
reopen the pin — a step that *means* to navigate, and says so in its name. That
would need a line in 0159, so it is `ARCHITECTURAL — needs review` for whoever
picks it up and not something to add quietly.

So the pictures are of the components the tests are about, and the report says
what is true rather than claiming a picture of a menu closing.

## At 390 pixels and at 1280

`scrollWidth 390 / innerWidth 390` on all three phone shots and `1280 / 1280` on
both wide ones. `built 2026-10-05T14:13:11.970Z`, served by the harness itself.

```
text=Browse the documentation       x 0 y 57  390x44
nav[aria-label='Documentation']     x 0 y 102  390x1712   ← 970 past the fold
text=Close                          x 0 y 57  390x44
… a[aria-current]                   x 24 y 158  350x32
```

**1712 pixels of menu in an 844-pixel screen** is the number to read, and it is
the whole argument for this branch in one measurement. The open panel is twice
the height of the phone it is on: a reader who arrives at a page with it open is
not looking at a strip of chrome they can scroll past, they are looking at two
screens of links where the page they asked for should be. The closed menu
measures 44 pixels and holds nothing — `nav[aria-label='Documentation']` reports
`0x0` on the closed shot, which is the clipped desktop rail and not a hidden
copy of this one.

On the wide shots the rail is `255x1730` against a 900-pixel viewport, and the
reference's seventeen doors measure `215x31` each in the mono face — the one
place the rail sets a page's name in something other than the prose face,
because those names are things a reader types.

## Scope

`apps/loom/app/(docs)/` only, plus `FINDINGS.md`, this report, its shot list and
its screenshots. `git diff origin/main -- src/ tools/` is empty, and so is the
same diff against every other route group.

Two files are new — `_components/sidebar.test.tsx` and
`_components/mobile-nav.test.tsx`. One is changed: `_components/mobile-nav.tsx`,
eleven lines of it. **`_components/sidebar.tsx` is untouched** — it passed
every assertion written against it, including the two about colour, and the
twenty-six-mutation pass is the evidence that the assertions bite rather than
that the component was lucky.

## Findings

**Closed — two, both instances of one class.** The 2 October entry's `sidebar`
and `mobile-nav` rows. Four chrome components remain and all four are
decoration: `callout`, `code-block`, `submit-seam`, `theme-toggle`.

**Filed — two.**

1. *State in a component a layout mounts outlives every navigation inside that
   layout.* Closed for `(docs)` on this branch, and filed rather than reported
   because the shape is not this surface's: a grep finds one other instance,
   `(lessons)/_components/notice.tsx`, which is **not** being called a defect —
   the warning it belongs to is a property of the browser rather than of the
   page, so a panel that stays expanded across a navigation may well be what its
   owner wants. Named so the judgement is made rather than inherited.
2. *A `do` list pins the page against anchor clicks*, above. For
   `Loom daily build`, as a stated limit of an `Accepted` record rather than a
   defect.

**Not re-filed:** the preview URL is not derivable from the branch name and the
egress policy denies the check that would catch it (27 September); the
screenshot harness photographs an address while the theme lives in
`localStorage`, so these pictures are light (14–16 September); three spellers in
one route group (1 October); the ten British names in the published API
(27 September).

## What I would write next

- **A worked `<meta name="theme-color">`**, which the theming page names as a
  case and does not show. Carried from the 4 October report. It is the one item
  on that page's list a host cannot write from the page alone, because it is a
  Next.js metadata question as much as a Loom one.
- **`search`'s own keyboard contract against the rail's.** `search.test.tsx` is
  the most thorough file in this route group and the one thing it does not cover
  is what a result press does to the chrome around it — which is the half of
  today's defect that a test on `MobileNav` alone cannot reach, because the
  component that pushes the route is the other one.
- **The `signals` door's narrower-door saving in kilobytes rather than in
  files** (23 September, open) — still blocked on the same judgement about
  wording, which is the maintainer's and is in the entry.
