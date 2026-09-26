# 0117. One harness, two subjects: a tree it renders and an address you serve

**Status:** Accepted — partially superseded by [0191](0191-the-harness-may-start-the-application-because-there-is-now-only-one.md)
**Date:** 2026-09-08
**Section:** §1 (process)

## Context

This lane built the screenshot harness twice, twelve hours apart, on two
branches neither run could see from the other.

`tools/screenshot/` landed on 6 September as the ninth unit of #230 and
photographs **addresses**: a shot list of paths against a base URL, a selector
to wait for, a viewport-sized or full-page picture. `tools/specimen/` landed on
8 September as #250 and photographs **trees**: a lane declares a composition and
the themes to wear, and the harness renders it through the render seam, serves
it, and photographs it. [0116](0116-a-screenshot-is-taken-by-the-repository-and-playwright-is-never-a-dependency.md)
records the second and does not mention the first, because the run that wrote it
branched from `main` and `main` has not moved since 1 September.

Both are wanted. They are not the same subject, and the difference is real: a
signed-in portal screen cannot be built from a tree in a scratch process, and a
composition of primitives should not need a Next.js server to be looked at.

What is not wanted is what the two copies had already done to each other in
three days:

- **`wide` meant 1440×900 in one and 1280×900 in the other.** Two lanes'
  "wide" screenshots of the same page were different pictures, and neither file
  name said so. 0116 states 1280×900 as the convention six lanes share, on the
  evidence of what the reports already quote.
- **`tools/screenshot/` imported `playwright-core` at module scope**, which
  means it added the dependency 0116 rejects by name — one branch carrying a
  record saying the driver is never a dependency, and another adding it to
  `devDependencies`. Merged in either order, `main` would have held both.
- **Two Chromium locators**, two sets of launch flags (`--no-sandbox` in one,
  `--no-sandbox --disable-dev-shm-usage` in the other; both are needed), and two
  functions named `planShots` with different return types.
- **The address half measured no overflow**, so the entry point pointed at real
  application pages was the one that could not tell you the page was wider than
  the phone.

## Decision

**There is one harness. A subject is either a tree it renders or an address you
serve, and everything after the subject is shared.**

The seam is `Shot` in `tools/specimen/capture.ts`: a name, a URL, a file, a
viewport, an optional selector to wait for, and whether to photograph the whole
page. `pnpm specimen` produces those by rendering and serving a specimen;
`pnpm shoot` produces them by resolving a shot list against its base. From there
one code path finds Chromium, launches it with the flags this container needs,
opens a context at a true viewport with motion reduced, waits, measures
`scrollWidth` against `innerWidth`, writes the file and prints the line.

So:

- **`pnpm shoot` gains the overflow measurement and the non-zero exit** that the
  specimen path already had, and loses its own copy of the browser.
- **`tools/screenshot/browser.ts` is deleted.** `chromiumCandidates` in
  `tools/specimen/browser.ts` does the same job, derives paths from the
  directory listing rather than a build number, and is the version with tests
  for the headless-shell ordering.
- **`playwright-core` is not in `package.json`.** Both entry points resolve it
  at call time through `loadChromium`, per 0116, and print the install recipe
  when it is absent.
- **`VIEWPORTS` in the shot list is `PHONE` and `WIDE` from the harness.** A
  list may still give an explicit size, and now names it, because every viewport
  reaching a file name is named.
- **0116 stands and is not superseded.** Everything it decided is still true;
  it was written without sight of a file on another branch of the same lane, and
  this is the reconciliation rather than a change of direction. Its sentence
  about the portal's harness is unaffected: photographing a signed-in screen
  still needs that lane's `next build`, `next start` and environment. `pnpm
  shoot` does not start your server. It photographs one you are already running.

## Consequences

- **A lane picks an entry point by what it has**, not by which harness it found
  first: a composition is `pnpm specimen`, a running page is `pnpm shoot`.
- **A picture of an application page now reports its overflow**, which is the
  single most-reported visual defect in this repository and the one the address
  half was blind to.
- **`settleMs` is gone.** It was a fixed sleep after the wait condition, unused
  by any list in the repository, and its own comment called it the thing a
  selector wait exists to replace. Adding a sleep to the shared page seam to
  keep an unused knob is the wrong trade; a selector expresses the condition.
- **A shot's `file` is relative to `outDir` on both paths.** The list's `outDir`
  is applied by the capture loop, once.
- **The next run that wants a third subject adds a planner, not a harness.**
  Whatever produces `Shot` values gets the browser, the flags, the reduced
  motion and the measurement for free, and cannot disagree with the other two
  about what `wide` means.

## Alternatives considered

- **Leave both, and only delete the duplicated `browser.ts`.** The smallest fix
  that resolves the dependency clash. Rejected: it leaves two `planShots`, two
  viewport vocabularies and two launch-flag sets, which is exactly the state
  that produced a silent 1440-versus-1280 disagreement in three days. The
  duplication was not an accident of one file; it was two harnesses.
- **Fold `pnpm shoot` into `pnpm specimen --shots <list>`, one command.** Tidier
  on the surface and the natural end of this argument. Not taken on an
  unattended run: the two are pointed at by different lanes' documents already,
  and collapsing the command names is a rename that costs every one of them an
  edit for no capability. Recorded here so the next run knows it was considered
  rather than missed.
- **Delete `tools/screenshot/` and keep only the tree harness.** Rejected: it
  removes the only way to photograph a page that needs a session, a database or
  a build behind it — which is what `Loom portal` has an open finding for.
- **Keep `playwright-core` in `devDependencies` and simplify both.** Rejected by
  0116 with its reasons, and nothing here changes them: it puts a browser driver
  in the dependency graph of a package whose product is a runtime, for a tool no
  consumer runs, behind a download the egress proxy has blocked.
