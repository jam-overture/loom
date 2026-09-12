# 0135. A same-origin frame is granted what its own document needs

**Status:** Accepted — it changes no schema, no tree and no delta model, and
reverses nothing another record decided. It is
[0095](0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md)'s
`self` flag being *acted on* for the first time, which that record's own
definition of the flag asks for in as many words.

It is nevertheless a **security surface**, so the reasoning is written out at
length and the section on what would reverse it is not decoration.

**Date:** 2026-09-12
**Section:** §4d
**Numbered 0135** with 0131–0134 left as holes, for the reason
[0120](0120-a-starting-composition-is-a-subtree-a-catalogue-hands-to-the-ordinary-seam.md)
gives: thirty-odd branches are open, a number clash is fatal to every lane's
`pnpm verify`, and a hole costs one line in the index.

## Context

`loom.embed` sets one sandbox, as a module constant:

```
allow-scripts allow-same-origin allow-presentation
```

That is the right sandbox for the thing the primitive was ported to carry — a
product video, a map, a prototype on someone else's origin — and the file's doc
comment names the omissions deliberately: *no form submission, no pointer lock,
no downloads, and no top-level navigation.*

`Loom marketing` filed on 4 September that it makes §4d impossible. The plan
says the marketing site **embeds the demo rather than describing it**, and that
this is the whole reason the demo is public at all
([0056](0056-the-demo-is-public-and-shares-nothing-but-the-deployment.md)). That
band was built. It rendered. The origin was allowlisted and the seam permitted
it. And every control in `/demo` is a server action reached through a
`<form action={…}>`, so:

```
Blocked form submission to '' because the form's frame is sandboxed
and the 'allow-forms' permission is not set.
```

A visitor got the demo rendered perfectly, pressed the large green button, and
**nothing happened, silently.** On a site whose entire argument is that it can
always tell you what happened, that is materially worse than the link it would
have replaced, so the band was withdrawn rather than shipped.

## Decision

**A frame the deployment's own registry resolved as `self` is granted
`allow-forms`. Every other frame gets exactly the sandbox it gets today.**

```ts
const SANDBOX = "allow-scripts allow-same-origin allow-presentation"
const SAME_ORIGIN_SANDBOX = `${SANDBOX} allow-forms`
```

The second is built from the first, so the base set stays the single place the
sandbox is stated and the two cannot drift apart in a later edit.

## Why this is not the widening it looks like

The decisive point is that **for a same-origin frame the sandbox is already not
a boundary**, and `loom.embed`'s own doc comment has said so since 26 August:

> `allow-scripts` with `allow-same-origin` is a boundary only because the framed
> document is cross-origin, and a host framing its own origin gets nothing from
> it.

`allow-same-origin` beside `allow-scripts` hands the framed document its real
origin. From there it can reach `parent.document`, the deployment's cookies, and
its storage. A document holding all of that can already issue the identical
request with `fetch`, and always could — `allow-forms` gates the `<form>`
element, not the network.

So withholding it buys **no security whatsoever**. What it buys is a button that
does nothing. This is therefore better read as the removal of an inconsistency
in the sandbox than as a grant added to it.

The alternative — dropping `allow-same-origin` instead, to make the sandbox a
real boundary again — is worse and is not taken: it would give the document a
null origin and break the embed a host deliberately registered.

## What bounds it, and why that is enough

Three things, and the first is the one that matters:

**Nothing in the tree can ask for it.** There is no prop, and there is
deliberately not one. The only route to `allow-forms` is a deployment's frame
registry having declared the origin `self` — a host decision, in code a
maintainer wrote, never a value a model can put in a proposal. An explicit prop
was considered and rejected for exactly this: a prop a model can set would have
to be gated on `sameOrigin` anyway to be safe, at which point it does nothing
the flag does not already do, except give a proposal a lever to pull.

**A deployment that registered no origin of its own is untouched, byte for
byte.** The default path through this code is unchanged, which is what keeps
every existing tree and every existing test rendering what it rendered before.

**`allow-top-navigation` stays withheld from every frame, this one included.**
That is the grant that turns an embedded document into a redirect, and a framed
application has no business moving the page it sits on. So do `allow-popups`,
`allow-downloads` and `allow-modals`. The library test asserts their absence
over *every* rendered frame rather than over the one that happened to be in the
fixture, so widening the constant instead of the case fails a test.

## Consequences

- **§4d is unblocked.** The marketing front door can frame `/demo` and the
  controls in it work. That is the surface the demo is judged on, and it has
  been pointing at a link instead.
- **`self` is now load-bearing rather than advisory.** Before this it changed a
  diagnostic; now it changes what a document may do. A host that registers its
  own origin is making a larger statement than it was, and `origin.ts`'s comment
  on the flag — which already said the flag "changes everything about what the
  frame is worth" — is now literally true.
- **The next capability a framed application needs should be argued here rather
  than added beside it.** The shape of the argument is the one above: name what
  `allow-same-origin` has already conceded, and show the grant adds nothing on
  top of it. A capability that fails that test is a different decision.

## What would reverse this

One thing, and it is worth watching for: **a deployment registering an origin as
`self` that is not actually its own.** The flag means "this origin is mine", and
the whole argument above rests on that being true — on the framed document
already having the access `allow-same-origin` gave it. A host that marked a
partner's CDN `self` because it looked convenient would be handing that partner
a capability, and would have been handing it the page anyway.

If that turns out to be a mistake hosts make, the answer is not to withdraw this
grant; it is for the registry to stop taking `self` on trust — comparing it
against an origin the deployment states once, rather than per-registration.
