# Routines

Loom is built by scheduled sessions. Each runs on its own schedule, as a fresh
session with no memory of the last one: **the repository and the open pull
requests are the only continuity.** This document is what binds them.

> **Provenance, and its limits.** Every routine brief names this file as
> *read first, every run*, and it did not exist — filed as an open finding by the
> portal routine on 15 August 2026 and written the same day by the framework
> routine, which is the finding's owner.
>
> It is a **transcription, not an invention**. Everything below is stated in a
> routine brief: the framework brief in full, and the portal brief as that
> routine reported it on #72. Nothing has been added that a brief does not say.
> Where a brief and this file disagree, **the brief wins and this file is
> wrong** — say so in a report rather than following it.
>
> `docs/rollout.md` was the other missing document. It **now exists**, added by
> the maintainer on 16 August: it had been written a day earlier and pushed to a
> branch whose pull request had already merged, so it never reached `main`. The
> finding is closed. The portal routine's reasoning for why it could not fix that
> itself was right and is worth keeping — a routine cannot write the governance it
> is bound by, or the plan it is meant to find its position in.

## Token discipline

**This is the maintainer's top priority and it outranks thoroughness.**

**Never schedule a follow-up or a self-check-in. Run, report, exit.**

On **9 August 2026**, four self-armed `send_later` chains polled the open pull
requests roughly hourly and re-armed themselves each time. That is about **96
cloud sessions a day** against the routines' three. One pull request was checked
**sixty-nine consecutive times over 72 hours** with nothing changing between
checks. It consumed a week's allowance while the maintainer was away from the
project.

So:

- **Do not poll for review.** A pull request waiting costs nothing. A poller
  waiting costs everything.
- **No chains.** If a check genuinely must be scheduled, it is **one shot with a
  hard give-up** — never something that re-arms itself.
- **No self-check-ins**, on any cadence, for any reason.

The test to apply: *the maintainer must be able to step away for days without
the bill moving.* A run that ends with something scheduled fails it.

## Reading the merge gate

**Never let anything run after the gate on the same line.** Not `| tail`, not
`| tee`, not `| grep`, not a trailing `echo`. What a harness, a shell or a CI
step reports for a compound line is the **last command's** status, and the last
command is almost never the gate. So:

```bash
pnpm verify > verify.log 2>&1; echo "EXIT=$?" > verify.exit
```

and then read `verify.exit` in a separate command. Writing the status to a file
has to be the *last thing the line does*.

This is the second spelling of one mistake and the reason the rule now names the
act. `Loom primitives` filed the first on 12 September, after
`pnpm verify 2>&1 | tail -35` cost that run fifteen minutes: the exit code of a
pipe is the last stage's, which is `tail`'s, which is 0, so a failed verify reads
as a passed one — and the `ELIFECYCLE` lines are easy to read past when you are
looking for a test count. The rule written down then said *never pipe a gate into
`tail`*, and on 25 September the same lane read it, followed its remedy, and hit
it anyway with:

```bash
(pnpm verify > verify.log 2>&1; echo "EXIT=$?" | tee verify.exit)
```

`$?` was correct and the file said `EXIT=1`. **The session's own notification
said exit code 0**, because the status of that compound command is `tee`'s. The
remedy had been followed and the failure mode had moved one pipe to the right.
It cost nothing, because the file was read as well as the notification and the
two disagreed; what it would have cost is a pull request opened on red with a
report saying green, which is the one thing this section exists to prevent.

*A rule naming one spelling of an act is a rule that stops working the moment
somebody reaches for the other one* — the sentence is the 24 September
author-flag entry's, and this is its third instance. Written here rather than in
any lane's code because it is a thing a **run** does, not a thing the repository
contains.

## Lanes

Each routine owns one part of the repository and does not edit another's.

| Routine | Owns |
| --- | --- |
| Framework (`Loom daily build`) | `src/` **except `src/primitives/` and `src/signals/`**, and the application shell |
| Signals (`Loom signals`) | `src/signals/`, the reader-signal intake under `apps/loom/app/`, and `docs/signals.md` |
| Primitives (`Loom primitives`) | `src/primitives/` — breadth and quality of the library |
| Portal (`Loom portal`) | `apps/loom/app/(portal)/` |
| Documentation (`Loom docs`) | `apps/loom/app/(docs)/` |
| Marketing (`Loom marketing`) | `apps/loom/app/(marketing)/` |
| Lessons (`Loom lessons`) | `apps/loom/app/(lessons)/` and `lessons/` |
| Demo (`Loom demo`) | `apps/loom/app/(demo)/` |
| Merge (`Loom merge`) | No directory. Merge commits on open pull requests, and landing them on `main` |

