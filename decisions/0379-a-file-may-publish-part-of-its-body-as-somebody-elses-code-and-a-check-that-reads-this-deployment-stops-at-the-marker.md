# 0379. A file may publish part of its body as somebody else's code, and a check that reads *this* deployment stops at the marker

**Status:** Accepted
**Date:** 2026-11-10
**Section:** §1 — Process, the merge gate

## Context

[0367](0367-what-an-operator-must-set-is-read-off-the-application-and-the-guide-goes-red-when-it-is-behind.md)
made `docs/deployment.md` a claim this repository checks rather than a file
somebody remembers to edit: `tools/sources/deployment.ts` reads every
environment variable the application's code names and holds
`apps/loom/.env.example` to offering each one. It was written for a drift
measured three times in six weeks — a setting added, its whole argument in a doc
comment beside the read, and the one file an operator actually reads saying
nothing about it.

**It cannot tell a setting this deployment has from one a printed specimen
reads**, and on 10 November that stopped another surface printing the truth.

`app/(marketing)/_lib/wired/page.tsx` is the route the *On your own site* band
prints: the two calls
[0361](0361-the-site-pulls-into-its-own-process-and-a-host-wires-the-live-page-in-two-calls.md)
clause 2 names, and the render under them. It is a **real compiled module**,
because that surface's rule for a code panel is one sentence — a stranger cannot
be shown code that does not compile. The file a reader would actually write, and
the one the published entry point's own example gives, is:

```ts
const live = startPullingLivePages({
  deployment: process.env.LOOM_URL ?? "",
  key: process.env.LOOM_PROJECT_KEY ?? "",
})
```

Written that way the panel turned two of `tools/sources/deployment.test.ts`'
cases red, measured on the marketing branch before the panel was reshaped:

```
- []
+ [ "LOOM_PROJECT_KEY", "LOOM_URL" ]
  ❯ tools/sources/deployment.test.ts:252  (the variables an operator is offered)
```

Both ways out of that were somebody else's file. Offering the two names in
`.env.example` would document two settings this deployment does not have, in the
one file the guide calls the full list — the exact failure the check exists to
catch, caused by satisfying it. Adding them to `NOT_SET_BY_AN_OPERATOR` is the
right category and the table is in `tools/`, which is a marketing branch editing
the framework's tooling. So the panel took the two values from a configuration
module beside it instead, and is one indirection away from the file a reader
would write — on the one panel whose entire value is being exactly that file.

**The near-miss was already recorded in the check's own docblock.** The portal's
*Credentials* screen prints `process.env.LOOM_INGEST_KEY` inside a template
literal, as a snippet for a customer to paste; `codeOnly` blanks a literal's
body, so that one is invisible and the screen is safe. **A specimen is the same
claim one level up.** It is a snippet for a customer, and it is in code rather
than in a literal *on purpose*, because a snippet in a literal is a snippet
nothing typechecks. The module that publishes the text as a literal passed; the
file that makes the text trustworthy failed.

This is not one surface's problem. Every real integration reads its
configuration from somewhere, the honest spelling for a Next application is
`process.env`, and `(docs)` prints its quickstart from a file it compiles and
runs. The next panel to want it is the one a reader needs most.

## Decision

**A source has two parts: the code this deployment runs, and a region it
publishes for somebody else to run. A check that reads what this deployment does
stops at the boundary between them.**

1. **The boundary is a marker on a line of its own**, `// ── shown on the site
   ──`, and everything after it is the published region. The marker is not new:
   three marketing modules already declare it as `SHOWN_MARKER` and extract the
   region under it, and three tests fail if it moves. **The exemption is
   therefore the existing declaration that a file's body is published to
   strangers, not a new opt-out invented to satisfy a check.**

2. **It means something only as a whole line.** The modules that print a region
   find it by writing the marker as a string, so a reading that took it from
   anywhere would cut each of those modules at its own declaration — and stop
   reporting everything they really do read, which is the opposite of the
   check's purpose. Same anchor, for the same reason, as `offered`'s assignment
   at the start of a line.

