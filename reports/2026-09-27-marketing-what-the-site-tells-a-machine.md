# 2026-09-27 — marketing: what the site tells a machine

Asked for: the site should be optimized for AI search (GEO) and for SEO.

The honest starting point is that **most of the SEO was already there** and the
useful work is in the half nobody had done. Measured against the built
application before anything changed:

| already in place | |
| --- | --- |
| unique `<title>` and `<meta name="description">` per page | yes |
| `<link rel="canonical">` at the bare address | yes, since 8 September |
| `/sitemap.xml`, composed from the route lists | yes, since 24 September |
| `/robots.txt`, with guarded surfaces disallowed | yes, since #388 |
| Open Graph and Twitter cards, with a per-page image | yes |
| exactly one `<h1>` per page, semantic headings | yes, asserted |
| server-rendered HTML, no client-side content | yes — the whole site is a tree |

| missing | |
| --- | --- |
| structured data of any kind | **nothing at all** |
| an `/llms.txt` | **nothing at all** |

So this branch is those two, plus the thing that makes them safe.

---

## What shipped

| file | what it is |
| --- | --- |
| `_lib/questions.ts` | the five front-door questions, as data — one list, two readers |
| `_lib/schema.ts` | the `schema.org` graph per route, and `UNMADE_CLAIMS` |
| `_components/structured-data.tsx` | the `<script type="application/ld+json">` |
| `llms.txt/route.ts` | the map for something that arrived to read rather than crawl |
| `_lib/schema.test.tsx` · `llms.txt/route.test.ts` | 40 cases |

### The graph

One `@graph` per page rather than several scripts, so nodes reference each other
by `@id` — every page's `WebPage` points at **one** `WebSite` and **one**
`SoftwareApplication` rather than restating them, which is what stops a crawler
that read three pages concluding there are three products.

| node | on | carries |
| --- | --- | --- |
| `WebSite` | every page | the wordmark, the front door's description |
| `SoftwareApplication` | every page | `DeveloperApplication`, `sameAs` the repository |
| `WebPage` + `BreadcrumbList` | every page | the route's own title and description, two levels deep because the site is two levels |
| `FAQPage` | `/` only | the five questions, word for word |

Verified against the served production build, not the builders:

```
types: ['WebSite', 'SoftwareApplication', 'WebPage', 'FAQPage']
questions: 5
software keys: ['@id', '@type', 'applicationCategory', 'description',
                'name', 'operatingSystem', 'sameAs', 'url']
```

### `/llms.txt`

`200 text/plain; charset=utf-8`. The site's pages in reading order with their
descriptions, the unguarded surfaces with their blurbs, and every question with
its answer in full.

It is a **convention rather than a standard** — there is no specification to
conform to and no consumer obliged to fetch it — and that is worth saying
plainly rather than implying otherwise. It costs one route, it cannot go stale,
and if nothing ever reads it the site has lost nothing.

---

## The part that is actually about GEO

The `FAQPage` is the piece that does the most work, and the reason is worth
writing down because it decides how future copy should be written.

**An assistant quotes what it can lift.** Everything else on this site is prose
that has to be paraphrased, and a paraphrase is where a claim gets softened or
mangled. The five answers are the only text here written to be true *away* from
the page they are on, and the schema hands them over in the one format that
needs no parsing.

So `questions.ts` carries a rule its type comments state and a test enforces:
an answer is a whole answer, ends in a full stop, is longer than forty
characters, and never opens with *It does that too* or *Also* — the shapes that
are correct in a band and useless in a search result.

**What this does not do**, said plainly because the ask deserves it: structured
data makes a page *parseable*, not *citeable*. What decides whether an assistant
reaches for this site at all is whether the site answers questions people
actually ask and whether anything else on the internet points here. The first is
what yesterday's cut was for. The second is not an engineering task.

---

## The thing that makes it safe, which is most of the work

A JSON-LD graph does not render. A wrong field in one breaks no page, fails no
diagnostic, changes no screenshot, and reads as the same green as a correct one.
It is also the one text on this site with a **non-human reader** — so a wrong
claim in it is repeated by a machine to somebody who never opens the page.

The dangerous fields are the ones that make a graph look more complete, and each
is one line:

| field | what adding it would claim |
| --- | --- |
| `offers` / `price: "0"` | a price nobody has set, on a product whose licensing is explicitly unsettled |
| `aggregateRating` | that people have rated this. Nobody has |
| `publisher` as an `Organization` | that somebody in particular publishes this, which is positioning |
| `dateModified` | a date nothing at serve time knows — the sitemap's own recorded argument |

