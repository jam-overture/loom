# 0209. What an adapter owes the runtime is a suite, not a sentence

**Status:** Accepted
**Date:** 2026-10-01
**Section:** §2 — Composition Runtime

> **Why this number.** `0208` is the highest record on `main`. The two open pull
> requests (#456, #458) each add none, so `0209` is free everywhere.
>
> **Why `Accepted`.** It contradicts no `Accepted` record and completes
> [0005](0005-model-access-is-an-optional-adapter.md), which offered the seam
> and said *"adding a second is a second entry point"* without saying what the
> second one would have to do. It adds no runtime code, changes no behaviour,
> and moves neither the tree schema nor the delta model: what ships is a test
> suite and one more export from `testing/contracts`.

## Context

`ModelClient` is the seam a host is likeliest to implement. 0005 made the
vendor adapter opt-in precisely so that a host could bring its own model, and
the package has shipped exactly one implementation of it since day 37.

Every other seam a host may implement got a published contract suite as soon as
there were two implementations to hold against each other — `TreeStore`,
`HoldStore`, `TelemetryJournal`, `ReaderSignal`. The argument in
`testing/contracts.ts` is that **the promises are not in the type**, and that a
host discovering each of them from a production incident is "the seam being
offered without the thing that makes it safe to take."

`ModelClient` never got one, for the honest reason that there was only ever one
implementation. The promises are no weaker for that, and they are unusually
easy to get wrong:

- **The five error codes name who must act, not what went wrong.** A key the
  service will not accept and a rate limit are both *it did not answer*; one
  needs an operator and the other needs a wait. The first three were one code
  until day 37, and 0005 records why they were split: collapsing them reported a
  request the API rejected outright as "ask again later", which is a lie
  downstream cannot detect and cannot recover from.
- **The reply text crosses unchanged.** Parsing, validating and deciding what a
  malformed answer means live above this seam, which is the whole reason they
  are testable with no network and no credentials.
- **Nothing throws.** `modelInterpreter` reads a `Result` and has nowhere to
  catch.

None of that is visible to a compiler, and none of it is checkable by a host
from outside this repository.

## Decision

**`describeModelClientContract` is published from
`@jam-overture/loom/testing/contracts`, and a host writing an adapter runs it.**

### A host supplies situations, not a client

The other four suites take `makeStore()` and drive it. This one cannot: nobody
can make a real service return a 402 on demand, and a suite that took one client
could check that a success is a success and nothing else.

So the unit of the contract is a **situation** — what happened, in terms every
vendor has rather than one vendor's — and the host wires each one to whatever
their vendor does in it, the same way `anthropic.test.ts` already stubs
`messages.create`. The suite says what the answer has to be.

The statuses are grouped by the answer they require rather than listed, because
the question is never *is 402 handled*; it is *does this implementation know
that only an operator can clear a 402*.

| situation | the only correct answer |
| --- | --- |
| `answers` | `ok`, with the text unchanged and the serving model reported |
| `answers-without-text` | `incomplete` |
| `truncates` | `incomplete` |
| `refuses` | `refused` |
| `refuses-the-caller` (401, 402, 403) | `misconfigured` |
| `refuses-the-request` (400, 404, 413, 422) | `rejected` |
| `asks-for-later` (408, 409, 429, 5xx) | `unavailable` |
| `never-answers` (closed socket, DNS, TLS) | `unavailable` |

### A record keyed by every situation, not a list of the covered ones

The host answers for **every** member, and `everyMemberOf` makes that a
compile-time fact: a situation added here stops every host's call compiling
until they have answered it. A list of the cases somebody felt like covering
would have gone quietly out of date at the first addition, which is the failure
mode `closed-set.ts` exists to prevent.

### `not-expressible` is a claim, not a skip

A vendor may genuinely have no distinct signal for a situation — no separate
refusal stop reason, say. An adapter that invented a `refused` for it would be
worse than one that said so, so the host may answer `"not-expressible"` for
that member.

It is spelled out rather than permitted by omission, which is the same
distinction 0122, 0181 and 0208 each turn on: **absence and emptiness are
different answers.** A missing key would mean *I did not get to it*; this means
*my vendor cannot do this*, written down where a reviewer sees it.

`answers` is the one member that may not be `not-expressible`, and the suite
throws rather than skipping if it is: a `ModelClient` that cannot answer is not
a `ModelClient`.

### It is run against the adapter this package ships

`anthropic.contract.test.ts` runs the published suite against
`anthropicModelClient`, overlapping `anthropic.test.ts` on purpose. A suite
handed to a host writing a second adapter is worth what it is worth against the
first, and the only way to know that is to run it there. What stays in the
vendor's own file is everything about *that* vendor — which statuses it emits,
how it shapes a message, that the caller's signal reaches the SDK.

## Consequences

- A second, third or fourth adapter is now a known quantity: write the
  translation, answer eight situations, run the suite. The classification that
  would otherwise be hand-checked once per vendor and drift is checked by one
  piece of code.
- The suite is **not** proof an adapter is correct, and should not be read as
  one. It checks what every adapter owes the runtime; whether a vendor's
  structured-output mode accepts the schema Loom sends is a different question
  that no offline suite can answer, and 0005 is why there is a live smoke test.
- Adding a situation is a breaking change to every host's contract object, by
  construction. That is the intended cost: the alternative is a host believing
  they are covered against a case nobody ever asked them about.
- `testing/contracts` already imports `vitest` as an optional peer, so this adds
  no dependency.

## Alternatives considered

**Take a `makeClient()` and check only what a live service can be made to do.**
What the other four suites do, and it degenerates here to asserting that a
success is a success. The eight situations are the whole content of the
contract; a suite that could not reach them would be a suite in name.

**Let a host pass the cases they support and omit the rest.** Simpler to call,
and it silently stops testing the member nobody added. Rejected for
`closed-set.ts`'s own reason, and because the thing a host most wants to know is
the case they did not think of.

**Assert the error `detail` matches a shape.** Tempting — an operator reads it
at three in the morning — but the content is the vendor's own words and a format
this suite imposed would either be ignored or would make adapters rewrite what
the service said. The contract asks only that it is non-empty, which is the
difference between *your key is not accepted* and *something went wrong*.

**Check that `effort` reaches the vendor.** Not expressible in vendor-neutral
terms: `ModelEffort` is a five-level scale and what a vendor does with it is the
adapter's business and, as of today, an open question (filed). A contract that
guessed at a mapping would be deciding that question by accident.
