# 0065. A submission names a destination, and never carries one

**Status:** Accepted
**Date:** 2026-08-18
**Section:** §4g → §3, §4b

## Context

The primitives routine filed it on 17 August, in a finding about the three
Hermes blocks that no amount of primitive-building will unblock:

> **`contactform` and `newsletter` need a form target.** Both are a field list
> and a submit. The field list is an ordinary 0052 decomposition and this routine
> can build it; the submit is a decision about where a deployment's data goes,
> which is a host concern with a security surface and belongs nowhere near a
> primitive's props.

It is right about all three parts, and the security surface is the one worth
stating plainly. A URL in a prop is AI-authored — that is what props are — and
[0053](0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md) already
holds every one of them to a scheme allowlist because the alternative is a model
writing `javascript:` into an `href`. A form's `action` is worse than an `href`
in one specific way: an `href` a visitor did not click costs nothing, and a form
action is where their name, their email address and whatever they typed are
sent, without them ever seeing where that is. A scheme allowlist does not help.
`https://collect.example.com/harvest` passes it.

So the question is not "how do we validate a form action a model wrote". It is
"how does a form get an action a model never wrote".

Two other constraints hold, unchanged from the data seam.

**Rendering cannot wait.** `renderLoomTree` is a pure synchronous function
([0008](0008-the-renderer-is-a-total-pure-projection.md)), and a CSRF token is
minted per request, often against a store. An `await` in the walk gives up what
0008 bought.

**The address is not a property of the revision.** It differs between staging
and production, it rotates, and nobody proposes it or undoes it. A tree carrying
it would be a cache of one deployment's routing table, and every `configure` a
write against a stale copy of it.

## Decision

**A node names a registered endpoint. The address is resolved for it, and never
appears in the tree.** `loom:submit` is the third key in the reserved namespace
[0050](0050-the-runtimes-props-are-namespaced-and-the-root-mounts-the-theme.md)
opened:

```json
"loom:submit": { "to": "contact.enquiry" }
```

That is the entire AI-authored surface: one id, from a registry a deployment
built. A proposal cannot compose an address, cannot append to one, and cannot
pass anything that reaches one.

**There are no params, and this is the one place the data seam is not copied.**
[0058](0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md)
accepted AI-authored params because a read genuinely varies — `{ "limit": 6 }` is
a different question of the same source — and guarded them with a schema the
source declares. A write does not vary that way. A deployment with two mailing
lists registers two endpoints, which costs one line and makes the allowlist
exact; params would reopen an AI-authored channel into the one place a mistake
sends a visitor's data somewhere nobody chose, and buy nothing a second
registration does not. The declaration is an object rather than a bare id string
so that being wrong about this is a new key rather than a migration.

**Resolution happens before the walk, in the same three steps.**
`planTreeSubmissions` is a pure pass that reads every declaration out of the
tree. `resolveSubmissionPlan` is the step that may do IO, asking every endpoint
at once. `renderLoomTree` takes the targets as a finished lookup and stays
exactly as synchronous as it was. `renderRequest` is where they meet, and it
resolves data and submissions **together** rather than in turn — neither knows
about the other, and a page with a form and an integration should not pay for
both in series.

**A target is host-authored and validated anyway.** An endpoint answers with an
`action`, a `method` of `get` or `post`, and the hidden `fields` the form must
carry — a CSRF token being the reason that list exists. The action must be a
root-relative path or an absolute `http(s)` URL: the host wrote it, so this is
not 0053's check, it is the check that a host's own composition mistake does not
become a live `javascript:` form action, and that an empty string does not
silently mean "post to this page". The seam validates the host's answer for the
reason `defineSource` validates an adapter's: the type is a claim made when the
code was written, and the schema is what makes it true on the day the route
moved.

**A form has a target, or has a named reason it does not, or was never given
one.** Three states, all distinct, because a form primitive shows something
different for each: `loom.submit` is absent when the tree said nothing,
`unavailable` with a reason when the deployment could not answer, and `ready`
otherwise. There is deliberately no way to express "no target, and that is
fine" — a submit button that silently goes nowhere is the failure this shape
exists to prevent.

**Two forms naming one endpoint share a target.** That is 0058's "identical
questions are asked once" applied to a question with nothing to differ by, and it
is also what a reader expects: a per-form nonce would break the second form on
the page every time somebody used the first.

