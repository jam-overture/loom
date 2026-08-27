# 0095. A frame carries its URL, and the deployment carries the origins

**Status:** Accepted
**Date:** 2026-08-26
**Section:** §3, §4b

## Context

`Loom primitives` filed it on 25 August, in the doc comment of the primitive
that forced it:

> Every other URL in this library reaches an `href` or an `img src`, which is
> why [0053](0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md)'s
> scheme allowlist was enough for them. **This one reaches an `iframe src`,
> which is a whole document with a script host in it**, chosen by a model.
> `https:` says nothing about who is on the other end.

`loom.embed` did what a primitive can do alone, and the finding is precise about
what that leaves. It sets `sandbox` to the narrowest triple a real provider
needs, sets `referrerPolicy` so a private preview URL is not handed to whoever
is being framed, and grants four media capabilities rather than inheriting. None
of that answers the question. A framed document from an origin nobody chose runs
its script inside the page under exactly the same sandbox as one from an origin
somebody did.

0053 holds every AI-authored URL to a scheme allowlist, and for an `href` or an
`img src` that has been enough: the worst a bad `https:` link does is disappoint
whoever clicks it. A frame is different in kind. `https://collect.example.com/x`
passes the scheme check, and the Gate cannot help either — a `configure` setting
a URL is a small, reversible, low-stakes change by every measure it has, which
is the same reasoning 0053 wrote down about `javascript:`.

There is a second half, and it is the one nobody would find on their own. A
`sandbox` of `allow-scripts` beside `allow-same-origin` is only a boundary
*because* the framed document is cross-origin. Between an origin and itself it
is nothing at all — the framed document gets full access to the page that framed
it — and nothing in a render could tell, because nothing in a render knew what
"own" meant for this deployment.

## Decision

**A tree names a URL. A deployment names the origins it will frame. A primitive
is told the verdict, and never the raw prop.**

This is the submission seam's shape (0065) with one deliberate inversion. A
form's address never appears in a tree at all, because *where a visitor's data
goes* is not a content decision. A frame's URL is entirely a content decision —
which video, which map, which prototype — and a registry of whole URLs would be
a deployment registering every video it might ever show. What a deployment can
say once and mean forever is **whose** documents it is willing to run inside its
own pages. So the URL stays in the tree, the origins go in the registry, and the
seam holds one against the other.

**A framable prop is declared by the primitive's author.** `frames: ["src"]` on
`definePrimitive`, a list of prop names rather than a `true`, because the
runtime has to know *which* string to check and could not infer it: a `src`
reaching an `iframe` and a `src` reaching an `img` are the same JSON. The named
props must be props the schema declares, and the registry refuses a declaration
that names one it does not — the same check `interactive.whenProps` gets, with
more riding on it, because a frame declaration that has drifted off a renamed
prop fails **open**.

**The check happens inside the walk, and there is no plan and no resolve step.**
This is the one structural difference from the two seams it is modelled on. A
binding is answered by a host's adapter and a submission target is minted per
request, so both may do IO and neither can happen inside a synchronous render
([0008](0008-the-renderer-is-a-total-pure-projection.md)). An allowlist is a
static host-authored list and a URL parse. Building the second walk anyway would
buy nothing and cost a pass that could disagree with the first.

**A primitive reads `loom.frames.<prop>` and gets `allowed` or `refused`.** Two
states, and deliberately not the three a submission has: a form that was never
given a target is a distinct fault, and a frame has no equivalent, because the
URL is in the props and a node either carries one or renders no frame.

**The seam fails closed.** A render given no registry refuses every frame, with
a diagnostic saying that is why. The registry *is* the allowlist, so a
deployment that has not written one has not agreed to run anybody's script
inside its pages, and a default of "frame it" would make this a formality every
host has to remember to switch on.

**An origin registered as the deployment's own is permitted and reported.** The
`self` flag changes nothing about whether a frame is allowed and everything
about what it is worth. A `frame-same-origin` diagnostic is the only one in the
renderer raised for something that *worked* — it is the one place in the system
that can notice a sandbox is inert, and noticing silently is the same as not
noticing.

**A frame's URL is normalised through `URL` before it is handed on.** What the
browser resolves has to be the string the allowlist checked. Echoing the prop
back verbatim would make the check advisory.

