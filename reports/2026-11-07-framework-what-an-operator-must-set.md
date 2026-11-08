# What an operator must set is read off the application, and six settings were documented nowhere

**Date:** 2026-11-07 (evening) · **Lane:** `Loom daily build` (`src/` except
`src/primitives/` and `src/signals/`, and the application shell) ·
**Section:** §1 (process), §5 (deployment) ·
**Branch:** `framework-88-what-an-operator-must-set`

![Eighteen settings, three places they are stated, and the six that reached none of them: the application's twenty-four environment reads on the left, the guide, the example and the table in the middle, the gate on the right, and under them the six settings that were documented nowhere an operator reads](2026-11-07-framework-what-an-operator-must-set.svg)

## What was done

**`docs/deployment.md` is now checked against the application it is about.** A
variable the code reads and the guide does not name fails `pnpm verify` on the
branch that adds it, naming the variable and the source that reads it:

```
AssertionError: expected [ Array(1) ] to deeply equal []

- []
+ [
+   "LOOM_NEW_THING, read by apps/loom/app/_lib/app/database.ts",
+ ]
```

That is the real message, produced by planting one read in
`apps/loom/app/_lib/app/database.ts` on this branch.

**Six settings were documented nowhere an operator reads**, measured on `main`
at `b0db23c`, and all six are now in the guide, in `apps/loom/.env.example` and
in the table:

| setting | what it decides |
| --- | --- |
| `LOOM_SIGNAL_REGION` | whether this deployment counts which country a reader is in — **on by default** |
| `LOOM_SIGNAL_REGION_HEADER` | where that country is read from, and why it has to be configurable |
| `LOOM_SIGNAL_REGION_FLOOR` | the smallest bucket a region count will name; raise-only |
| `LOOM_SIGNAL_KEPT_MS` | how long a counted delivery is kept — the window a reader is promised |
| `LOOM_SIGNAL_SWEEP_MS` | how often the sweep runs, which nothing in the application can discover |
| `POSTGRES_URL` | read when `DATABASE_URL` is unset, so a database could be found without the guide explaining how |

**Three of the six are about what a deployment counts and keeps about its
readers**, which is why this was the unit rather than a tidy-up. A deployment
counts page views per country unless somebody switches it off, and the guide
did not say so.

**The guide's own sentence was wrong about its own table.** It read *"Eleven
variables, **one** of which is required"* over a table with **ten rows** — true
of `apps/loom/.env.example` at eleven offers, one row short of the file it
claims to summarise. The table is now eighteen rows and the count is checked
against them.

**The sample response an operator curls is complete again.** `GET
/api/reader-signals` answers ten fields; the sample printed seven. It had been
three short for a fortnight and four short for a week, which is the sort of
staleness that matters because an operator reading it is counting fields against
what their own deployment answered.

### The five claims, and why there is no list anybody maintains

`tools/sources/deployment.ts` reads the variables off the sources, the offers off
`.env.example`, and the rows off the guide's own table. Nothing here is a
transcription of anything.

| claim | what breaking it looks like |
| --- | --- |
| the guide **names** every variable the code reads | a setting added with no line in the guide |
| `.env.example` **offers** every one, or this module says why nobody sets it | a setting documented in prose and not where it is typed |
| the example offers **nothing the code has stopped reading**, and nor does the excused list | a retired variable still being offered |
| the table has **a row per offer and no others**, and its count word matches | the eleven-against-ten this branch found |
| the §8 sample prints **every field of `IntakeStatus`** | the four-fields-behind of 28 October |

The one hand-written list is `NOT_SET_BY_AN_OPERATOR`: six names with a reason
each — three platform reads, two second names for a variable already offered,
and `LOOM_PUBLISH_KEY`, which is shown once and used once on the line that runs
`pages:publish`. **The reason beside each name is the point of the list**: a run
adding a variable either puts it where an operator reads, or writes down why
nobody sets it.

### How a variable is recognised

Two spellings, because the application uses both — the name written at the read,
and the name exported as a constant used as a subscript (`env[INTAKE_KEY]`, how
the reader-signal settings are read). Both come from the **scanned code**
(`tools/sources/code.ts`), never the raw file, and that is load-bearing twice
over:

- `settings.ts` explains every one of its settings in prose that quotes the
  variable, so a check reading the file would report the one module that already
  documents them. That is the docblock hazard `code.ts` exists for.
- the portal's *Credentials* screen prints `process.env.LOOM_INGEST_KEY` inside
  a template literal, as a snippet for a customer to paste into **their own**
  application. Reading the raw text would have made that this deployment's
  setting and put a wrong row in the guide — which is the one direction this
  check must not fail in.

**A file that never names `process.env` reads nothing**, and that gate is what
keeps a name-shaped string literal from being taken for a variable: a
documentation page printing the names of exported constants
(`DEFAULT_ENDPOINT_CEILING_MS` and two more) matched the shape until the gate
was added. The limit it buys is stated and has a test: a module that exports a
key but reads no environment itself is invisible here. Every key in this
application is declared in the file that reads it. Same limit, same reason, as
the git sweep's argvs written as literals.

## Decisions taken that were not specified, and why

- **The check reads the prose rather than generating it.** A registry in
  TypeScript carrying every setting's default and description, rendered into the
  guide, is properly single-sourced and was rejected: the commentary in
  `.env.example` is the part somebody reads while filling the file in, and a
  generator turns it into output nobody edits by hand. The guide is prose with
  sections, warnings and a table written for a person working through a
  deployment. Every word of both stays a person's.
- **`docs/deployment.md` and `.env.example` are both checked**, not just the
  example. Nobody copying variables into a Vercel dashboard opens
  `.env.example`; the guide is the file a deployment is set up from. An operator
  uses whichever one they found.
- **`LOOM_PUBLISH_KEY` is excused rather than offered**, and `LOOM_TELEMETRY_MAX_AGE_MS`
  is offered rather than excused. Both are read by a script. The difference is
  that a retention age is a deployment-wide decision somebody makes once, and a
  publish key is shown once and used once on the command line that spends it.
- **Counts in the guide's prose stay words and are checked as words.**
  `countWord` stops at twenty, which is a ceiling rather than a limitation: a
  table of settings past twenty wants splitting, and a count it cannot say is
  reported rather than passed.
- **`windowMs` keeps its name** — the 26 October finding's second outcome. The
  guide now prints the whole answer, so `collection` and its sentence sit three
  lines under `windowMs`, and a paragraph beside the sample says which window
  each one is. The rename is now safe to take at any time, which is the part
  that changed; see *Findings*.
- **The field names of `IntakeStatus` are read off its source, not off a value.**
  Calling `describeIntake` is the honest version and needs a whole `Intake` —
  journal, store, gate, clock — fixtured in another lane's shape to assert ten
  key names. The two-space indent is what makes reading the source safe: a doc
  comment's lines inside the alias begin with an asterisk and a nested object's
  fields are indented further, and both have a test.
- **No paragraph is checked for being right**, only for existing. A row that
  names a variable and describes it wrongly is still a prose mistake nothing
  catches. The claim held is the one that was being broken.

## Records

- **Added: 0367**, `Accepted`. Why that number: it was written as `0364` —
  `0363` was the highest on `main` at `b0db23c`, `0353` was claimed by the open
  #778 and `0361` by the open #802, and `0364` was free on all three. `0364` was
  also claimed by the unmerged #806, which landed first, so `Loom merge`
  renumbered this record to **0367** on 8 November. `pnpm decisions:index` run;
  the index has no hole it did not already have.
- **Superseded: none.** Nothing here touches the tree schema, the delta model or
  an `Accepted` clause. Nothing is `ARCHITECTURAL`.

**One thing seen and not acted on.** #802 carries a record numbered `0361`,
which **is already on `main`** as this lane's own from #798, merged earlier
today. That is the ninth occurrence of a clash and `Loom merge`'s to renumber;
this branch is clear of it either way. Not appended to this lane's open entry on
clashing numbers, because this morning's run already appended today's data point
to it and a second entry for the same day would be noise.

## Findings

**Three closed, all three filed by `Loom signals` against this lane, all three
the same shape.**

1. **13 October** — *a deployment can state how long its rollup window is and
   has nowhere at all to state how often it folds.* The setting it asked for
   arrived from its own lane fifteen days later under another name:
   `LOOM_SIGNAL_SWEEP_MS` (0320) is exactly the shape the entry described. What
   was still missing was the half this lane owns, and that is now a paragraph in
   §9 beside the cron an operator is told to set up.
2. **26 October (evening)** — *the intake status reports two different windows
   and has one word for one of them.* Answered with the second of the two
   outcomes the entry offers: the field keeps its name, and the reason that was
   the worse state is gone.
3. **28 October** — *a new environment variable is documented in its own doc
   comment and nowhere an operator reads, and the status sample is four fields
   behind.* Both halves taken as the entry spells them, and the three long
   sentences printed in full rather than elided, because the sentences are what
   those fields are for.

**One filed, for `Loom signals`:** the status reports two of a deployment's
three reader windows and leaves out `kept` — the one a reader is actually
promised. `describeKeptWindow` exists, is exported, and its `unusable` sentence
is already written; `IntakeStatus` has no field carrying it. So an operator who
typed `LOOM_SIGNAL_KEPT_MS=30` meaning thirty days has a deployment that deletes
nothing while telling its readers thirty days, and nowhere to see that. 0351 is
five days old and the status predates it, so it reads as a field that was not
added rather than one declined. Found by this branch's own assertion rather than
by reading.

### Standing entries met again and not duplicated

- **Never let anything run after the gate on the same line** (`docs/routines.md`).
  Followed: the status was written to a file as the last thing on its line and
  read in a separate command. The number below is from the file.
- **The commit author line** (23 October). `git config user.email` checked
  before the first commit: `noreply@anthropic.com`.
- **Mutation testing before the first commit** (27 October). Followed — the unit
  was committed as `5129dc0` before the first mutation, and the one mutation that
  caused a test change was committed before the next ran.
- **`pnpm reports:shrink` reads the git index** (30 October, this lane's own).
  Not reached: this report's visual is an SVG, so there was nothing to shrink.
- **The composed preview URL** (16 October) and **`*.vercel.app` is denied by the
  environment's egress policy** (12 October). The URL below is taken from the
  `vercel[bot]` comment, and nothing here was fetched from it.
- **The harness subscribes a routine's session to its own pull request**
  (24 October, and 3 November). **This session is not subscribed to any pull
  request and no check-in is armed.**

## Numbers

`pnpm install && pnpm verify` — **`EXIT=0`**, read out of a file written as the
last thing on its line and read in a separate command. The harness's completion
notice is not what this is read from. Run twice: once on the code, and again on
the branch head after the record, the findings and this report were written, so
the `findings:check` and `reports:check` numbers below are the ones the gate saw
with those files in place.

| | measured | tests |
| --- | --- | --- |
| framework and tools | 273 files | **6,635** |
| application | 434 files | **7,032** |

**13,667 pass in total. Nothing failed, nothing was skipped, and no test was
weakened.**

- **+29 tests**, every one of them in `tools/sources/deployment.test.ts`, which
  is a new file. The framework suite was **6,606** when #798 merged this
  afternoon, so the 6,635 above is that plus these 29 — derived rather than
  separately measured, and said so.
- **No existing assertion changed its claim and none was removed.** The
  application suite is untouched by this branch: `apps/loom/.env.example` and
  `docs/deployment.md` are inputs to the new check and to nothing else.
- `findings:check`: **1,467 findings, 0 malformed**
- `reports:check`: **2,139 visuals, 149.3MB, none over 1.1MB** (413 cited by no
  file, all of them pre-existing — this run's one is cited by this report)
- `prerender:check`: **139 prerendered pages**, 2,099 text junctions, 0 run
  together; 3 metadata conventions, 0 unserved

### Fifteen mutations, fifteen killed

Each applied on its own against the branch's committed code, the file restored
from a copy taken first, the suite re-run between.

| what was put in | what failed |
| --- | --- |
| a row is dropped from the guide's table | 2, including the count |
| the count word is wrong | the count-matches-its-rows case |
| a field is dropped from the status sample | the sample case |
| `windowMs` is renamed on `IntakeStatus` | the sample case |
| a setting is removed from `.env.example` | 2 |
| the example offers a variable nothing reads | 2 |
| the application reads a new variable | 2 |
| the excused list keeps a variable nothing reads | the excuses-nothing-stale case |
| the `process.env` gate is deleted | 3, including the stated limit |
| names are read off the raw source rather than the code | **7** |
| `fieldsOf` accepts any indent | 2, including the nested-object case |
| `settingsTable` reads past its own section | 2 |
| `offered` is not anchored to the start of a line | **survived**, then 1 — see below |
| the status sample is taken as the guide's first JSON fence | the sample case |
| an unparseable fence is reported rather than skipped | the fragment case |

**One survived and the test that now kills it is in `696a0b7`.** `offered`
reads a name from an assignment at the start of a line, and the test for it used
a comment mentioning a bare name — which an unanchored reading would not have
taken either. The mention the anchor actually protects against is written *as an
assignment*: `.env.example`'s own paragraph about the commonest paste error
quotes `DATABASE_URL=postgresql://…`. The test now uses that shape, and a
retired variable named that way in a comment can no longer be counted as an
offer.

**One mutation was discarded rather than counted.** *`namedIn` ignores the
fences and reads prose only* passes, and should: every variable is named in the
guide's prose, so the fences are not where the claim is carried. A mutation that
cannot fail is not a measurement.

## Open questions

**Nothing blocks this branch.** Four carried, none new, none changed by this
run:

1. **A Loom site still cannot link to its own next page** — three records
   `Proposed — ARCHITECTURAL` since 19 and 28 August, eighty-one days. Not
   re-checked tonight; this morning's run checked it on `main` and it was still
   true. The recommendation is unchanged and is 0102's mechanism.
2. **`src/cli/index.ts` opens by claiming the CLI drives a proposal from the
   terminal, which it does not.** `Loom docs` noted it on #778, which has not
   landed, so the finding entry still reaches no reader. It is a one-line
   correction in this lane's file and it stays out of a branch about the
   deployment guide, for the same reason it stayed out of this morning's: a
   branch with one subject is reviewable.
3. **A site can pull a tree its installed Loom cannot parse and look healthy
   from the door** — filed for `Loom portal` this morning with the cheap route
   recommended. Unchanged.
4. **Whether the guide's prose should be checked for more than naming.** This
   branch deliberately does not. Three of the six settings it documented have
   paragraphs describing behaviour that could drift the way the sample did, and
   there is no cheap check for *a paragraph that is wrong*. Recorded as an open
   question rather than attempted.

## The preview

*Taken from the `vercel[bot]` comment after the pull request was opened, not
composed from the branch name.*

https://loom-git-framework-88-what-a-b0b6ff-jpizzolato36-6341s-projects.vercel.app

It read **Building** when that comment was last seen from this session, so that
is Vercel naming the URL rather than this run having watched it go green — and
nothing here was fetched from it either way, because `*.vercel.app` is denied by
this environment's egress policy (the open finding of 12 October).

**There is nothing on it to look at, and that is not a gap.** This branch
changes one repository document, one example file, and a check in `tools/`. It
renders no page and ships no byte to a reader: `docs/deployment.md` is read in
the repository rather than served, so the visual above is the subject drawn
rather than a screenshot withheld.
