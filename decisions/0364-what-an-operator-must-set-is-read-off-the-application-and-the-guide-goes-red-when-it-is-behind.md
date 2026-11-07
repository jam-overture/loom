# 0364. What an operator must set is read off the application, and the guide goes red when it is behind

**Status:** Accepted
**Date:** 2026-11-07
**Section:** §1 (process), §5 (deployment)

> **Why this number.** `0363` was the highest on `main` at `b0db23c`, which this
> branch is cut from. `0353` is claimed by the open #778 and `0361` by the open
> #802 — which clashes with the `0361` already on `main`, and is `Loom merge`'s
> to renumber rather than this branch's. `0364` was free on all three.
>
> **Why `Accepted`.** It adds one check over a file this lane owns and changes no
> behaviour: nothing in `src/`, no route, no dependency, no build step. It is
> recorded because the thing being decided is **where the list of a deployment's
> settings lives**, and three lanes now have to know the answer — a setting added
> without a line in `docs/deployment.md` stops the merge gate for four surfaces.

## Context

Three findings in six weeks, all filed by `Loom signals` against this lane, have
one shape:

| filed | what was behind |
| --- | --- |
| 13 October | no way for a deployment to state how often it folds, so a stall cannot be judged |
| 26 October | the status sample prints `windowMs` and a second window arrived with no name |
| 28 October | `LOOM_SIGNAL_SWEEP_MS` is documented in its own doc comment and nowhere an operator reads; the sample is four fields behind |

Each was filed rather than taken because `docs/deployment.md` and
`apps/loom/.env.example` are this lane's files, and each says in as many words
that the value is the one an operator types rather than the plumbing that reads
it.

**Measured when this record was written: six of the application's eighteen
settings were documented nowhere an operator reads.** Three of the six are about
what the deployment counts and keeps about its readers —
`LOOM_SIGNAL_REGION`, `LOOM_SIGNAL_REGION_HEADER`, `LOOM_SIGNAL_REGION_FLOOR` —
and a seventh, `POSTGRES_URL`, is a database the guide could not explain being
found.

**Nothing failed on any of the three branches and nothing was going to.** There
is no step in `pnpm verify` that reads the guide. So the drift is only ever
found by somebody who already knows the setting exists, which is the one person
who does not need the guide. The guide's own sentence for it —
*"`apps/loom/.env.example` is the full list with the commentary. Eleven
variables"* — was the claim that went quietly false, and when this was written
the table under it had ten rows.

## Decision

**The settings of a deployment are read off the application, and
`docs/deployment.md` is checked against them.** `tools/sources/deployment.ts`
sweeps `apps/loom/app/` and `apps/loom/scripts/` for the environment variables
their code reads, and `tools/sources/deployment.test.ts` holds five claims about
the guide:

1. every variable the application reads is **named somewhere** in the guide;
2. every one is **offered by `apps/loom/.env.example`** — an assignment line
   somebody fills in — or is listed in this module as a read an operator does not
   make, **with a reason**;
3. the example offers **nothing the application has stopped reading**, and the
   excused list excuses nothing it has stopped reading either;
4. the guide's table of variables has **a row per line of the example and no
   others**, and the count its own prose claims is the number of rows it has;
5. the sample response under *Reader signals* prints **every field of
   `IntakeStatus`**, found by the key that identifies it rather than by where in
   the file it sits.

A variable added without a line in the guide fails on the branch that adds it,
naming the variable and the source that reads it. That is 0360's shape applied to
a second convention that lived only in prose.

### Six names are declared as not being settings

`NOT_SET_BY_AN_OPERATOR` is the one hand-written list here, and it is short on
purpose: three platform reads (`NODE_ENV`, `VERCEL_ENV`, `VERCEL_URL`), two
second names for a variable the example already offers (`ANTHROPIC_API_KEY`,
`POSTGRES_URL`), and `LOOM_PUBLISH_KEY`, which is shown once and used once on
the line that runs `pages:publish`. Everything else the application reads is
something somebody has to decide.

**The reason beside each name is the point of the list.** A run adding a
variable must either put it in the file an operator reads or write down why
nobody sets it, and the second is the sentence a reviewer reads.

