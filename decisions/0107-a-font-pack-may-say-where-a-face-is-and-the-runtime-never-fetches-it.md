# 0107. A font pack may say where a face is, and the runtime never fetches it

**Status:** Accepted
**Date:** 2026-09-03
**Section:** §3

## Context

`Loom marketing` filed it on 29 August, from the surface that hit it:

> A `FontPack` carries `headingFamily` and `bodyFamily` as **CSS family stacks**
> — `'Geist', ui-sans-serif, …`. That is right for a browser, which already has
> the faces or is handed them by the host's own stylesheet. It is not enough for
> anything that draws text itself. An image renderer needs font *data*: it
> cannot look a family name up, so it falls back to whatever it ships with. The
> share card this run added therefore wears the address's **palette** exactly —
> every slot, three registered triples, measured — and its **typeface not at
> all**.

The gap is exact. A stack is an instruction to something that already has fonts.
It tells a resolver which of the faces it holds to prefer, and it is silent on
the only question a resolver without any faces has: where is one. Under
`editorial-serif`, whose whole character is Georgia, a card drawn outside a
browser renders in a grotesque and looks entirely deliberate while doing it.

[0085](0085-a-font-pack-declares-a-face-when-something-reads-it.md) settled which
roles a pack names — heading, body, and mono where the pack has an opinion — on
the rule that a variable no primitive consults is worse than an absent one. It
did not settle what a role's value *is*, because at the time there was only one
kind of reader and a stack was the whole answer for it.

There is a second reader now, and there was always going to be: an image
renderer, an email body, a PDF. The same run that filed this also filed that a
tree has one projection and a share card needs a second. Both are the same
underlying fact — the library's output has been shaped by the assumption that a
browser is on the other end.

## Decision

**A font pack may declare, beside each family stack, where the face is. The
value is an address, and the runtime never dereferences one.**

A `faces` array on a pack, each entry naming a family, a weight, a style and a
`source` — a URL, or a path the host knows how to resolve. It is optional, and
absent on every pack the starter library ships.

The second half is the load-bearing one. Nothing in `src/` fetches a face, opens
a socket, or reads a file because a pack named one. What the runtime does is
hand the declaration back: `declaredFaces`, `facesForRole`, and
`familiesWithoutSource` for the reader that wants to know what it is about to
substitute. A host that wants a browser to load the faces asks `fontFaceRules`
for the CSS and puts it in a `<style>`; a renderer that draws text itself
resolves the sources on its own, against its own allowlist.

## Consequences

**A browser is unaffected.** No new variable is emitted, `themeVariables` is
byte-for-byte what it was, and a pack with no `faces` behaves exactly as it did.
This is a seam a second kind of reader can use, not a change to the first.

**A render stays pure.** [0008](0008-the-renderer-is-a-total-pure-projection.md)'s
guarantee is that two requests for one revision cannot disagree about what the
page looks like. A runtime that fetched a face on the strength of a registered
pack would make a render depend on a third party's uptime and a network's
weather, and would do it inside the one function the whole system's determinism
rests on.

**A deployment keeps its say over what it talks to.** This is 0095's shape:
the tree names a URL, the deployment decides whether that origin is reachable.
A pack that could make the runtime fetch would be a registered document choosing
the deployment's egress, which is the thing 0095 refused for frames and 0053
refused for schemes.

**The starter library still makes no network call.** No pack it ships declares a
source, and `declaredFaces` being empty for all twenty is asserted rather than
described — the test fails the day somebody adds a CDN address. That property is
not decoration: this repository has met a blocked CDN fifteen times, and
`fonts.googleapis.com` is not on the sandbox egress allowlist today.

**The four packs whose descriptions say "the host must serve this" still say it
in prose.** The declaration does not replace that sentence, because the
distinction those descriptions draw — a webface a host must serve, against a
face a mainstream operating system already has — is a judgement about the world
and not something derivable from a stack. `familiesWithoutSource` answers a
different and narrower question, honestly: which families this pack asks for and
does not address. For a browser that is usually nothing to worry about. For a
renderer, every entry is a silent substitution waiting to happen.

**`family` and `source` are held to a narrow character class**, refusing quotes,
braces, semicolons and newlines. Both are interpolated into CSS by
`fontFaceRules`, and a family carrying a quote would be closing a declaration
rather than naming a font. Refused at the schema rather than escaped at the
writer, because a pack is registered once and rendered repeatedly.

## Alternatives considered

**Let the runtime fetch the face.** The obvious reading of "where the face is",
and it is what a caller would want if the runtime were a program rather than a
library. Rejected on the two grounds above and a third: it would need a cache, a
timeout, a failure mode, and an answer to what a render does while a face is in
flight — none of which the render path has, and all of which belong to whoever
is drawing.

**Put the source on the pack rather than per face.** One URL for a stylesheet
the host links, which is smaller and matches what `(marketing)` does today with
its `<link>`. Rejected because a stylesheet is a browser's answer and this exists
for readers that have no CSS engine. A renderer needs a face per weight, and a
pack naming 400 and 650 has to be able to address both.

**Derive "needs the host to serve it" from the stack.** Tempting, because four
packs already say it in English and prose is not checkable. Rejected as not
derivable: `'Helvetica Neue'` and `Fraunces` are indistinguishable to a parser
and completely different to a reader with a Mac. What is derivable is the
narrower question `familiesWithoutSource` asks, and it is named for what it
actually answers rather than for what would have been more useful.

**Wait for a consumer.** 0085's own rule is that a seam nothing reads is a
comment, and nothing reads this yet. Taken on anyway, and this is the weakest
part of the decision: the consumer is `(marketing)`'s share card, it is another
lane's file, and that lane recommended not touching it until it next opens the
file. The finding says exactly what the seam carries, so that run is short. If
it is never taken up, this is a schema field and three pure functions to delete.
