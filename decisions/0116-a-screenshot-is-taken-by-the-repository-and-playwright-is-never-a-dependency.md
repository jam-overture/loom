# 0116. A screenshot is taken by the repository, and Playwright is never a dependency

**Status:** Accepted
**Date:** 2026-09-08
**Section:** §1 (process)

## Context

Four routine briefs and `docs/routines.md` ask a run for a screenshot. Nothing
in the repository took one.

The consequence is on the record eleven times, filed by three lanes between
2 September and 6 September, and the last of them counts the writings: *"the
screenshot harness, written privately for the ninth time"*. Every one of those
runs wrote about forty lines — render the tree, wrap the markup, find a browser,
launch it, size a viewport, take the picture — and deleted them before opening
its pull request, because a scratch script is not a deliverable and `tools/` was
not that lane's to add to. The next run then wrote them again.

That cost is not the interesting part. The interesting part is that each of
those runs rediscovered the same four obstacles, and two of them cost a lane
most of a run:

1. **`playwright install` cannot reach its CDN here**, and the browsers are
   already on disk at `PLAYWRIGHT_BROWSERS_PATH`. A current `playwright` looks
   for a build number the image does not have and fails with a message telling
   you to run the install that cannot work.
2. **`playwright` re-fetches ~200MB in a postinstall; `playwright-core` does
   not.** Only the second is usable, and neither belongs in a `package.json`
   here.
3. **A specimen carrying an image cannot be opened over `file://`.**
   `mediaUrlSchema` takes `http:` and `https:` only, because a `data:` URL is a
   script host ([0053](0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md)).
   The page has to be served.
4. **A band that reveals on scroll photographs blank** unless the context asks
   for reduced motion, which is what the library's own stylesheet keys its
   "already arrived" rules on. Every full-page screenshot published in this
   repository before this record was taken without it.

Sixteen visual defects have been found in this repository by looking at a screen
rather than at an assertion. The picture is not a nicety; it is the only
instrument that finds this class. What it costs to take is the whole reason it
is not taken more often.

## Decision

**`tools/specimen/` takes the picture, and it belongs to the framework lane.**

A lane declares a **specimen** — a name, a title, a function from a theme
selection to a tree, the themes to wear and the viewports to stand at — and
`pnpm specimen <module>` renders it, serves it, photographs it, and prints the
overflow measurement beside each shot. A specimen is *data*: what to look at is
committed beside the lane that cares, and how to look at it is here.

Four things follow from that, and each answers one of the obstacles above:

- **Playwright is resolved at call time and is never a dependency.** A picture
  is something a run takes, not something the framework ships. `loadChromium`
  resolves `playwright-core` from `LOOM_PLAYWRIGHT` or `NODE_PATH` and returns a
  `Result`; its absence prints the three-line install recipe instead of a stack
  trace. `NODE_PATH` is honoured through `createRequire` deliberately — Node's
  ESM resolver ignores the variable, which is what made four lanes' first
  attempt fail for a reason nothing in the error mentioned.
- **No build number is written down.** `chromiumCandidates` derives the paths
  from what the browsers directory actually holds, preferring the unversioned
  symlink and then the highest build. Three lanes hard-coded `chromium-1194`;
  the number belongs to the image and will change without warning.
- **Pages are served, never opened from disk**, on an ephemeral port, so a
  specimen carrying an avatar or a logo renders at all.
- **Every context asks for reduced motion**, and every shot reports
  `scrollWidth` against `innerWidth`. The overflow measurement is taken *before*
  the picture and never suppresses it: the photograph of the broken page is the
  artefact worth having.

The seam between planning and driving is a narrow structural interface —
`SpecimenBrowser` and `SpecimenPage`, four methods — so the naming, the plan,
the measurement and the reporting are all exercised against a double. That is
what lets a harness whose whole job is to drive a browser ship with tests that
need no browser.

## Consequences

- **A lane that wants a picture writes a specimen, not a script.** The forty
  lines are gone from every future run in every lane.
- **Shot names are now a convention six lanes share**:
  `<specimen>-<theme>-<viewport>.png`, every label slugged. A report that
  quotes a file name means the same thing in every lane.
- **`phone` is 390×844 and `wide` is 1280×900, both at 2×**, which is what the
  reports in this repository have been quoting all along and which nothing
  stated. A specimen may declare its own, and most should not.
- **`pnpm specimen` exits non-zero when any shot overflows.** It is a tool a run
  drives, not a `verify` step — nothing in CI photographs anything — but a lane
  that wires it into its own checks gets the overflow assertion for free.
- **The framework lane owns the harness and none of the specimens.** A specimen
  under a route group is that lane's file; this directory holds one worked
  example and no lane's content.
- **`playwright-core` staying out of the lockfile is now a rule with a reason
  attached**, so the next run that finds the install awkward does not solve it
  by adding a dependency that pulls 200MB through a proxy that blocks it.

## Alternatives considered

- **`apps/loom/scripts/`, beside `db-push.ts`.** This is what `Loom portal`
  proposed, and for its own need it is right: photographing a *signed-in portal
  screen* needs `next build`, `next start` and three environment variables, and
  none of that belongs at the repository root. It is the wrong home for this,
  though — a specimen is a **tree**, the runtime renders it with no Next.js
  anywhere, and putting the harness inside the application would make the
  primitives lane import from an application to photograph a library. The two
  are different harnesses. This is the tree one; the portal's remains the
  portal's, and its finding stays open with the reason recorded.
- **Add `playwright-core` to `devDependencies`.** One line, and it removes the
  `LOOM_PLAYWRIGHT` step. Rejected: it puts a browser driver in the dependency
  graph of a package whose whole product is a runtime, for a tool no consumer
  runs, and it makes `pnpm install` in this repository depend on a download the
  egress proxy has blocked fifteen times.
- **A `verify` step that photographs and diffs against committed baselines.**
  Visual regression testing is the obvious next thought and it is a different
  project: it needs a baseline per palette per viewport in the repository, a
  tolerance, and a story for the run that legitimately changes what a band looks
  like. The harness makes it possible later and does not presume it.
- **Keep letting each run write its own.** Defensible for two runs and it has
  been eleven. The recipe as prose in `FINDINGS.md` was tried — twice, with the
  full recipe attached — and the tenth writing still cost a run, because prose
  cannot be executed and cannot be kept true by a test.
- **Serve nothing and inline images as `data:` URLs.** Would remove the server.
  Refused by `mediaUrlSchema` on purpose (0053), and working around a security
  decision to save nine lines is the wrong trade.
