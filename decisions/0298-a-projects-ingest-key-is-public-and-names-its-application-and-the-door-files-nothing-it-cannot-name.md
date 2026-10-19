# 0298. A project's ingest key is public and names its application, and the door files nothing it cannot name

**Status:** Proposed
**Date:** 2026-10-19
**Section:** §5 (portal), §4c (reader signals)

> **Why it is raised.** Unit 4b of [`docs/portal.md`](../docs/portal.md): *the
> key and the authenticated door*. [0260](0260-a-project-is-the-unit-loom-stores-governs-and-measures-under.md)
> clause 4 says *a signal is filed against a project or it is refused*, and
> left it as a unit of work because nothing authenticated the intake.
> [0296](0296-a-project-holds-exactly-one-application-and-the-portal-never-names-it.md)
> clause 4 says what the key resolves to. Neither says what the key **is** —
> a secret or not, stored how, carried how — or what happens to the
> deployment's own pages, which have posted without one since September.
>
> **Why `Proposed`.** Clause 4 is the maintainer's, answered on 19 October:
> asked whether this deployment's own pages should keep posting without a key
> until 4c, he chose *key everywhere*, and then *the marketing site needs a
> key* in this unit rather than the next. Clause 2, storing the key readable,
> is a choice he has not yet been asked about directly, and the pull request
> that lands this asks him.

## Context

`/api/reader-signals` files every batch under `app_default`. Since 0273 and
0284 the reader tables can tell two applications apart, so the mixing moved
up a layer: a second customer pointed at this deployment would have their
readers counted as the first's, and once a window is folded the rows cannot
be separated. Unit 4 exists to close that, and 4b is the half that can mix
two customers' readers if it is wrong.

Three facts constrain what a key can be:

- **It is in the page.** The snippet a customer pastes is served to every
  reader, so the key is in the page source of every page that sends one.
- **`sendBeacon` sets no headers.** The last batch of a page view leaves as a
  beacon (0136), and a beacon is a URL and a body. A key in an
  `Authorization` header would be a key the most important delivery cannot
  carry.
- **The batch schema is strict.** `parseReaderSignalBatch` refuses unknown
  fields, and the batch is the runtime's, not the host's. A key in the body
  would be a host concern written into the runtime's wire format.

## Decision

**A project's pages post with `?key=` and a key minted for its application.
The key is public, stored as it is, and is attribution rather than a
secret. A delivery the door cannot name is refused.**

1. **The key is `lk_` and 32 hex characters, minted, never chosen**, and
   there is exactly one per application (0296 clause 4). Minting another
   ends the first. The prefix is what tells it apart from an account key
   (0285), which is the same 32 characters and is a secret.

2. **It is stored readable, not as a digest.** 0285 digests an account key
   because the key is the account. This one is printed on the customer's own
   site, so a digest would protect nothing and would cost the one thing a
   snippet screen needs: showing the snippet again. `loom_ingest_keys` is the
   deployment's table, not the runtime's, on 0018's terms.

3. **It is carried in the query string**, as `/api/reader-signals?key=…`,
   because a beacon can carry nothing else and the batch is not the host's
   to extend.

4. **A delivery with no key is refused, from anywhere, this deployment's own
   pages included.** The marketing site is a project like any customer's: its
   layout reads its project's key from the table the door reads and posts
   with it, and a deployment that has not minted that key mounts no
   broadcaster on the site rather than one whose every batch is refused.

5. **A keyed delivery is filed under the key's application and nothing
   else**, and is refused when the key was never issued or was replaced, when
   the project is closed (0289), or when the project names its host and the
   `Origin` is any other host: no subdomains, no second port, no "close
   enough". A project that names no host takes deliveries from anywhere that
   has the key, including from `curl` with no origin, because that is how
   somebody proves a key works before there is a page to paste it into.

6. **The refusals are 403, and a lookup that cannot answer is 503.** A 401
   promises a `WWW-Authenticate` challenge, and there is no scheme to name.

7. **The gate runs before the lookup.** A sender guessing keys spends their
   own delivery budget, not this deployment's database.

## Consequences

- **Two customers' readers cannot be filed under one name by accident.** A
  copied snippet, a staging site carrying production's key and a key that
  was replaced are all refused, because a browser always writes `Origin` and
  the page it runs cannot make it lie.
- **Anybody with `curl` can still file a batch under a project whose page
  they have read**, because the key is public and `Origin` is whatever a
  non-browser sender writes. That is true of every analytics snippet on the
  web. This record buys attribution and says so, and the counters are
  already defended against volume by the gate and against identification by
  0146.
- **One more indexed read per delivery.** It is not cached, so closing a
  project or replacing a key takes effect on the next delivery rather than
  after a cache expires.
- **`signals:collect` folds every application**, closed ones included, since
  a buffer scoped to an application nobody collects would grow without end.
- **A key is minted with `pnpm signals:key <project>`** until 4c mints one at
  registration and shows it with the snippet. The marketing site's is
  `pnpm signals:key prj_default`, and until it is run a deployment with intake
  on counts nobody on the site, while the site's pages still say it is
  counting. That disclosure is the deployment's switch, and closing the gap
  between them is a finding rather than this unit.
- **Cross-origin delivery is still 4c's.** The runtime's `deliverReaderSignals`
  sends `application/json`, which a cross-origin beacon cannot carry without
  a preflight. The door accepts whatever reaches it, and making a customer's
  page reach it is the snippet's job.

## Alternatives considered

**A secret key, digested like 0285's.** It fits the one place the key cannot
be hidden worst. A secret printed in page source is a public key with a
lifecycle built for a secret: shown once, unrecoverable, so the snippet
screen could never show the snippet again.

**A signed, short-lived token minted per page view by the customer's
server.** This is the real answer to *anybody with `curl`*, and it is the
right one for a customer who needs it. It needs a server-side integration
on the customer's side before the first signal arrives, which is the
opposite of *paste a snippet*. It stays available as a second kind of
sender, and nothing here forecloses it.

**The key in a header.** A beacon cannot set one, and the beacon is the
delivery that matters most.

**Keep the deployment's own pages keyless until 4c**, accepting a keyless
delivery only from the origin it is posted to. It keeps the live site counting
with no operator step, and it makes *which project is this* depend on a
header for the one sender whose key this deployment can hand over itself.
Offered to the maintainer and declined.

**Match origins loosely: subdomains, or either scheme.** It is convenient
for `www.` and costs the one property the check has. A staging subdomain is
the commonest way a key ends up on a page it was not issued for.