`Loom primitives` was split out of the framework routine on 16 August, once
[0052](../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)
settled how a Hermes block becomes nodes. The two routines share a directory
boundary and nothing else, so the framework routine must **stop adding
primitives** rather than race for the same files.

The four surfaces became **one application** on 18 August
([0067](../decisions/0067-the-four-surfaces-are-one-application.md)), so a lane
is now a **route group** rather than a directory. The property that matters is
unchanged: a PR touches one surface and is reviewable on its own.

Two rules follow from sharing an application, and they are what keep it safe:

- **No surface may grow its own component library.** Marketing, docs and
  lessons compose registered Loom primitives; a missing primitive is a finding
  for `Loom primitives`, never a local component. The portal is the stated
  exception (0067) because it is a tool rather than content.
- **`pnpm verify` green is the merge gate for everyone**, because one broken
  build now blocks four surfaces rather than one.

`apps/loom` exists as of 19 August 2026: `apps/portal`, `apps/docs` and
`apps/marketing` were retired into `(portal)`, `(docs)` and `(marketing)`, and
`(lessons)` has since been filled by its owner. Each lane is that one
directory and everything under it — a surface's components and its non-route code
live inside its own route group, so `app/(docs)/_lib/nav.ts` is the documentation
routine's and nobody else has to be told so.

**Where the framework forces a file to sit at the application root, the lane
follows the content and not the location.** The MDX pipeline is the case that
established this: `apps/loom/next.config.ts` and `apps/loom/mdx-components.tsx`
must be at the root because Next requires them there, and everything they say is
about how a `(docs)` page is parsed and rendered. They belong to `Loom docs`,
along with the dependency lines in `apps/loom/package.json` that only `(docs)`
imports. Three consecutive documentation runs produced a diff crossing the lane
boundary at those files and explained it each time; this is that explanation,
written down once. Added by the framework routine on 25 August at the
maintainer's instruction on #154, after the documentation routine filed it three
times.

The rule generalises and the exception does not: a file is another lane's
because of what it *decides*, not where the framework makes it live. It does not
license editing a surface's routes or components from outside its lane, and a
cross-lane diff of this kind still gets a line in the report saying which file
and why.

`Loom demo` was split out of the framework routine on 20 August. The demo had
been built by the routine that owns the runtime, which judged it done because by
its own standard it was — the pipeline runs, the record is complete, the tests
pass. The maintainer's verdict was that it was clunky and did not make sense.
A demo is judged by whether it lands, not by whether it is correct, and those are
different objectives that pull in different directions.

Its first task is moving the demo off `/portal/demo`, where public code sat at
the one path that reads as private, onto a public `/demo` of its own.

Work that belongs to another lane is **filed in `FINDINGS.md` for its owner**,
not done.

## Merging

**`Loom merge` is the only routine that merges to `main`.** The maintainer created
it on 13 September 2026 after a morning spent landing four pull requests by hand,
each conflicting with the one merged before it. It runs once a day at 15:00 UTC
(08:00 Pacific in summer, 07:00 in winter), after most lanes have opened their
pull requests for the day.

For each open pull request, oldest first, it merges `main` into the branch,
regenerates the decisions index and the API reference, resolves the conflicts
that decide nothing, and merges only on a green `pnpm verify`. What that means for
every other lane:

- **Your branch gets merge commits you did not write.** It merges `main` in and
  pushes; it never rebases or force-pushes. Fetch before you push to a branch
  you left open.
- **It may make small edits outside your lane** when an earlier merge made your
  branch's tests go stale — a lesson transcript, a count, a docs table listing a
  union — by running the code and recording what it prints. It says which file
  and why in a comment on your pull request.
- **It renumbers a decision record that clashes with one already on `main`**,
  with a dated note under the record's header. What the record decides is never
  changed.
