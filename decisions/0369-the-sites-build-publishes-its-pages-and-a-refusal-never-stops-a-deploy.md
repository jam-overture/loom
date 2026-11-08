# 0369. The site's build publishes its pages, and a refusal never stops a deploy

**Status:** Accepted
**Date:** 2026-11-08
**Section:** §5 (portal), the connection plane

> **Why this number.** `0368` is the highest on `main`, and no open pull request
> adds `0369`.
>
> **Why `Accepted`.** The maintainer asked for it on 7 and 8 November: he wanted
> to get back to *"publishing loomjs.orgs pages to loom on each deploy"*, and
> added `LOOM_PUBLISH_KEY` to the site's Vercel project so that it could. Clause
> 3, that a refusal never stops a deploy, follows from
> [0262](0262-the-control-plane-is-hosted-and-the-render-path-stays-in-the-customers-app.md)
> and is open to his review on the pull request that adds this record.

## Context

[0312](0312-a-site-hands-loom-a-snapshot-of-its-pages-with-a-secret-key-and-loom-never-runs-its-code.md)
says a site's build hands Loom a snapshot of its pages. For loomjs.org, nothing
did: `pages:publish` existed and was run by hand, when somebody remembered. Since
then the code has changed the site's pages, including the home page's headline
on 7 November
([0363](0363-the-marketing-site-is-served-from-its-code-and-a-stored-row-is-not-a-second-version-of-it.md)),
and Loom holds whatever was published last.

That matters more now than it did. Under
[0358](0358-an-accepted-change-goes-live-from-the-portal-and-the-site-pulls-it-with-no-pull-request.md)
the live version of a page is the version the site last published, with the
changes accepted on it. A site that pulls its live pages from a stale snapshot
serves an old page with new approvals, which is the flip of
0363 again, arrived at by a different route.

## Decision

1. **`pnpm build` ends by publishing the site's pages**, after `next build` has
   succeeded, with the same request `pages:publish` makes
   (`scripts/pages-publish-on-deploy.ts`).

2. **It publishes when the deployment is public, holds `LOOM_PUBLISH_KEY`, and
   has its domain pinned in `LOOM_SITE_ORIGIN`**, and sends the pages to that
   domain. A preview is not the site, so it never publishes. A build has no
   server of its own answering yet, so the pages go to the deployment already
   answering on the domain, which shares the database the new one will read.
   The key is the opt-in: a deployment without one publishes nothing.

3. **A refusal never stops a deploy.** A missing setting, a refused key, an
   unreachable or slow deployment (bounded at 20 seconds): each is one line in
   the build log saying which, and the build succeeds. Loom is not in front of
   the site (0262), and a deploy it could block would put it there.

4. **`LOOM_PUBLISH_KEY` becomes a setting.** It is in `.env.example` and the
   deployment guide's table, and leaves the list of reads that are not settings
   ([0367](0367-what-an-operator-must-set-is-read-off-the-application-and-the-guide-goes-red-when-it-is-behind.md)).

## Consequences

- Loom's copy of each page, the *Pages* tab, and the live page a server pulls
  all start from the code being deployed, with no step for anybody to forget.
- The new pages reach Loom a minute or so before the new code is serving. A
  page's live version can lead its deploy by that much; it cannot lag it.
- A publish that fails is visible only in the build log, as a line starting
  `loom: warning`. The *Pages* tab's received time is the other place to see
  that a deploy did not publish.
- Publishing an unchanged page again is harmless: the copy of a page whose
  site version did not change is kept as it is (0340), and only the received
  time moves.

## Alternatives considered

**Publish when a server starts, from `instrumentation.ts`.** This needs no change
to the build and publishes from the code that is actually running. But a host
that starts servers on demand starts many per deploy and more after every quiet
spell, so the same snapshot would be sent dozens of times a day, each one
moving the received time and running the copy follow-up. It also has no
request scope to defer that follow-up in, and it publishes from every preview
server that holds the key unless gated the same way. The build runs once per
deploy, which is what *on each deploy* means.

**Fail the build when Loom refuses.** That makes a stale snapshot impossible, at
the price of letting Loom stop the site from shipping, including a fix for an
outage of Loom itself. The site serving its own code is the property 0363 just
restored, and a deploy that waits on Loom gives it back.

**A deploy hook or a CI job after the deploy.** It would publish from the
deployment that is live, but it needs the publish key held in a second place,
another moving part, and it runs only on hosts that have the hook. The build is
where 0312 already said the snapshot comes from.

**Publish to the deployment's own address (`VERCEL_URL`).** During the build that
deployment is not answering yet, so every publish would fail.
