# The bulleted list is not a workaround

**Routine:** `Loom demo` · **Branch:** `demo-29-the-bulleted-list-is-not-a-workaround` ·
**26 September 2026**

**Pull request:** #395 · **No screenshot**, and that is the honest thing to say:
this run changes no pixel of any surface. Its subject is a pull-request body,
and the evidence is a body read back from the API, quoted in the finding.

A short entry rather than a unit of work. `demo-28-the-frame-the-press-produces`
merged this morning (#394); this is one thing that run learned on the way past,
which belongs in the channel before another lane acts on the opposite.

---

## What it is

The 25 September entry in `FINDINGS.md` concludes that a URL comes back
backticked **only** inside a markdown table cell, and tells every lane:

> **do not put a link in a table cell. A bulleted list of the same links
> survives intact.**

#394's body was written exactly that way — six screenshot links in a bulleted
list, no table anywhere in the description. Read back from the API, **five of
the six had double backticks injected into the URL**, which stops them being
links at all. The sixth, in the same list, in the same shape, pointing at the
same kind of file on the same branch, was clean.

So the shape that entry recommends is the shape that failed here, and the
boundary it draws — *in a table, mangled; outside, untouched* — is not the
boundary. A table is sufficient to break a link. It is not necessary.

## What this run did not do

**It did not propose a fifth theory.** Four have been offered and each has been
falsified by a later body: `decisions/` versus `reports/` paths, a link sitting
beside a bold `**`, an apostrophe straight after the closing paren, and the
table cell. The 22 September entry's author wrote *"I am not going to guess a
third time"*, and that was the right instinct; this entry adds a measurement and
no explanation.

**What has survived every test** is that entry's own conclusion, and this run is
its second confirmation: a **bare URL on its own line** comes through clean where
a markdown link does not. #394's body was rewritten that way and read back clean,
all six. That is the workaround worth publishing, and it costs a lane nothing but
a line break.

## What a stranger could not understand before this run, and still cannot

Nothing — no surface changed. The value is to the other six routines: one of them
would otherwise have followed a workaround that does not work, shipped a body
with five dead links in it, and spent a run rediscovering why. That is precisely
what `FINDINGS.md` exists to prevent, and it is worth a small pull request on the
day the wrong instruction is still the newest one in the file.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, read off the run and not off a
pipe (`VERIFY_EXIT=0`).

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 160 | 3,073 |
| `@loom/app` | 312 | 5,967 |

**806 findings, 0 malformed.** No test was added, changed, weakened or skipped —
the diff is one entry in `FINDINGS.md` and this report. `findings:check` is the
gate that actually reads the change, and it is inside `pnpm verify` for exactly
this reason.

## Findings

**Filed one, closed none.**

- Owned by whoever owns the pull-request tooling — *a bulleted list of markdown
  links is not a workaround: five of six were backticked, outside any table.*
  It narrows the 25 September entry's scope rather than its method: reading the
  body back is what caught both, and remains the rule.

## Open questions

Nothing blocking, and nothing for the maintainer to decide.

- **The mechanism is still unknown and still not visible from inside a routine.**
  Whatever injects the backticks is this repository, GitHub, or the tool the
  routines post through, and a run cannot tell which. Until someone can, the
  bare-URL form is free and works.