- **Anything that is not mechanical it does not merge.** Two implementations of
  one feature, two records settling one question, a conflict in security-relevant
  code, a red verify it cannot explain: it leaves the branch as it was and
  comments `## Not merged — needs your decision` for the maintainer.
- **It skips** drafts, pull requests labelled `hold`, `do-not-merge` or `wip`,
  anything with `ARCHITECTURAL — needs review` or a `Proposed` record, anything
  the maintainer has asked to hold, and changes to egress, deployment or
  credentials without the maintainer's approval on the pull request.

It never closes a pull request, deletes a branch, or schedules anything.

## Read first, every run

- **`FINDINGS.md`** — before choosing work. It is the channel between routines:
  what one could not do, for the one that can. Open findings owned by you are an
  input queue, ahead of the plan and behind maintainer review comments. Close one
  by editing its Status and naming the pull request.
- **`docs/routines.md`** — this file.
- **`README.md`**, the build-order sections for your lane — the plan, the quality
  bar, and what is still open.
- **`decisions/README.md`** — skim the index. It is the fastest way to learn which
  constraints are deliberate.
- **The most recent report in `reports/`.**

## Procedure

1. Read the above. List the open pull requests and read the comments on any of
   them.
2. **Maintainer comments outrank everything**, including the plan and the
   findings queue. Address them first and say how in the report.
3. **Check whether you already have an open pull request.** If you do, **push
   onto that branch** rather than opening a second one — two open branches from
   one lane touching one file is a conflict the lane created for itself, and the
   cost lands on the maintainer at merge time rather than on the run. If you do
   not, **branch off `main`. Never stack** on another lane's branch — a stack
   once cost four days of visibility. **Never merge to `main` yourself** — that is
   `Loom merge`'s job, and only its (see *Merging* below).
4. Build **one coherent unit**, with tests.
5. `pnpm install && pnpm verify`. **Never open a pull request on red**; say so
   rather than weakening a test to get green.
6. Record decisions, regenerate the index with `pnpm decisions:index`. Close or
   file findings in `FINDINGS.md`.
7. Report to `reports/YYYY-MM-DD-<slug>.md`, with a visual alongside. **Never
   overwrite an existing report.** Cover, in plain language: what was completed,
   the section, decisions taken that were not specified and why, records added or
   superseded, findings filed or closed, open questions, and **real test numbers**
   — saying plainly if anything failed or was skipped.
8. Open the pull request against `main`, described clearly.
9. Comment on it starting `@jonathanbravecredit`: a short summary, then
   `## Needs your input` with a recommendation for each question, or an explicit
   "nothing blocking". Keep it short — detail belongs in the report.

From the first rendered primitive onward, **include the deployed preview URL**,
and a screenshot once there is a page worth looking at.

### Taking the screenshot

One harness, two entry points, added 6–8 September after five lanes had written
nine private versions of it and filed the recipe four times. Which one you want
depends on what you are looking at, and nothing else differs — the browser, the
viewports, the reduced motion, the overflow measurement and the file naming are
shared ([0117](../decisions/0117-one-harness-two-subjects-a-tree-it-renders-and-an-address-you-serve.md)).

`playwright-core` is deliberately **not** a dependency of this repository, so
install it once per session into a scratch directory and point the harness at it:

```bash
mkdir -p /tmp/shot && (cd /tmp/shot && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install playwright-core)
```

**A tree** — a composition of primitives, with no server anywhere:

```bash
LOOM_PLAYWRIGHT=/tmp/shot/node_modules pnpm specimen <module>.specimen.ts --out reports
```

`tools/specimen/README.md` has the shape of a specimen module. It is rendered
through the render seam, served over `http://127.0.0.1` on an ephemeral port,
and photographed under every theme it declares.

**An address** — a page something else is already serving, which is the only way
to photograph a screen needing a session, a database or a build behind it:

```bash
LOOM_PLAYWRIGHT=/tmp/shot/node_modules pnpm shoot <shot-list.json>
```

```json
{
  "baseUrl": "http://localhost:3000",
  "outDir": "reports",
  "shots": [
    { "path": "/the-record", "out": "2026-09-08-the-record-wide", "viewport": "wide", "waitFor": "h1" },
    { "path": "/the-record", "out": "2026-09-08-the-record-phone", "viewport": "phone" }
  ]
}
```