### How a variable is recognised, and the one thing it cannot see

Two spellings, because the application uses both: the name written at the read,
and the name exported as a constant used as a subscript — `env[INTAKE_KEY]`, how
the reader-signal settings are read. Both are taken from the **scanned code**
rather than the file (`tools/sources/code.ts`), which is what keeps a variable
named in a doc comment out: `settings.ts` explains every one of its settings in
prose that quotes it, and a check reading the raw file would report the one
module that already documents them. It is also what keeps the portal's
*Credentials* snippet out, which prints `process.env.LOOM_INGEST_KEY` for a
customer to paste into **their** application.

**A file that never names `process.env` reads nothing**, and that gate is what
stops a name-shaped string literal being mistaken for a variable — a
documentation page printing the names of exported constants matched the shape
until the gate was added. The limit it buys, stated here and held by a test: a
module that exports a key but reads no environment itself is invisible. Every
key in this application is declared in the file that reads it. The same limit,
for the same reason, as the git sweep's argvs written as literals.

## Consequences

- **A new deployment setting costs a line in two files.** That is the whole bill,
  and it lands on the run that adds the setting rather than on a documentation
  run a fortnight later.
- **A renamed field on `IntakeStatus` fails in `docs/deployment.md`.** The field
  lives in `(portal)`-adjacent code that `Loom signals` owns and the sample lives
  in this lane's guide, so the branch that renames it goes red on a file its lane
  does not own, with a message naming the sample. **That is deliberate and it is
  what the 26 October finding asked for**: it declined to rename `windowMs`
  precisely because the documented copy could not change with it, and the worse
  of the two states was a rename that left the guide stale with nothing failing.
  A one-line edit to the sample on the renaming branch is the cross-lane diff
  `docs/routines.md` asks to explain in a report, not a thing to be blocked on.
- **The guide's table grew from ten rows to eighteen.** A reference table is read
  by somebody counting, so completeness beats brevity here; every row points at
  the section that explains it.
- **Counts in the guide's prose are written as words and now checked as words.**
  `countWord` stops at twenty, which is a ceiling and not a limitation: a table
  of settings past twenty wants splitting rather than spelling, and a count it
  cannot say is reported rather than passed.
- **This does not check what a setting's paragraph says**, only that the variable
  is named. A row that names a variable and describes it wrongly is still a
  prose mistake nothing catches. The claim held is the one that was being broken.

## Alternatives considered

**Write the six missing paragraphs and move on.** The cheapest thing, and it is
what the three findings literally asked for. Rejected because it has already been
done twice: the 26 October entry says the sample *"was already three fields behind
before tonight, and is four now"*, which is a prose fix going stale inside a
fortnight. The fix that holds is the one that fails.

**A registry in TypeScript that names every setting, with its default and its
prose, generated into the guide.** Properly single-sourced, and it was
rejected for two reasons. It moves an operator's documentation into a
module — so the commentary in `.env.example`, which is the part a person reads
while filling the file in, becomes generated output nobody edits by hand. And the
guide is prose with sections, tables and warnings written for a reader working
through a deployment; a generator either reproduces that or flattens it. The
check reads what is written instead, which leaves every word a person's.

**Fail on a variable documented in the guide but not in the example, by reading
the guide for what an operator sets.** That would need the guide's prose to be
machine-readable about which of its names are settings, which is a format
imposed on the one file that should be free to be well written. The declared list
of six exceptions is the same knowledge, held where it costs nothing to read.

**Let `.env.example` be the only source and drop the guide from the check.** The
guide is the file a Vercel deployment is set up from, and nobody copying
variables into a dashboard opens `.env.example`. Both are checked because an
operator uses whichever one they found.

**Assert the status sample by calling `describeIntake`.** The honest version, and
it needs a whole `Intake` — a journal, a store, a gate, a clock — fixtured in
another lane's shape to assert ten key names. `fieldsOf` reads the type's fields
off its source instead, with the two-space indent as the thing that makes it
safe: a doc comment's own lines inside the alias begin with an asterisk, and a
nested object's fields are indented further.