3. **A region and not a file.** A specimen module is still a module this
   deployment loads, so whatever it reads *above* its marker is still a setting
   somebody has to decide. Only the part a visitor would copy is theirs rather
   than ours. No specimen in this repository reads an environment variable for
   itself today, so the distinction costs nothing now and is the honest shape
   when one does.

4. **The spelling is swept rather than shared.** `tools/` spells the marker
   itself rather than importing it from a route group, because tooling that
   reached into the surface it checks would invert the dependency. `declaredMarkers`
   reads every `SHOWN_MARKER` a source declares — through `codeOnly`, so a
   doc comment quoting the constant is not a declaration of it — and the sweep
   holds every spelling in the repository to the one the check reads, and
   requires at least one. A surface that respells its constant fails on the
   branch that respells it, rather than silently handing its specimens back to
   the sweep.

5. **At most one marker per file**, swept over the repository. Two would make
   the boundary ambiguous: the region would be read from the first and printed
   from whichever the publishing module found. A file wanting two published
   regions wants two files.

6. **The reading over today's tree is unchanged, and that is asserted rather
   than argued.** The four files carrying a marker are the marketing specimens,
   none of them names `process.env`, and the sweep reports the same 24 variables
   before and after this change.

## Consequences

**`Loom marketing` can print the real spelling.** The panel's two values can
come off `process.env` again, which is the file a reader would write and the one
the published entry point documents. That revert is theirs to make and is filed
for them; nothing in this change touches their surface.

**`(docs)` gets the same room.** A documentation page printing a quickstart that
reads its own configuration from the environment no longer has to choose between
compiling the sample and passing the guide's check.

**What the exemption cannot hide, and what it can.** A real setting moved under
a marker and left in `.env.example` fails *offers nothing the application has
stopped reading* on the branch that moves it, so the exemption cannot be used to
quietly drop a documented setting. What it *can* hide is a real setting read only
under a marker and offered nowhere — which is the same drift 0367 exists for,
reachable one more way. That is why the marker is anchored to a line, why its
spelling is swept, and why it is stated here rather than left for somebody to
discover.

**It is a convention other lanes now depend on.** Three surfaces write the
marker; a fourth will. Unpicking it later means editing every specimen and the
tests that extract them, which is what makes this a record rather than a commit.

## Alternatives considered

**A third category in `NOT_SET_BY_AN_OPERATOR`** — one row per name, reason
*printed on the marketing site as a customer's own code*. Two lines today, and
the reason stays a sentence a reviewer reads, which is that table's whole value.
Rejected because the reason is **per name**: every variable a future specimen
prints is another row and another review, and the table would come to mix *the
platform sets this* with *nobody sets this, it is a picture of code*. Those are
different claims and the second is a property of a file, not of a name.

**A list of specimen directories the sweep skips.** One list, and it is exactly
the thing `files.ts` says these sweeps exist not to have: a list somebody
maintains is a list that misses the file nobody remembered. It also exempts code
that happens to sit in a directory rather than code that declares what it is.

**Importing `SHOWN_MARKER` from the marketing module.** One spelling, no sweep.
Rejected because it makes `tools/` depend on a route group it is checking, and
the lane boundary runs the other way — a surface may be deleted or renamed, and
the framework's tooling must not stop checking when it is.

**Skipping the whole file rather than the region.** Simpler, and
indistinguishable on today's tree, because every specimen's body is published in
full. Rejected because it is the wrong claim: a file that publishes a region is
not thereby exempt from being a module this deployment loads, and the day a
specimen reads a setting of its own, the simpler rule stops reporting it with
nothing to say so.

**Reading the published region's variables and reporting them separately** — as
*settings a reader of this site will need*, checked against what the site tells
them to set. A real and better check, and a unit of its own: it needs somewhere
for that claim to live, and no page makes it yet. Nothing here forecloses it.