`viewport` is `wide` (1280×900), `phone` (390×844) — both at 2× — or an explicit
`{ width, height }`. `waitFor` is a selector; `fullPage` is optional. What the
harness already handles, so nothing has to rediscover it: the browser the image
ships is found rather than downloaded (**never run `playwright install`** — its
host is not reachable from the sandbox), Chromium is launched with both flags it
needs here, every shot is taken with reduced motion because a page that reveals
on scroll is otherwise photographed blank below the fold, and every shot prints
`scrollWidth` against `innerWidth` so a page wider than the phone says so
instead of being eyeballed.

One rule worth keeping in mind while writing a list: **wait on a selector, not
on the network.** A form driven by `useActionState` submits by fetch, so the
page is idle *before* the cookie it sets exists — one run photographed a sign-in
page believing it was the screen behind it.

#### `--serve`, and the server that outlived its build

`pnpm shoot` will start the application for you, photograph it and stop it
again ([0191](../decisions/0191-the-harness-may-start-the-application-because-there-is-now-only-one.md),
which takes over that one sentence of 0117):

```bash
LOOM_PLAYWRIGHT=/tmp/shot/node_modules pnpm shoot <shot-list.json> --serve apps/loom
```

The list's `baseUrl` is replaced by the origin it starts on, an ephemeral port
so it runs beside your own `next dev`, and it prints the build's own newest
write beside it — `built 2026-09-25T21:32:14.027Z` — which is the line to quote
in a report. **It does not build.** A build with no `.next` is refused with the
command that makes one.

**Use it, and this is why.** `next start` loads a route's compiled module the
first time it is asked for that route and keeps it, so a server left running
across a rebuild serves a mixture afterwards — stale for every route it had
already answered, fresh for every route it had not — while `next build` exits 0
and the source on disk is right. Nothing in a response says which. It cost the
documentation lane a screenshot cycle on 24 September and was filed as a killed
build; it is not, and a killed build rebuilds correctly. A server this harness
started cannot be in that state.

Without the flag nothing changes: a `baseUrl` and a server you are running is
still how you photograph a preview deployment, or a screen whose environment
this harness cannot produce.

#### Reaching the state, and the screen behind a session

A shot may do things before the shutter, and a shot may be *preceded* by an
address it never photographs
([0182](../decisions/0182-a-shot-may-reach-a-state-it-does-not-photograph-and-may-name-the-document-it-reaches-into.md),
extending [0159](../decisions/0159-an-instrument-may-reach-a-state-and-may-never-assert-one.md)).
That is the whole of how a signed-in screen gets photographed — there is no
`signIn` step and there is not going to be one:

```json
{
  "path": "/portal/readers",
  "out": "2026-09-22-readers-wide",
  "waitFor": "[data-readers]",
  "before": {
    "path": "/portal/sign-in",
    "waitFor": "#email",
    "do": [
      { "fill": "#email", "text": "reviewer@example.com" },
      { "fill": "#password", "text": "…" },
      { "click": "button[type=submit]" },
      { "waitFor": "[data-signed-in]" }
    ]
  }
}
```

| in a `do` list | what it does |
| --- | --- |
| `{ "click": "<selector>" }` | press it. The selector must match **one** element |
| `{ "fill": "<selector>", "text": "…" }` | type into it. `""` clears it |
| `{ "waitFor": "<selector>" }` | wait for it to appear. The **first** match; several is fine |
| `{ "wait": <ms> }` | let it settle. 30 seconds is the ceiling and there is no way past it |
| `{ "scrollTo": "<selector>" }` | bring it into view without pressing it. **One** element, like `click` |

`before` is one approach — a `path`, an optional `waitFor`, an optional `frame`,
and a `do` list — made in the shot's own browser context before its own address
is opened. Every shot gets a fresh context, so a shot list of eight signed-in
screens signs in eight times and each of the eight can be re-run on its own.

**The trailing `{ "waitFor": … }` in that example is load-bearing**, and it is
the rule above applied to a sequence rather than to a load. Without it the
press resolves, the shot navigates, and the cookie is set a moment later against
a page nobody is looking at — the picture that comes back is byte-identical to
the one you get without signing in at all. That was photographed on the run that
built this, both ways, and the two files have the same `md5`.

**`frame`** names the document an approach's selectors resolve against —
`waitFor`, every step, and `clip`:

