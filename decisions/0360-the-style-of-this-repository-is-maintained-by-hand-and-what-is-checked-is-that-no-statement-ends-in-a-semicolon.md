# 0360. The style of this repository is maintained by hand, and what is checked is that no statement ends in a semicolon

**Status:** Accepted
**Date:** 2026-11-06
**Section:** §1 (process)

> **Why this number.** `0359` was the highest on `main` at `44b0ee3`, which this
> branch is cut from, and `0353` is claimed by the open #778. `0360` was free on
> both.
>
> **Why `Accepted`.** It writes down what the repository has always done and adds
> one check over it. No dependency, no build step, no change to any source. It
> is `§1` process rather than architecture: nothing about the tree, the delta
> model or what Loom is. It is recorded rather than left as a habit because
> **reversing it is expensive in exactly the way this format exists to flag** —
> adopting a formatter means one diff over every file in the repository, and
> that is a decision somebody should make on purpose.

## Context

`Loom signals` filed this on 12 October 2026. That run wrote a module, then ran
`npx prettier --write` on it and on the two existing files it had edited, on the
reasonable assumption that the style here was a formatter's output.

It is not. **There is no `.prettierrc`, no `prettier.config.*`, no
`.editorconfig` and no formatter in any `package.json`** — not at the root and
not in `apps/loom`. So prettier ran on its own defaults, which are not this
repository's: a semicolon at the end of every statement, and a rewrap at 80
columns where the code sits at up to about 100.

**What it would have cost.** Two of the three files were `src/signals/silences.ts`
and its suite, where the real change was a vocabulary member and a condition —
about 150 lines across both. The reformat turned that into a diff touching
roughly every line of a 640-line module and a 700-line suite, for a change
nobody could then review.

**Nothing in `pnpm verify` would have failed.** There is no lint or format step,
so `build`, `typecheck`, `test`, `findings:check` and `prerender:check` are all
green on a wholly reformatted file. It was caught because a semicolon count in a
file that lane had not written looked wrong, and the two existing files were
reverted and re-edited by exact replacement.

The filing is explicit that the expensive part is not the near-miss:

> *What is expensive is the current state, where the question has no answer in
> the repository and every lane has to rediscover it.*

**That was true when it was filed, and half of it has since been met by somebody
else.** `docs/routines.md` has carried the answer in prose under **Standards**
since 1 November (#742) — *the repository is formatted by hand, and no formatter
is to be run over it* — and that paragraph credits an **earlier** instance, filed
by `Loom marketing` on 23 September, which cost that run a full revert and the
re-application of eight files' worth of edits.

So the history is two instances three weeks apart, both caught by eye, and a
prose answer that arrived twenty days after the second one. A lane reaching for a
formatter is not being careless — it was, for six weeks, answering a question
nobody had written down.

**What is still missing is the half prose cannot do.** `pnpm verify` is green on
a wholly reformatted file today exactly as it was on 12 October, and the thing
that caught both instances was a person noticing that a semicolon count looked
wrong.

## Decision

**1. There is deliberately no formatter in this repository.** No configuration
for one, no dependency on one, no `format` or `format:check` step in `verify`.

**2. The style is matched by reading the file beside yours.** No semicolons,
double quotes, about a 100-column wrap, named exports, a docblock that says why.
`npx <formatter>` in a repository with no configuration for that formatter is a
rewrite rather than a format, and a run that wants a file formatted should not
invoke one.

**3. One property is checked, and it is the one a formatter cannot avoid
changing: no statement in this repository ends in a semicolon.**
`tools/sources/semicolons.ts` holds it and sweeps every source under `src/`,
`tools/` and `apps/loom/`. Measured when written: 1,920 sources, **zero**. Two
shapes are exempt and both are the language rather than a style — the clauses of
a `for` header spread over lines, and an HTML entity closing JSX text
(`&hellip;`, four times in `(lessons)`).

This is a **detector, not a style rule.** It says nothing about quoting,
wrapping or spacing, because those cannot be held cheaply and are not what a
reformat is noticed by. What it buys is that a run which reaches for a formatter
goes red **on its own branch, naming the file**, rather than on `main` a day
later with everybody's diff already unreadable.

**4. Adopting a formatter supersedes this record.** It is not a thing to add
quietly, because the first run of one is a diff over every file.

## Consequences

- The question has had an answer in prose since 1 November; it now also has one
  that runs. Both halves of the filing are met and it can be closed.
- A reformat is caught by `pnpm verify` on the branch that caused it, which is
  the half that prose cannot do.
- The style beyond that one property stays a matter of reading the neighbouring
  file. A lane that wraps at 80 columns by hand is not failing anything, and
  nothing in this repository will tell it so.
- The check costs one pass over 1,920 sources inside an existing suite, and no
  new dependency or `verify` step.
- **Generated declaration files are outside it**, which the check found for
  itself: the first sweep after a `next build` reported `apps/loom/next-env.d.ts`,
  which Next writes, `.gitignore` lists and nothing here styles. Git tracks no
  `.d.ts` in this repository, so excluding them loses nothing.
- `src/primitives/stylesheet.ts` and the other CSS- and SQL-in-template-literal
  modules are unaffected: those semicolons are inside template literals, which
  `tools/sources/code.ts` blanks before anything is counted.

## Alternatives considered

**A `.prettierrc` stating the style the repository already follows, plus
`format:check` in `verify`.** The filing's first option, and the more obvious
one. Rejected: no formatter reproduces a hand-maintained style exactly, so
adopting one is not a configuration change but a **one-off reformat of every
file in the repository**, landing as a diff nobody can review, in a week when
four surfaces are merging against one gate. It also buys less than it looks —
it would hold the whole style, but only by first making the whole style a
formatter's.

**A line in `docs/routines.md` and nothing else.** The filing's second option
and its own recommendation, as the cheaper one. **Not rejected — already done, by
another lane, and it is why this record adds a check rather than a third
paragraph.** The prose landed on 1 November under **Standards**, and that
paragraph is now extended by one sentence pointing here; nothing it already says
is repeated.

What prose cannot do is notice the run that did not read it, and the record of
this particular convention is that two runs did not: `routines.md` is *read
first, every run*, and reaching for a formatter is a reflex that happens later in
a run than the reading does. Prose is where a lane learns the convention; the
check is what goes red on the branch that forgot it.

**An `.editorconfig`.** Rejected: it configures editors, and the thing that
caused this was a command on a terminal. It would answer the question for a
person and not for the only kind of author this repository has.

**A check on quoting and wrapping as well.** Rejected for now, and worth
stating so it is not re-derived: quoting cannot be read off a source without
deciding what a quote inside JSX text is, and the wrap is about 100 rather than
100 — `src/theme/library.ts` carries CSS comments wider than any rule would
allow. A check that has to be argued with on a third of its hits is a check a
lane learns to work around. One property, held exactly, with no exemption list
anybody has to maintain.
