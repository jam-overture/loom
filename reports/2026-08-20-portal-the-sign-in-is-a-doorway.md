# 2026-08-20 — the sign-in page is a doorway, not a dead end

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-07-the-sign-in-is-a-doorway` (→ `main`).

Visuals, all against a local production build:
[the configured deployment, ready to sign in](2026-08-20-portal-the-sign-in-is-a-doorway-ready.png) ·
[the misconfigured deployment, in plain language](2026-08-20-portal-the-sign-in-is-a-doorway-not-set-up.png) ·
[the operator's message still there, one click away](2026-08-20-portal-the-sign-in-is-a-doorway-disclosure.png).

---

## What was asked

Two threads converged on one screen and this run does both.

Marketing filed a finding on 2026-08-20 — *the sign-in page is a dead end, and
the front door now sends people to it* — owned by this lane. The maintainer's
redirection of 18 August names the same page's other half: it *"speaks the
runtime's vocabulary rather than a person's"*, and this is the first page any
stranger following the marketing site's Sign-in action ever sees.

The whole set of interactive elements on that page before this run:

```
href="#page"                            the skip link
href="/_next/static/chunks/…"           the bundle
<input name="key">                      the form
<button type="submit">                  the button
```

No wordmark, no link back to `/`, no next-action for a visitor without a key,
and — when the deployment is misconfigured — a paragraph reading
*"LOOM_PORTAL_SESSION_SECRET is unset or shorter than 32 characters, so no
session can be signed. Generate one with: openssl rand -hex 32"* at the top of
the page for anyone who arrived by accident.

Not a polish problem. The one screen that decides whether a stranger stays.

## The rule this run applies

The redirection: *plain language is the default, the technical record is one
click away, nothing is ever removed*. Every case here fits it.

The sign-in page had two audiences reading one sentence and getting neither
well: an operator setting the portal up, who needs the exact variable name and
the command that fixes it, and a visitor who has never heard of any of that.
The split those two audiences want has to happen at the seam that already
exists — the config resolution — and not at the page.

## What shipped

**The topbar's wordmark is a link.** It was a `<span>` for two months and a
finding for a week, and this is the sentence the finding needed. Where it
points depends on whether there is a session to keep on. Signed-in: `/portal`
— their own home, the way the docs' wordmark points at `/docs`. Signed-out:
`/` — the marketing home, because `/portal` is proxy-guarded and would loop a
signed-out visitor straight back to the page they were trying to leave. Applies
to every portal page, so the loop closes from anywhere.

**The sign-in page is rewritten** in the words the redirection asks for. A
person reads: what this portal is (*"where the people who run this project
review the changes an AI proposes before any of them go live"*), that it is
signed-in only, the form, and then — under a divider — *"Don't have a key? You
can still see what Loom does, no sign-in needed"*, with **See the live demo**
pointing at `/portal/demo` (which is a public path already, so the link does
not send them straight back through the redirector) and **← Back to Loom**
pointing at `/`.

The high-schooler test the brief names: could somebody who has never read a
decision record read this and say what happened and what they should do next?
On this page, yes. What happened: they landed on the review portal, and it is
not for them. What they should do next: try the demo, or go back.

**The misconfigured-deployment state stops shouting at visitors.** When the
config resolves badly, the page leads with *"This portal isn't set up yet"* and
one plain sentence naming the two audiences' next moves — an operator has to
finish configuring it, a visitor can still see the demo. The operator's message
is not gone. It lives, word for word, in a `<details>` labelled *"For the
operator setting this up"* — the same disclosure the portal already uses for
every rule code and policy fingerprint. Every byte `describeAuthProblem`
returned still reaches the page, and browser find-in-page reaches it too. The
third screenshot is that decision working.

The form is rendered in both cases: disabled while broken, so an operator can
see the shape of what will work, and so a keyboard user hitting Enter in the
field cannot submit against a form that would only refuse.

### The split, kept honest

`_lib/signin-view.ts` gains one function, `authReadout(auth)`, and the page
carries no visitor-vs-operator wording of its own. The visitor's sentence does
not depend on which variable is wrong (both `no-secret` and `bad-roster` map
to the same headline — the test that pins that is deliberate) and the operator's
message is `describeAuthProblem`'s output byte-for-byte. So the seam that
existed one layer down — pure config resolution returning a typed problem — is
what the plain-language rule reaches for, rather than a second untyped string
inside a component.

### The renderer, split from the async page

`SignInHero` and `TopBarChrome` are pure sync components taking their inputs as
props. The async page and the async topbar are one-liners that gather data
(actor, return path, resolved config) and hand them over. The reason is the
same one `audit-view.ts` gives: a component that both fetches and renders is
only testable through the fetch. Portal-07 tests are ordinary RTL, not an
async-server-component dance.

## Tests

**13 new tests. The app was at 849 and is at 862** across 79 files (up from 77).
Framework: **1426 passing** across 97 files, untouched by this diff.
`pnpm install && pnpm verify` green — typecheck, both suites, `next build`.
Nothing weakened, nothing skipped.

The new tests, by file:

- `_components/shell/topbar.test.tsx` — 4 tests. Signed-out wordmark links to
  `/`, signed-in wordmark links to `/portal`, the wordmark's parts survive, the
  sign-out control shows only for a signed-in reviewer.
- `_lib/signin-view.test.ts` — 3 tests for `authReadout`. An ok config passes
  through, both problem shapes lead with the same plain headline, and the
  operator's exact bytes reach the `technical` field.
- `portal/sign-in/_components/sign-in-hero.test.tsx` — 6 tests. Link back to
  `/`, link forward to `/portal/demo`, no `LOOM_PORTAL`/`openssl` in the prose
  a visitor reads first, both strings still present inside the `<details>`, the
  disabled-form property, and the return path threading through the hidden
  input.

Local runtime rebuild was needed once (`pnpm --filter '@loom/runtime' build`)
before `authReadout`'s new `AuthResult` import resolved for the test runner —
the same stale-`dist/` symptom the last portal report flagged, same fix.

## What this tells a developer that they could not get elsewhere

The bar strictly does not apply to a page a signed-in reviewer never opens
twice, and I am not going to pretend it does. What it does say to the developer
who was going to build a Loom-driven site is *the door on this project is a
doorway, not a login prompt spitting environment variables at strangers*. The
finding this closes named that risk exactly — *"the first build in which a
stranger can arrive at that page by clicking something"* — and a portal whose
entry page reads like an error message defeats the marketing surface that just
started sending people to it.

## What I did not do

- **The signed-in portal is still full of runtime vocabulary.** `/trees`,
  `/calibration`, `/audit`, `not-interpreted`, `did-not-apply`. The brief's own
  guidance is to do the rename as I touch each surface rather than as one
  sweeping PR, and the sign-in page was the one this finding put on top of the
  queue. The other screens are next runs' work.
- **The demo's link on this page assumes a working `/portal/demo`.** It does
  work today. The related open finding — *"the demo is behind the sign-in, so
  the front door has nothing to show"* — is a policy question for the
  maintainer, not this lane's, and the demo path is a listed public exemption
  in `paths.ts` regardless. If that changes, this link would need to change too.
- **`src/` is untouched.** Every published entry point used here already existed.
- **No decision record.** Nothing in this touches the tree schema, the delta
  model or an Accepted decision.
- **No follow-up scheduled.** Token discipline.

## Recommendations

1. **The demo policy from the marketing finding.** *"The demo is behind the
   sign-in, so the front door has nothing to show"* is a decision only you can
   take, and it shapes what the sign-in page is a doorway *to*. Right now the
   "See the live demo" action points at `/portal/demo`, which is public but is
   a portal path — a stranger arriving at `/portal/sign-in` and clicking it
   still ends up under `/portal/*`, which reads as *"the front door is inside
   the building"*. Not a blocker, worth thinking about while the second finding
   is still open.
2. **The rename queue.** The brief asks me to do it as I touch each surface.
   Next likely candidates in order of visitor exposure: `/portal/pages`'s
   empty state (a stranger's first signed-in view), then the record card's
   remaining runtime words (`did-not-apply`, `not-interpreted` in specific
   corners), then `/trees` — which is the biggest rename because it is a route.
3. **Nothing blocking.**