**A submission is registered like a source and catalogued like one**, and the
catalogue is deliberately thinner — an id and a line, because the id is the only
thing a model supplies. Whether an endpoint posts or gets, where it posts to and
what it carries are resolved after the choice and are none of the model's
business.

## Consequences

- **A deployment that registers nothing has no form that posts anywhere.** The
  seam fails closed. That is the intended default and it is what makes the
  registry the whole allowlist: there is no address to fall back to, because an
  address never appears in a tree.
- **The Gate does not yet weigh a change of destination.** A `configure` that
  moves `loom:submit` from `newsletter.subscribe` to `contact.enquiry` sends the
  next visitor's message somewhere else. Both are registered, so nothing leaves
  the deployment, and the analysis reports the prop change like any other — but
  "this form now posts somewhere else" is a stake factor, not an ordinary
  configure, and it is not built here. Named as the first open question rather
  than guessed at, because the stakes vocabulary is being extended on another
  open branch and two routines writing the same file is the friction this
  repository already knows about.
- **Nothing enforces that a form primitive has a target.** A primitive that
  needs one and is given none renders untargeted, and only its own author knows
  that is wrong. The parallel machinery — a declaration on `definePrimitive`,
  the way `interactive` is declared — is available and deliberately not used
  yet: one seam per run, and the audit is cheap to add once a primitive exists
  that would fail it.
- **The renderer gained a second thing it depends on and that does not depend on
  it.** `src/submit/` knows nothing about React and imports nothing from
  `render/`, so a host can resolve a tree's submissions without loading the
  renderer.
- **`loom.submit` is optional on the render context**, unlike `loom.data`,
  `loom.slots` and `loom.text`, which are always present and often empty. A node
  has at most one submission and almost never has that, so a map of one would be
  ceremony; absence is already one of the three states a form acts on.
- **No primitive in the starter library posts anywhere yet.** The seam exists
  and `src/primitives/` is another routine's lane. Filed for it.
- **A third registry to wire.** `renderRequest` now takes `sources`, `themes`,
  `text` and `endpoints`, all optional, all failing closed with a diagnostic. The
  composition root is where a deployment says what it permits, and it is getting
  long enough that a single `LoomDeployment` object bundling the four is worth
  considering — recorded, not done.

## Alternatives considered

**An endpoint as a data source that answers with a URL.** Tempting, because it
is no new machinery at all: `defineSource` already validates params, catches
throws and answers `ready` or `unavailable`, and a target is JSON. Rejected on
two counts. The primitive would receive `JsonValue` and have to re-parse it,
which puts an unchecked cast in every form author's lap and gives up the one
thing a typed seam is for. And it collapses a distinction that is the entire
point: a source is a read, an endpoint is a write, and a reviewer looking at a
catalogue needs to see which registrations can receive a visitor's data. One
mechanism serving both would list them together.

**A URL prop, validated by an allowlist of hosts.** The cheapest thing that
works, and it fails at the first deployment that does not know its own production
hostname at build time. Worse, it makes the address part of the revision: the
tree carries it, the delta carries it, the log records a model having chosen it,
and rotating a URL becomes a proposal through the Gate. The finding's own words
are the argument — the destination "belongs nowhere near a primitive's props".

**Params on the declaration, guarded by a schema like 0058's.** Rejected above,
and it is worth naming what was given up: a deployment with twenty mailing lists
registers twenty endpoints instead of one taking a list id. That is more
registration and it is the right trade — the registration is written by the
person who runs the deployment, and the alternative is a validated but still
AI-authored value reaching the code that decides where a submission goes.

**Letting the primitive render its own form action from a prop the host wires
through React context.** It works, and it puts the framework outside the one
decision it most needs to be inside. A host wiring context per primitive is a
host reimplementing this seam once per form, differently each time, with no
diagnostic when it forgets.

**A synchronous registry lookup, with tokens threaded through
`RenderRequest.context`.** Half the machinery: no plan, no resolve, no async. It
pushes minting into whatever the host does before calling `renderRequest`, which
means every deployment builds the same token plumbing by hand and the seam has
no idea whether it happened. Making resolution async is what lets a host answer
"where does this post, and with what" in one place.
