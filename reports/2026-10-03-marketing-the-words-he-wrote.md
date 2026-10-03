# 2026-10-03 — marketing: the words he wrote

Four copy changes the maintainer gave as a table of *current* against *change
to*, applied to the front door. Three of the four are his words verbatim; two
carry a one-word edit, and both are marked below.

![the front door](2026-10-03-his-words-after-hero.png)

---

## What changed

| where | from | to |
| --- | --- | --- |
| the hero headline | *The AI age needs a new way to build web apps.* | **Make your web page dynamic with AI and Loom** |
| the hero lead | *…Loom is where you and the AI build it — adaptive to your users, answerable to your rules, and secure.* | **AI already writes the components, but would you trust AI to dynamically change your web page? What your page evolves to is yet to be built. Loom and AI are how your page evolves together.** |
| *What is Loom?* heading | *A governance framework for modern AI-enabled web development and adaptation.* | **A governance framework for modern AI-enabled adaptive web pages.** |
| the four-steps lead | *Loom needs two things from you: which components an AI model is allowed to use, and what it is allowed to do with them.* | **Loom provides the oversight and governance.** |

### The two edits, both one word

He said the new text could be modified slightly. It was, twice, and only where
a reader would otherwise see a mistake:

- **A comma before *but*.** *"AI already writes the components but would you
  trust AI…"* joins two independent clauses, and the second is a question. The
  comma is the standard join and changes nothing else.
- **`is` → `are`.** *"Loom and AI is how your page evolves together"* has a
  compound subject. It reads as a slip rather than as a compound noun on a page
  a stranger is judging in ten seconds.

Nothing else was touched. The headline keeps his lack of a full stop, which is
normal for a headline and which turned out to matter — see below.

---

## The headline with no full stop found a real defect in a test

`voice.test.ts` has held every opening band to a thirty-word sentence since it
was written. It did it by taking `wordsOf(hero)` — **every string in the band
joined with a space** — and splitting on terminal punctuation.

**A band is not a paragraph.** An eyebrow, a headline and two button labels have
no full stops at the end of them, because none of them is a sentence. So the
splitter ran each one into whatever came next. On the front door it was reading
this as a single sentence of thirty-three words:

> *For pages that AI is allowed to change Make your web page dynamic with AI and
> Loom AI already writes the components, but would you trust AI to dynamically
> change your web page?*

That is the eyebrow, the headline and the lead's opening clause. It also read
the two actions as *"See how a change travels Try it yourself"*. The longest
real sentence in the band is **sixteen words**.

**It passed for seven weeks because the old headline ended in a full stop**,
which broke the blob in the one place that made the arithmetic come out. The new
headline does not, so the test reported a thirty-three-word sentence nobody had
written.

The fix is the instrument, not the headline. It now measures each string the
band carries on its own, which is what the site-wide sentence rule added on
3 October has always done — `readerCopy` and `sentencesOf` already existed one
screen below it. **The alternative was punctuating a headline to satisfy a
splitter, which is a test editing the page it is supposed to be reading.**

Three tests added with it, one per route, asserting the band has copy in it at
all, so the rule cannot pass by reading nothing.

---

## What shipped

| file | what changed |
| --- | --- |
| `_lib/pages/home.ts` | the four strings |
| `_lib/copy.ts` | `MAINTAINERS_OWN`, which carries the headline and the lead verbatim, moved with them |
| `_lib/voice.test.ts` | the opening-band sentence rule reads each string rather than the joined band, with the measurement above |

`MAINTAINERS_OWN` is the list added this morning that holds, verbatim, the lines
on this site he wrote. It is held from both ends — an entry has to still be
rendered — so the hero changes **could not** have landed without updating it,
which is the guard working on the first day it had a job to do.

No primitive added, nothing under `src/` opened, no component written, nothing
outside `app/(marketing)/` and `reports/`.

### What the copy rules say about the new text

All of it passes unchanged, and worth stating because three of these were
written this morning:

- **No reserved vocabulary** on the front door. *Governance*, *oversight*,
  *dynamic* and *evolves* are none of the twelve.
- **No em dash anywhere in reader copy**, which is now true of the whole site
  without an exemption: the only one left was in the hero lead, and his
  replacement does not have one.
- **Every sentence is inside thirty words.** The longest in the band is sixteen.
- ***your page* and *your rules* are both still on the front door** — the one
  habit from his reference that a test can check. *your rules* now arrives in
  the four-steps heading rather than in the hero lead, which is why that
  assertion is worth having.

### The site got shorter

| | before | after |
| --- | --- | --- |
| the front door | 1,152 | **1,126** |
| the site, as published | 2,516 | **2,490** |
| the site, as served | 2,972 | **2,946** |

26 words, nearly all of them from the four-steps lead. Against the 3,300 ceiling
the site is at 89%.

---

## Gate

`pnpm install && pnpm verify` — **exit 0**, on a deleted `dist` and `.next`,
status written to a file as the last thing on its line and read in a separate
command.

| | `main` at `1589c51` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 177 files / 3,699 | **177 / 3,699** — `src/` untouched |
| `@loom/app` | 370 / 6,595, 0 skipped | **370 / 6,598**, 0 skipped |
| the marketing suite | 39 files / 1,024 | **39 / 1,027** |
| findings | 969 | **969**, 0 malformed |
| `prerender:check` | — | 124 pages, 1,470 junctions, 0 run together |
| `pnpm shoot` | — | `1280 / 1280`, `390 / 390` — no overflow |

**Three tests added. Nothing weakened, skipped or deleted**, and the rewritten
rule is stricter than the one it replaces rather than looser: it was measuring
joins, and a real forty-word sentence put into the hero fails it, the site-wide
rule, and the `MAINTAINERS_OWN` guard together. Checked by doing exactly that.

Photographed at 1280 and 390, and on `bold` as well as the default palette. The
headline runs to five lines at 390, which is one more than the old one; no
overflow at either width.

No decision record. No finding filed or closed: this is copy the maintainer
specified and one test corrected in passing.

---

## Open questions

1. **The hero question is answered and should come off the list.** It has been
   this lane's standing open question since 27 September — the only part of the
   site arguing a build case while everything under it argued governance. The
   new headline and lead are his, and they argue adaptation with governance
   underneath, which closes it.
2. **The word ceiling**, unchanged and still his. The site is 2,946 as served
   against a 3,300 ceiling, which is 89%. The honest figure moved from 2,512 to
   2,972 on 3 October because the budget had been measuring the page as
   published rather than as served; this change takes it to 2,946. If 3,300 was
   a verdict on the old ten-page site rather than a standing limit, it is one
   line.