`UNMADE_CLAIMS` is a denylist of exactly those, swept over every node of every
page's graph, with a second assertion from the other side that no value anywhere
is a bare number or a currency code — because a price can arrive as a value
rather than as a key.

**Checked red.** Planting `offers: { price: "0", priceCurrency: "USD" }` and an
`aggregateRating` of 4.8 from 37 reviews fails **six** assertions. Before today
that plant would have passed the entire suite.

A third assertion holds the rest: **every string in the graph must appear
somewhere a person edits** — a route's title, label or description, or
`questions.ts` — so a literal typed into the schema and left to go stale fails
rather than drifts.

### And the FAQ is now one list

The five questions were written inline in `home.ts`. They are `questions.ts`
now, read by the band and by the graph. An answer reworded on the page and not
in the schema would be this site telling a person one thing and an assistant
another, with nothing on any screen to say so — so the test holds them equal
word for word rather than by count.

Nothing a visitor sees changed.

---

## Why this surface renders a `<script>` at all

0067 says this site composes registered primitives and may not grow a component
library, and the layout's comment says *the whole page is data* has to be true
at the edges too. `CountReaders` is the standing exception and returns `null`.

The reasoning there is the reasoning here, and it is about what a visitor
**sees**: a reader signal is a fact about somebody reading and no tree can hold
one; a JSON-LD graph is a statement about the page and no tree can hold one
either. The tag has no box, no text node, no styles, cannot be themed, and is
invisible in every palette.

**No primitive is missing.** `loom.code` prints data *for a reader to look at*;
this is data for a reader never to see. A primitive that emitted a script tag
would be a primitive that could put arbitrary script into any page a model can
edit — not a finding to file, a thing that must not exist.

The JSON goes in through `dangerouslySetInnerHTML`, which is the only way to
avoid React escaping the quotes into entities and leaving a crawler something
unparseable. It is safe because every string in the graph is a literal in this
repository and none is read from a request, a query string, a database or a
model. `</script>` is escaped anyway, and asserted, because the day one of those
strings stops being ours is the day nobody re-reads the comment.

---

## Findings

**Two filed, one closed here.**

- **A preview deployment now carries a full structured-data graph and nothing
  tells a crawler to ignore it.** For `Loom daily build`; open. This sharpens
  the `noindex` question this lane has carried since 8 September rather than
  adding a new one. The canonical points at the preview's own address, so a
  preview never competes with production — but there is one preview per pull
  request, and a page with a `FAQPage` and a `SoftwareApplication` node is a
  better thing to index than plain HTML was. One line in `robots.ts`, which is
  the shell's file by 0190. **Held rather than taken**: turning indexing off on
  the wrong deployment is a silent, total SEO failure, and which deployments are
  production is a deployment question.
- **Structured data is the one text nobody proofreads**, and a fabricated rating
  would have passed every test this repository had. This lane's own, closed.
  Offered to any lane that adds schema later: *a comment explaining why a field
  is absent is not a mechanism.*

---

## Open questions for the maintainer

- **Who publishes this?** `publisher` and `author` are omitted because naming an
  organization is positioning and positioning is yours. `sameAs` names the
  repository, which is a fact about where the code is and says nothing about who
  owns it. One word from you and the graph names a publisher.
- **`noindex` on previews** — the finding above. My recommendation is yes, and
  it is one line, but it is gated on which deployments count as production.
- **The licence line**, still this site's one placeholder.

---

## Tests

`pnpm verify` — **exit 0**, read off the run rather than a pipe, on a `.next`
and a `dist` deleted first.

| | |
| --- | --- |
| runtime | **3,130 passed** in 161 files — untouched |
| application | **5,197 passed** in 301 files — 40 added |
| marketing suite | **914 passed** in 29 files |
| findings | **815**, 0 malformed |
| prerender | 112 pages, 1,285 junctions, 0 run together, 0 unserved |

Checked on the served production build rather than on the builders: one LD block
per page, four node types on `/`, five questions, `/llms.txt` at
`text/plain; charset=utf-8`, and title, description, canonical, `og:image` and
exactly one `<h1>` on each of the three pages.

Nothing was skipped or weakened. No decision record: this adds a metadata route
and a script tag, and touches no tree schema, no delta model and no `Accepted`
record.