**An origin is scheme, host and port, and nothing else.** A path is refused
rather than ignored: `https://example.com/embed` reads as an allowlist scoped to
a directory, an origin check cannot scope to one, and an allowlist that silently
permits more than it appears to is worse than no allowlist. Credentials are
refused for the same reason — `new URL` drops them from `origin` without
complaint.

## Consequences

- **A deployment that registers no origins frames nothing.** That is the
  intended default, and it means every host with an embed on a page has to say
  out loud whose documents it runs. `auditRegistry` reports which registered
  primitives frame, so the requirement is discoverable before a page renders a
  refusal.
- **No primitive in the starter library uses the seam yet.** `loom.embed` still
  reads its own `src` prop and frames whatever passes `mediaUrlSchema`.
  `src/primitives/` is another routine's lane and adopting this is a change to a
  shipped primitive's behaviour — the frame that renders today would render a
  refusal on a deployment with no allowlist. Filed for that lane rather than
  done here, exactly as 0065 and 0093 left their own seams.
- **Until it does, this record describes machinery with no consumer.** That is
  the same state the submission seam shipped in and it is a real cost: a seam
  nobody calls is a seam whose ergonomics have not been tested by anything.
- **A fourth registry to wire.** `renderRequest` now takes `sources`, `themes`,
  `text`, `endpoints` and `origins`. The `LoomDeployment` object bundling them,
  recorded as worth considering under 0065 and still not built, is now more
  worth considering than it was.
- **The audit takes the author's word about `frames`.** It could not usefully do
  otherwise: the registry already refuses a declaration naming a prop the schema
  does not have, and the failure left over — a primitive that puts a URL in an
  `iframe` and never said so — is invisible to a probe, because a frame built
  from an undeclared prop looks exactly like one built from a declared prop.
  Catching that needs a lint over the markup, not a call of the component.
- **Nothing here stops a permitted origin from being compromised.** An allowlist
  is a statement about who a deployment trusts, not a guarantee about what they
  serve. It replaces "any host on the internet" with "these four", which is the
  whole of what it claims.
- **A frame's URL is still in the tree, and still in every delta that touched
  it.** That is the deliberate half of the inversion, and it means a proposal
  changing a video is an ordinary `configure` the Gate weighs as one — unlike a
  submission, where changing the destination cannot be expressed at all.

## Alternatives considered

**A registry of whole embed URLs, exactly like the endpoint registry.** The
closest thing to no new thinking at all, and it fails at the first page. A model
choosing which of a deployment's twelve videos goes in a hero is doing content
work; a model that can only choose from URLs a human pre-registered means a
human registers a URL every time somebody uploads a video. The registry would
become a content table maintained by whoever runs the servers.

**An allowlist in the primitive's props schema.** The cheapest thing that
compiles, and the finding rejected it before this record existed: a primitive
carrying its own list is a primitive every host has to fork. It also puts the
list in the library rather than in the deployment, so two deployments of the
same library cannot disagree about who they trust, which is the one thing they
most need to disagree about.

**Resolving frames before the walk, like data and submissions.** Symmetry for
its own sake. It would buy a place to put an async check — a URL prober, a
reputation service — and cost a second walk of the tree, a plan type, a
resolution type and a way for the two walks to disagree about which props are
framable. If a deployment ever wants an asynchronous verdict, the honest shape
is a `FrameOriginRegistry` implementation that was populated asynchronously
before the request, which this interface already permits.

**Refusing at the props schema, so the node is omitted entirely.** 0053's
behaviour, and wrong here. An unregistered origin is a deployment configuration
fact, not a malformed tree: the same tree is correct on the deployment that
registered the origin and refused on the one that did not, and blanking the node
would make a page's structure a function of its host's allowlist. A refusal the
primitive renders is a page that says what happened.

**A boolean `frames: true`, with the runtime checking every string prop that
parses as a URL.** No declaration to drift, and it checks props that never reach
a frame — a `poster`, a `docsUrl`, a caption containing a link — refusing them
against a list that was never about them. A check that fires on things it does
not govern is a check people switch off.

**Treating a same-origin frame as a refusal.** Tempting, because it is the one
case where the primitive's sandbox is decoration. Rejected: a host that
registered its own origin and marked it `self` has said what it means, and a
seam that refuses what a deployment explicitly permitted is a seam that gets
worked around. The diagnostic is the honest answer — it makes the fact visible
to whoever can act on it without overruling them.