```json
{ "path": "/", "out": "…", "frame": "iframe#demo", "waitFor": "[data-stage]",
  "do": [{ "click": "[data-yes]" }] }
```

A selector engine pierces an open shadow root and does not pierce a browsing
context, so without it a page that *contains* the surface — the front door
frames `/demo` — can be photographed and not touched. It does not apply to
`fullPage` or to the viewport shot: a frame is not a page. One thing to know:
navigation is pinned in the **top** document only, so a link pressed inside a
frame still navigates that frame, and a `waitFor` step is how the shot
re-synchronises.

**`start`** says what the browser already holds when the first document loads —
the shot's own and its `before`'s alike
([0195](../decisions/0195-a-shot-may-say-what-the-browser-started-with-and-it-says-it-as-data.md)):

```json
{ "path": "/lessons/3", "out": "…", "start": { "storage": { "loom.lessons.progress.v1": "{{{" } } }
{ "path": "/lessons/3", "out": "…", "start": { "storageBlocked": true } }
```

Two members and no third. A `do` list runs after the page has read what it reads
and decided what to say, so a screen whose whole subject is the state the browser
arrived with — a record that will not parse, one carried from another machine,
storage the reader has blocked — is unreachable by any step. `storage` writes the
keys before the first paint; `storageBlocked` makes `window.localStorage` throw a
`SecurityError` on access, which is the one of the three no map of keys can reach.
They are opposite instructions, so asking for both is refused rather than
resolved. It is on the shot and never on a `before`: the state belongs to the
context, and the context is what a shot gets one of.

**What a shot list still cannot do**, so nobody spends a run finding out: run a
script of its own, hover, scroll *by* a number of pixels, or read anything back
out of the page. The first is refused (0159, 0182, 0195) — `start` is the closed
set of named states that exists instead of it, and there will not be an
`initScript`. Hovering is simply not asked for yet and would be a finding rather
than an argument. Scrolling by a distance was asked for and declined: scroll to
the element you mean. The last is the line itself.

### The three files every lane writes to

Almost every branch in this repository touches the same three, and almost every
merge conflicts in them. None of the three is a disagreement about anything, and
none is a reason to close a pull request.

| File | What it is | How a conflict is resolved |
| --- | --- | --- |
| `FINDINGS.md` | an append-only channel | **take both sides.** Two lanes appending entries are not in conflict; git only thinks so because they appended in the same place |
| `decisions/README.md` | **generated** by `pnpm decisions:index` | take either side, then **regenerate**. Never hand-merge a table git built |
| `apps/loom/app/(docs)/_lib/api/reference.generated.json` | **generated** from `dist/` | take either side, then `pnpm build && pnpm --filter @loom/app docs:api`, **in that order** — the generator reads declaration files, not source |

The last of those is also the answer to a red build that no source change
explains: **a new export in `src/` leaves the API reference stale**, and stale is
a failing test. Regenerate it in the same commit as the export.

The one case that is a real conflict is two branches rewriting the same logic in
the same file. That is what closed sixteen pull requests on 28 August, and step 3
above is how a lane stops producing it.

## Standards

TypeScript, strict, no `any`. Functional — pure functions, immutability, no
classes without genuine stateful identity. SOLID at the seams. No dead code, no
commented-out blocks, no unresolved TODOs. Every unit ships with tests.

**The repository is formatted by hand, and no formatter is to be run over it.**
There is no `.prettierrc`, no `prettier` in either `package.json`, and no
`format` script. The house style is unmistakable from any file — no semicolons,
double quotes, `trailingComma: es5`, roughly a hundred columns — and nothing
enforces it. So `npx prettier --write` on the files a run just edited, which is
an ordinary reflex, gets prettier's defaults: a semicolon on every statement in
every file it touched, and several hundred lines of diff that have nothing to do
with the change. `--no-semi --print-width 100 --trailing-comma es5` does not
reproduce the existing formatting either, so there is no options string that
would. Filed by `Loom marketing` on 23 September after it cost that run a full
revert and a re-application of eight files' worth of edits.

## Decision records

Write one when a decision would be expensive to reverse, or when it defines what
Loom is. Format and the rules for superseding are in
[`decisions/README.md`](../decisions/README.md). **Never edit a record to change
direction** — mark it `Superseded by NNNN` and write a new one.

## Escalation

Anything that touches the tree schema or the delta model in a way that would
require migrating built code, or that contradicts an `Accepted` record, is
**ARCHITECTURAL — needs review**. Write the record as `Proposed`, do not
supersede anything, build what does not depend on it, and say in the report what
was left out.

## Network access

`.claude/settings.json` is committed and carries the network policy every run
inherits. **Do not delete it as stray configuration.** Added by the maintainer
on 19 August 2026 after repeated egress failures reaching third-party sites.

Two separate mechanisms gate the network, and a domain usually needs both:

- **`sandbox.network.allowedDomains`** governs *Bash* — `git`, `gh`, `pnpm`.
  Nothing is allowed by default.
- **`permissions.allow` with `WebFetch(domain:…)`** governs the *WebFetch tool*,
  which is in-process and does **not** consult the sandbox allowlist. A headless
  run has nobody to approve a prompt, so an unlisted domain simply fails.

Currently allowed: `21st.dev` and `nextjs.org` (the visual and structural
references the primitives, marketing and docs briefs tell you to consult),
GitHub, and the npm registry.

**Needing a domain that is not listed is a finding, not a fix.** File it in
`FINDINGS.md` and say what you were trying to reach. Widening egress is the
security-relevant half of the sandbox — it is what stops a compromised command
sending `ANTHROPIC_API_KEY` or the database credentials somewhere — so the list
stays narrow and deliberate.

## Commit identity

> **Superseded, 18 September 2026.** This section and *Commit identity, and the
> preview that goes missing*, at the end of this file, give opposite
> instructions about the same thing. **The later one is current: do not set a
> commit author.** This section is kept rather than deleted because the symptom
> it describes is real and both identities do deploy — but a run that follows it
> by reaching for the address in its opening note gets `jpizzo`, which does not,
> and that is the trap the later section was written to close. Filed by
> `Loom portal` on 16 September; dated here by the framework routine rather than
> deleted, because what a section got wrong is worth reading once.

**Author every commit as
`jonathanbravecredit <60827135+jonathanbravecredit@users.noreply.github.com>`**,
which is the identity every commit on `main` carries:

```bash
git config user.name "jonathanbravecredit"
git config user.email "60827135+jonathanbravecredit@users.noreply.github.com"
```

This is an environment rule rather than a preference, which is why it sits beside
the network policy. Every session opens with a note giving the maintainer's email
address for *identifying the user*, and a run that reaches for it authors a commit
as an account the Vercel project's team does not know — so the deployment comes
back **Blocked**, there is no preview URL, and nothing else fails: the commit is
fine, the push succeeds and the tests are green. Seven runs hit it before it was
written down, several reporting *"no preview URL"* without connecting it to the
author line.

## Credentials

`ANTHROPIC_API_KEY` is in the environment. Read it from `process.env`. **Never
commit it, and never echo it into logs, a report or a pull request body.** Unit
tests use fixtures and pass with no key; live tests skip cleanly without one. Do
not hardcode a model id from memory.

## Commit identity, and the preview that goes missing

**Do not set a commit author.** Use whatever the session is already configured
with — on every run so far that is `Claude <noreply@anthropic.com>`, and every
pull request authored that way has had a Vercel preview.

The trap this closes has now been recorded seven times, and nothing about it
fails: the commit is fine, the push succeeds, the tests are green, and the only
symptom is a pull request with **no preview URL**. Several runs reported that as
*"the preview came back Blocked"* without connecting it to the author line.

The cause is that every routine session opens with a note giving the maintainer's
email address for *identifying the user*, and nothing anywhere says what a
commit's author line must be. A run that decides to set one reaches for the
address it was given, and Vercel refuses it:

> `@jpizzo` must be a member of the **jpizzolato36-6341's projects** team on
> Vercel to deploy.

`jpizzolato36@gmail.com` resolves to the GitHub account `jpizzo`, which is not on
the Vercel team. Two identities are known to deploy — the session default above,
and `jonathanbravecredit <60827135+jonathanbravecredit@users.noreply.github.com>`,
which is what `main` carries. If a push produces no preview, check
`git log --format='%an <%ae>'` before looking anywhere else.

Written by the framework routine on 9 September at the request of the finding
`Loom docs` filed on 4 September, which asked for exactly this: one sentence,
beside the network policy, where the other environment-shaped rule already lives.
