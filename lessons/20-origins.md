# 20 — Origins: whose document runs inside your page

**After this lesson you will be able to** say why the scheme allowlist that
contains a link and the registry that contains a form action both fail on a
frame, and give the reason as a property of what a frame *is* rather than as a
ranking of dangers; state which half of a frame's address stays in the tree and
which half does not, and defend the split with the test that decides it; explain
why this seam has no plan and no resolve step when the two before it did, and
name the property of an allowlist that buys that; say why the verdict has two
states where a submission has three; explain what `sandbox="allow-scripts
allow-same-origin"` protects a page from when the framed document comes from the
page's own origin, and what the system does about it; and say why a framable
prop is declared as a list of prop names by the primitive's author, what happens
when that declaration drifts, and the one drift nothing catches.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md), [09](09-the-gate.md),
[10](10-the-pipeline.md), [11](11-the-model-seam.md), [12](12-projection.md),
[13](13-refusal-and-repair.md), [14](14-rendering.md),
[15](15-primitives-and-the-registry.md), [16](16-persistence.md),
[17](17-telemetry.md), [18](18-data.md), [19](19-destinations.md).

Lesson 19 ended by handing you a pattern and telling you it was a shape rather
than a coincidence: **a name in the tree, an address in a registry, resolved
before the walk.** Two seams fit it. It was offered as the thing Part V might
turn out to be about.

This lesson is the third seam, and **it breaks two of those three clauses.** The
address stays in the tree. Nothing is resolved before the walk. Only the middle
clause survives, and it survives in a form that is not quite what you would
predict from the other two.

That is the lesson. Not the frame — the frame is the occasion. What you are
being asked to work out is which part of a pattern was load-bearing and which
part was two examples in a row.

---

## Warm-up

Closed book, five minutes, mixed across six lessons. Write something for all
five before you look anything up.

1. A form's address never appears in the tree. State the reason — the property
   of an address that decides it — and then say what a tree carries instead.
   *(19)*
2. A binding's `params` are AI-authored and a submission's declaration has none.
   Give the structural difference, phrased as a claim about what *varies* rather
   than about which is more dangerous. *(18, 19)*
3. Lesson 14's renderer is a total pure projection. Say what "total" forbids,
   and name where a fault goes when it cannot go up. *(14)*
4. A primitive declares `interactive: { whenProps: ["href"] }` rather than
   `interactive: true`. Give the concrete case that conditional form exists for,
   and say who is relying on the declaration being right. *(15)*
5. `renderRequest` is handed registries the tree does not contain. Name as many
   as you can from memory, and beside each one write who authors it. *(15, 18,
   19)*

Question 1 is the one this lesson argues with — not disagrees with, argues
with — so write your version of the reason carefully rather than the conclusion.
Question 5 is a counting question and the count is the point: if you stop at
three, notice that you stopped, and carry on to the Predict section anyway.

---

## Predict

**In writing, before reading on.** Four questions. The second is the one nobody
gets, and it is not a trick — it is a fact about browsers that most people who
have shipped an `iframe` have never had cause to learn.

1. Lesson 19 solved a dangerous URL by taking it out of the tree entirely: the
   host registers endpoints, the tree names one, and no address is ever
   AI-authored. **Apply that answer to embedded video.** A deployment has a
   marketing site with videos on it. Write down what goes in the registry and
   what goes in the tree. Then, underneath, write what happens on the day
   somebody in marketing uploads a new video — who does what, and how long it
   takes.

2. A page served from `https://app.example.com` renders

   ```html
   <iframe src="https://app.example.com/preview/42"
           sandbox="allow-scripts allow-same-origin"></iframe>
   ```

   The framed document is your own; you wrote it; it is on your own origin.
   **What does that `sandbox` attribute protect the framing page from?** Answer
   before reading on, and rate your confidence — this is the one to have a
   number against.

3. A submission's verdict has three states: `ready`, `unavailable`, and absent.
   A frame's verdict has fewer. **How many, and which of the submission's three
   has no equivalent here?** Give the reason from the shape of the two seams,
   not from a preference.

4. A primitive author writes `frames: ["src"]` to say which prop reaches the
   `iframe`. Six months later somebody renames the prop to `source`, updates the
   props schema, and does not touch the declaration. **What happens at render
   time?** Then the harder half: **compare that failure to the same mistake in
   `interactive: { whenProps: ["href"] }`** — which one is worse, and give the
   property that makes it worse rather than the consequence.

Do not read on until all four are written. Question 1 is the one this lesson
takes apart, and it takes apart an answer you were taught to give one lesson
ago — which is the point. An answer that was right about forms and wrong about
videos is more useful to you than an answer you never committed to.

---

## The problem

### The three checks you already have, and what each of them sees

By now you have met three ways this system handles a URL, and it is worth
putting them beside each other before adding a fourth.

A **link** carries an AI-authored URL, checked against a scheme allowlist
([0053](../decisions/0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md),
lesson 15). `javascript:` is refused; `https://` anything is accepted. That is
enough for an `href` because the worst outcome of a bad `https:` link is a
visitor who clicks it and is disappointed. They left. They can see they left.

A **form action** is not AI-authored at all (0065, lesson 19), because where a
visitor's data goes is not a content decision, and a scheme allowlist would pass
`https://collect.example.com/harvest` — which is a working `https:` URL and a
data breach.

A **frame** is a third thing, and it is not a harder version of either.

```html
<iframe src="https://collect.example.com/harvest"></iframe>
```

That URL passes the scheme allowlist. It has no visitor to mislead into clicking
anything. It is **a whole document, with a script host in it, running inside
your page, at an address a model chose.** Nobody navigated anywhere. There is no
moment at which a person could have noticed.

So the shape of the danger is different from both. A link's danger is that
somebody goes somewhere. A form's danger is that data leaves. A frame's danger
is that **code arrives** — and the check that contains a link cannot see it,
because the thing that makes it dangerous is not in the URL's *form*. It is in
who is on the other end, and `https:` says nothing at all about that.

### And the Gate cannot help

Work through it with lesson 07 and lesson 09 in hand. A proposal that sets a
video's URL is a `configure`. One node, one prop, no structural change,
perfectly reversible, no target nested inside another. Every axis the analysis
measures reads *small*, and every one of those readings is correct.

This is the same reasoning 0053 wrote down about `javascript:` and it lands in
the same place: the Gate weighs how big a change is, and this is a small change
with an unbounded consequence. Measurement is separated from judgment (lesson
07) and neither of them is a check on content.

### The half nobody finds on their own

Predict 2. Here is the answer, and if you rated yourself 4 or 5 and got it
wrong, this is the sentence to write down.

**Nothing. It protects the page from nothing at all.**

A `sandbox` containing both `allow-scripts` and `allow-same-origin` is a
boundary *only because the framed document is cross-origin*. Sandboxing normally
gives the framed document a unique opaque origin, which is what stops its
scripts reaching into the page that framed it; `allow-same-origin` gives that
back. Between two different origins, what it gives back is same-origin access to
*its own* origin, which is a normal and useful thing. Between an origin and
itself, it hands the framed document full access to the framing page. Scripts
allowed, same origin allowed, and the two together are the document you framed
being able to do anything your page can do.

That is a real property of a real platform, it is easy to ship, and here is the
part that matters for this course: **nothing in a render could previously tell.**
A renderer looking at `https://app.example.com/preview/42` sees a string. Whether
that string is "our own origin" is not a fact about the tree, or about the
primitive, or about the URL. It is a fact about the deployment — and until the
deployment had somewhere to say so, there was nowhere for the answer to live.

Hold onto that. It is the argument for the whole seam, and it arrives from a
direction nobody expects: not from keeping a bad origin out, but from being able
to *notice* a permitted one.

---

## The idea

### The URL stays in the tree. The origins go in the registry.

Here is the decision
([0095](../decisions/0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md)):

> A tree names a URL. A deployment names the origins it will frame. A primitive
> is told the verdict, and never the raw prop.

Compare that with lesson 19 and notice what moved. In the submission seam the
address is *gone* from the tree — a form names `contact.enquiry` and the URL
exists only in the host's registry. Here the URL is still in the props, still in
the delta, still in the log. What the deployment holds is not the address but
the **set of origins it is willing to run a document from**.

Predict 1 asked you to apply lesson 19's answer directly, and this is where it
fails. Work through the day-after: a registry of whole embed URLs means that
when somebody uploads a video, a human has to add its URL to a deployment
registry before it can go on a page. Which video belongs in a hero **is content
work** — it is exactly the kind of decision a model is on the page to make — and
a registry that holds whole URLs turns the deployment's allowlist into a content
table maintained by whoever runs the servers.

So the test that decides the split is not "is this value dangerous". Both
addresses are dangerous. The test is:

> **Does this value vary with the content, or with the deployment?**

*Which* video is a content decision, and it varies per page, per revision, per
proposal. *Whose* documents we are willing to run inside our own pages is a
deployment decision, it is the same on Tuesday as on Monday, and a host can say
it once and mean it forever.

That is why lesson 19's pattern breaks. It was never really "the address goes in
the registry". It was **the part that does not vary goes in the registry**, and
for a form's destination that happened to be the whole address. Two examples
agreeing is not a rule. This is the third, and it is the one that tells you
which clause was doing the work.

### There is no plan and no resolve step

The second broken clause: *resolved before the walk*.

Lesson 18's data seam and lesson 19's submission seam both run in three steps —
a pure plan over the tree, a step that may do IO, then a synchronous render.
Both need that shape for the same reason. A binding is answered by a host's
adapter, which may query anything; a submission target is minted per request,
which may reach a token store. Neither can happen inside a synchronous render,
because the renderer is a total pure projection
([0008](../decisions/0008-the-renderer-is-a-total-pure-projection.md), lesson
14).

An allowlist does none of that. It is **a static host-authored list and a URL
parse**. There is nothing to await, nothing that varies per visitor, nothing
minted. So the check happens inside the walk, and there is no plan type, no
resolution type, no second pass, and no way for two passes to disagree about
which props are framable.

This is worth being uncomfortable about for a moment, because symmetry is
seductive and this is the place to notice that it costs something. Building the
plan-and-resolve shape here would have bought a place to put an asynchronous
check later — a URL prober, a reputation service — and cost a second walk of the
tree and two more types. The record's answer is that a deployment wanting an
asynchronous verdict should populate a `FrameOriginRegistry` asynchronously
*before* the request, which the interface already permits. The seam stays
synchronous; the population of it need not be.

### Two states, and there is no third

A submission has three: `ready`, `unavailable`, and absent — where absent means
the tree never declared a destination at all, which is an authoring gap and a
genuinely different fault from a deployment that could not answer right now.

A frame has two: `allowed` and `refused`.

The reason is structural rather than a preference, and it falls straight out of
the first decision. **The URL is in the props.** A node either carries one or it
does not, and a node that does not carry one is not a frame with a missing
address — it is a primitive rendering no frame. There is nothing for the seam to
distinguish and nothing for a primitive to behave differently about. Either this
URL may be framed or it may not, and when it may not, the refusal says which of
three reasons applies.

Notice the direction of that argument: it is the *first* decision that produces
the *second*. Keeping the URL in the tree is what removes the third state. Two
seams that rhyme diverge in more places than the one you were shown.

### The seam fails closed

A render given no origin registry refuses every frame.

The reasoning is the same as the submission seam's and worth stating in its own
terms: **the registry is the allowlist.** A deployment that has not written one
has not agreed to run anybody's script inside its pages. A default of "frame it"
would make the whole seam a formality that every host has to remember to switch
on — and the hosts who forget are exactly the hosts the seam exists for.

There is a nice detail in *how* it fails closed, which Exercise C shows. The
scheme is checked **before** the registry is consulted, so a `javascript:` src is
refused as `unframeable` even on a deployment that wired no allowlist, rather
than being lumped in with the ordinary video that nobody has permitted yet. Same
outcome, very different faults, and the diagnostic tells them apart.

### `self` is a diagnostic for something that worked

Now the payoff for Predict 2.

An origin may be registered with `self: true`, meaning it is the deployment's
own. It changes **nothing** about whether the frame is allowed — a host that
registered its own origin meant to — and everything about what the frame is
worth. The outcome carries `sameOrigin: true`, and the render raises a
`frame-same-origin` diagnostic.

That diagnostic is the only one in the renderer **raised for something that
worked.** Every other diagnostic in the system reports a thing that did not
happen: a node refused, a prop rejected, a target unavailable. This one reports a
frame that rendered perfectly, to say that its sandbox is inert.

Two things about that are worth arguing with, because both could have gone the
other way.

**Why not refuse it?** Tempting — it is the one case where the primitive's
sandbox is decoration. Rejected because a host that registered its own origin
and marked it `self` has said what it means, and a seam that refuses what a
deployment explicitly permitted is a seam that gets worked around. Note the
shape of that argument: it is not "same-origin framing is fine". It is that
overruling an explicit decision buys less than making it visible does.

**Why say anything at all, if it is permitted?** Because this is the one place in
the system that *can*. The primitive cannot know; the tree cannot know; the URL
does not say. Only the deployment knows what "own" means for this deployment,
and the moment it has written that down, staying quiet about a sandbox that
grants nothing would be the system knowing something and not saying it.
Noticing silently is the same as not noticing.

### The declaration is a list of prop names, and it fails open

Which props reach a frame is declared by the primitive's **author**:
`frames: ["src"]` on `definePrimitive`.

A list of prop names rather than a boolean, because the runtime cannot work it
out. A `src` reaching an `iframe` and a `src` reaching an `img` are the same JSON
string. Nothing about the value distinguishes them and nothing about the schema
does either; the only party who knows is whoever wrote the component.

Now Predict 4. The declaration can drift — someone renames the prop and forgets
it — and here is the property that makes this different from every other drifting
declaration you have met:

**It fails open.**

A drifted `interactive: { whenProps }` makes the Gate refuse a change it should
have allowed, or allow one it should have refused; that is bad and it is *loud*
in one direction. A drifted `frames` declaration means the origin allowlist
stops applying to a URL that still reaches an `iframe`. The frame renders. The
page looks right. Nothing is refused, no diagnostic is raised, and the check
that this whole lesson is about has silently stopped running.

So the registry refuses a declaration naming a prop the schema does not declare,
at registration, before any page renders. Exercise E shows the refusal.

Exercise E also shows the limit, and this is the honest part. The registry
catches a declaration that names the *wrong* prop. It cannot catch one that was
**deleted** — `frames: []` registers happily and checks nothing — and 0095 says
plainly that it cannot catch a primitive that puts a URL in an `iframe` and never
declared it at all, because a frame built from an undeclared prop looks exactly
like one built from a declared prop to anything that calls the component.
Catching that needs a lint over the markup, not a probe.

### An origin is scheme, host and port, and nothing else

Two smaller decisions, both of which exist to stop a check from being weaker
than it looks.

**A path is refused rather than ignored.** `https://example.com/embed` reads like
an allowlist scoped to a directory. An origin check cannot scope to one — the
browser's notion of origin has no path in it — so a registry that accepted the
string and ignored the path would permit `https://example.com/anything` while
appearing to permit one folder. An allowlist that silently permits more than it
appears to is worse than no allowlist, because somebody is relying on it.
Credentials are refused for the same reason: `new URL` drops them from `origin`
without complaining.

**The URL handed to the primitive is normalised, not echoed.** What the browser
resolves has to be the string the allowlist checked. Echoing the prop back
verbatim would make the check advisory — the seam would have matched one string
and the browser would resolve another. Exercise B has a case where the difference
is visible, and it is the exercise most worth predicting carefully.

---

## In the code

| Where | What is there |
| --- | --- |
| `src/frame/origin.ts` | `frameOriginSchema`, `createFrameOriginRegistry`, `FrameOriginDefinition` and its `self` flag |
| `src/frame/resolution.ts` | `resolveFrame`, `FrameOutcome`, `FrameRefusal` — the whole check |
| `src/frame/catalogue.ts` | `frameCatalogue` — what a model is told |
| `src/render/frame.ts` | `resolveNodeFrames`, and the `FrameResolver` the registry satisfies |
| `src/render/diagnostics.ts` | `frame-refused` and `frame-same-origin` |
| `src/sdk/definition.ts` | the `frames` field on `definePrimitive` |
| `src/sdk/registry.ts` | `undeclared-frame-prop`, refused at registration |
| `src/primitives/loom.embed.ts` | the one primitive that declares a framable prop |

`src/frame/` imports nothing from `render/` and reaches no network — the whole
seam is a URL parse against a list somebody wrote down, which is exactly what
lets it happen inside a render. Compare that with the note lesson 19 made about
`src/submit/` being independent of the renderer: both are independent, and for
opposite reasons. `src/submit/` is independent because it runs *before* a render.
`src/frame/` is independent because it is small enough to run *during* one.

One thing worth reading in `loom.embed.ts` beyond the seam: its props schema
still holds `src` to `mediaUrlSchema`, which is 0053's scheme allowlist. **The
scheme check did not go away and was not replaced.** It stopped being
sufficient, which is not the same thing, and the two checks now sit in series —
the schema refuses a malformed prop, and the seam refuses a well-formed URL from
an origin nobody permitted.

---

## Try it

Six exercises. **Predict every output in writing, then run.** Exercises B and E
have answers most readers get wrong, in two different ways: B because a string
comes back changed, and E because the third case is not the one you expect to
pass.

Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

The shared preamble for all six:

```ts
import { describe, it } from "vitest"
import { z } from "zod"

import {
  createFrameOriginRegistry,
  describeFrameOriginRegistryError,
  describeFrameRefusal,
  frameCatalogue,
  resolveFrame,
  type FrameOriginDefinition,
  type FrameOriginRegistry,
} from "./frame/index.js"
import { resolveNodeFrames } from "./render/frame.js"
import { definePrimitive } from "./sdk/definition.js"
import { createPrimitiveRegistry, describeRegistryError } from "./sdk/registry.js"

/** A deployment's allowlist, or a loud failure — the exercises never wire a broken one. */
const originsOf = (...definitions: readonly FrameOriginDefinition[]): FrameOriginRegistry => {
  const built = createFrameOriginRegistry(definitions)
  if (!built.ok) throw new Error(describeFrameOriginRegistryError(built.error))

  return built.value
}

/** Two origins: somebody else's, and this deployment's own. */
const deployment = (): FrameOriginRegistry =>
  originsOf(
    { origin: "https://player.vimeo.com", description: "Vimeo player embeds" },
    { origin: "https://app.example.com", description: "our own previews", self: true }
  )

/** A primitive that puts one of its props in an `iframe`, or says it does. */
const embed = (frames: readonly string[]) =>
  definePrimitive({
    type: "loom.embed",
    description: "puts somebody else's document in the page",
    props: z.object({ src: z.string(), title: z.string().optional() }),
    frames,
    component: () => null,
  })
```

### Exercise A — an origin, and nothing but an origin

```ts
describe("A", () => {
  it("registers an origin and nothing but an origin", () => {
    const attempts: readonly string[] = [
      "https://player.vimeo.com",
      "HTTPS://Player.Vimeo.com:443/",
      "https://example.com/embed",
      "https://user:secret@example.com",
      "javascript:alert(1)",
      "player.vimeo.com",
    ]

    for (const value of attempts) {
      const built = createFrameOriginRegistry([{ origin: value, description: "one line" }])
      console.log(
        built.ok
          ? `  registered ${JSON.stringify(value)}\n               as ${built.value.origins[0]?.origin}`
          : `  refused    ${JSON.stringify(value)}\n               ${describeFrameOriginRegistryError(built.error)}`
      )
    }
  })
})
```

Predict: which two are registered, and — the part that separates the answers —
**what the second one is registered as.**

The output:

```
  registered "https://player.vimeo.com"
               as https://player.vimeo.com
  registered "HTTPS://Player.Vimeo.com:443/"
               as https://player.vimeo.com
  refused    "https://example.com/embed"
               "https://example.com/embed" is not a framable origin — must be an origin and nothing else — no path, query or fragment
  refused    "https://user:secret@example.com"
               "https://user:secret@example.com" is not a framable origin — must carry no credentials
  refused    "javascript:alert(1)"
               "javascript:alert(1)" is not a framable origin — must be an http(s) origin; "javascript:" is not one
  refused    "player.vimeo.com"
               "player.vimeo.com" is not a framable origin — must be an absolute http(s) origin, like "https://player.vimeo.com"
```

The second registration is the one to look at. `HTTPS://Player.Vimeo.com:443/`
and `https://player.vimeo.com` are **the same registration**, because the
comparison is normalised through `URL` rather than done as text: the scheme and
host are lowercased, the default port for `https:` is dropped, and the trailing
slash is not part of an origin. Two hosts writing the same origin two ways get
one entry and not two silently different ones.

The four refusals are four different messages, which is the thing to notice
about the error type rather than the messages themselves. All four are the same
`code` — `invalid-frame-origin` — and the useful half is the `detail`. A
deployment that mistypes its allowlist finds out at startup, in a sentence.

### Exercise B — the verdict, and what comes back

```ts
describe("B", () => {
  it("holds a URL against the list", () => {
    const origins = deployment()

    const declared: readonly unknown[] = [
      "https://player.vimeo.com/video/76979871?h=8272103f6e",
      "HTTPS://PLAYER.VIMEO.COM:443/video/76979871",
      "https://app.example.com/preview/42",
      "https://collect.example.com/harvest",
      "javascript:fetch('https://evil.example',{method:'POST'})",
      "/embed/local",
      42,
    ]

    for (const value of declared) {
      const outcome = resolveFrame(value as never, origins)
      console.log(
        outcome.status === "allowed"
          ? `  allowed ${JSON.stringify(value)}\n            src="${outcome.url}"  sameOrigin: ${outcome.sameOrigin}`
          : `  refused ${JSON.stringify(value)}\n            ${outcome.refusal.reason} — ${describeFrameRefusal(outcome.refusal)}`
      )
    }
  })
})
```

Predict all seven, and for each **allowed** one write down the exact string you
expect in `src=`. That second part is the exercise; predicting allowed-or-refused
is the easy half.

The output:

```
  allowed "https://player.vimeo.com/video/76979871?h=8272103f6e"
            src="https://player.vimeo.com/video/76979871?h=8272103f6e"  sameOrigin: false
  allowed "HTTPS://PLAYER.VIMEO.COM:443/video/76979871"
            src="https://player.vimeo.com/video/76979871"  sameOrigin: false
  allowed "https://app.example.com/preview/42"
            src="https://app.example.com/preview/42"  sameOrigin: true
  refused "https://collect.example.com/harvest"
            unlisted-origin — no registered origin covers it — "https://collect.example.com" is not registered
  refused "javascript:fetch('https://evil.example',{method:'POST'})"
            unframeable — it is not an absolute http(s) URL — "javascript:" is not an http(s) scheme
  refused "/embed/local"
            unframeable — it is not an absolute http(s) URL — "/embed/local" does not parse as a URL
  refused 42
            unframeable — it is not an absolute http(s) URL — got number
```

**The second URL came back changed.** The tree said
`HTTPS://PLAYER.VIMEO.COM:443/video/76979871` and the `src` the primitive places
is `https://player.vimeo.com/video/76979871`. That is normalisation, and it is
the difference between a check and a suggestion: if the primitive echoed the
prop, the seam would have matched one string and the browser would have resolved
another, and every gap between those two is somewhere for a mismatch to live.

**Now put `/embed/local` beside lesson 19.** A same-origin path is exactly what
a form action is *allowed* to be — `isSameOriginPath` in `src/submit/endpoint.ts`
accepts `/api/contact`, and lesson 19's Exercise C was built on it. Here the same
shape of string is refused. That is not an inconsistency, and working out why is
the best thirty seconds in this lesson: a form action is resolved by the browser
against the page it is on, and posting to your own origin is an ordinary thing to
want. A frame has to be checked against an allowlist of origins **before** the
browser resolves anything, and a relative path has no origin to check yet. The
seam cannot know what `/embed/local` will become, so it refuses to guess.

The last two are the total-function discipline from lesson 14. A prop that is a
number, or missing, is refused with a reason. Nothing throws, and a page is not
lost because a proposal put an integer where a URL goes.

### Exercise C — a deployment that registered nothing

```ts
describe("C", () => {
  it("frames nothing when nobody said whose documents it runs", () => {
    for (const value of [
      "https://player.vimeo.com/video/76979871",
      "https://collect.example.com/harvest",
      "javascript:alert(1)",
    ]) {
      const outcome = resolveFrame(value, undefined)
      if (outcome.status === "refused") {
        console.log(`  ${outcome.refusal.reason.padEnd(15)} ${value}`)
      }
    }
  })
})
```

Predict: all three are refused. **Say which reason each is given**, and if you
think all three are the same reason, commit to that in writing.

The output:

```
  no-registry     https://player.vimeo.com/video/76979871
  no-registry     https://collect.example.com/harvest
  unframeable     javascript:alert(1)
```

The `javascript:` one is different, and the ordering in the code is what makes
it so: the scheme is checked before the registry is consulted. So a deployment
that has simply not wired an allowlist yet is told "you have not decided whose
documents you run" about its perfectly ordinary Vimeo URL, and is told something
else entirely about the `javascript:` one. Same outcome — nothing is framed —
and two faults that want completely different fixes. One is a deployment
configuration gap; the other is a proposal that should never have got this far.

### Exercise D — what the node answers, and what it reports

```ts
describe("D", () => {
  it("answers for every declared prop the node carries, and reports each one", () => {
    const origins = deployment()

    const nodes: readonly (readonly [string, Record<string, unknown>])[] = [
      ["a vimeo video", { src: "https://player.vimeo.com/video/76979871", title: "Demo" }],
      ["our own preview", { src: "https://app.example.com/preview/42" }],
      ["somebody else's", { src: "https://collect.example.com/harvest" }],
      ["no src at all", { title: "Demo" }],
    ]

    for (const [note, props] of nodes) {
      const reported: string[] = []
      const frames = resolveNodeFrames(props as never, ["src"], origins, (prop, outcome) => {
        reported.push(
          outcome.status === "allowed"
            ? `${prop}: allowed${outcome.sameOrigin ? ", sameOrigin" : ""}`
            : `${prop}: refused, ${outcome.refusal.reason}`
        )
      })

      console.log(
        `  ${note.padEnd(16)} loom.frames: [${Object.keys(frames).join(", ")}]   reported: [${reported.join(", ")}]`
      )
    }
  })
})
```

Predict the four rows. The interesting one is the second — **does an allowed
frame get reported?** — and the fourth, which is about a declared prop the node
does not carry.

The output:

```
  a vimeo video    loom.frames: [src]   reported: [src: allowed]
  our own preview  loom.frames: [src]   reported: [src: allowed, sameOrigin]
  somebody else's  loom.frames: [src]   reported: [src: refused, unlisted-origin]
  no src at all    loom.frames: []   reported: []
```

Row two is the whole of the `self` argument in one line of output. That frame is
**allowed**. It renders. It is exactly what the deployment asked for — and it is
reported anyway, which is what becomes the `frame-same-origin` diagnostic. Every
other report on this list is about something that did not happen; this one is
about something that did.

Row four is the distinction between "no frame" and "a refused frame". `src` is
declared framable and the node does not carry it, so there is no entry at all —
not an entry containing a refusal. An optional `src` left out is a primitive
rendering no frame, which is not a fault and has nothing to report. The absence
is the answer.

### Exercise E — a declaration that has drifted

```ts
describe("E", () => {
  it("refuses a declaration naming a prop the schema does not have", () => {
    for (const declared of [["src"], ["source"], []]) {
      const built = createPrimitiveRegistry([embed(declared)])
      console.log(
        built.ok
          ? `  frames: ${JSON.stringify(declared).padEnd(10)} registered — framePropsFor("loom.embed") is ${JSON.stringify(built.value.framePropsFor("loom.embed" as never))}`
          : `  frames: ${JSON.stringify(declared).padEnd(10)} ${built.error.code}\n       ${describeRegistryError(built.error)}`
      )
    }
  })
})
```

Predict all three. The third is the one to think about longest: the schema still
declares `src`, the component still puts it in an `iframe`, and the declaration
is empty.

The output:

```
  frames: ["src"]    registered — framePropsFor("loom.embed") is ["src"]
  frames: ["source"] undeclared-frame-prop
       "loom.embed" says it frames "source", which its props schema does not declare; the seam would then check nothing and the frame would render whatever the tree said
  frames: []         registered — framePropsFor("loom.embed") is []
```

The second case is the guard rail working, and the message says exactly why it
exists: *the seam would then check nothing.* A declaration pointing at a prop
that does not exist is not a typo to be tolerated, because the failure it causes
is invisible.

**The third case is the limit, and it registers happily.** An empty declaration
is a legitimate thing for almost every primitive in the library to say — nearly
all of them frame nothing — so there is no way to distinguish "frames nothing"
from "used to say it framed `src` and somebody deleted the line." The registry
can check a declaration against a schema. It cannot check a declaration against a
component's markup, and 0095 says so in its own consequences: catching that needs
a lint, not a probe.

Sit with that rather than filing it away. The guard rail catches the drift that
leaves evidence and misses the drift that removes it, and the seam that fails
open is the one where that asymmetry matters most.

### Exercise F — what the model is told

```ts
describe("F", () => {
  it("tells a model whose documents this deployment will frame", () => {
    console.log(JSON.stringify(frameCatalogue(deployment()), undefined, 2))
  })
})
```

Predict the JSON exactly — every key, for both entries. The registry above has
three fields per origin.

The output:

```
[
  {
    "origin": "https://player.vimeo.com",
    "description": "Vimeo player embeds"
  },
  {
    "origin": "https://app.example.com",
    "description": "our own previews"
  }
]
```

**`self` is not projected**, and the reason is lesson 12's whole argument
arriving in a new place. A projection contains what the model needs to do its
job. Whether an origin is the deployment's own changes what a frame is *worth*
to whoever runs the deployment, and changes nothing whatsoever about which video
belongs on the page. Putting it in the catalogue would be handing a model a fact
about the deployment's internals that it has no decision to make with.

And notice what this catalogue is *for*, which is different from the endpoint
catalogue in lesson 19. An endpoint catalogue is the complete list of things a
model may name, because an address never appears in a tree at all. This one is
not a complete list of anything — a model can write any URL it likes into a
`src`. It is the difference between proposing a video that renders and proposing
one that renders a refusal, which is the difference between a good page and a
wasted turn.

---

## It could have been otherwise

Five, and the first is the one you probably wrote for Predict 1.

**A registry of whole embed URLs, exactly like the endpoint registry.** The
closest thing to no new thinking at all, and it fails on the first page.
Discussed above: it makes a deployment's allowlist a content table, and it makes
a human the bottleneck on every video anybody uploads.

**An allowlist in the primitive's props schema.** The cheapest thing that
compiles. A primitive carrying its own list is a primitive every host has to
fork — and it puts the list in the *library* rather than in the *deployment*, so
two deployments of the same library cannot disagree about who they trust. That
is the one thing they most need to be able to disagree about.

**Resolving frames before the walk, like data and submissions.** Symmetry for
its own sake. It buys a place to put an asynchronous check and costs a second
walk, a plan type, a resolution type, and a way for two passes to disagree about
which props are framable. The honest shape for an asynchronous verdict is a
registry that was populated asynchronously before the request, which this
interface already permits.

**Refusing at the props schema, so the node is omitted entirely.** This is
0053's behaviour, and it is wrong here — which is worth more than the other four
put together, because it is the same mechanism giving a different answer in a
different place. An unregistered origin is a **deployment configuration fact**,
not a malformed tree. The same tree is correct on the deployment that registered
the origin and refused on the one that did not, so blanking the node would make
a page's *structure* a function of its host's allowlist. A refusal the primitive
renders is a page that says what happened; a node quietly removed is a page with
a hole in it and no explanation.

**A boolean `frames: true`, with the runtime checking every string prop that
parses as a URL.** No declaration to drift, which sounds like it solves Predict
4 outright. It checks props that never reach a frame — a `poster`, a `docsUrl`,
a caption with a link in it — refusing them against a list that was never about
them. A check that fires on things it does not govern is a check people switch
off, and a switched-off check is worse than a drifting one.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections while
you write. Then compare.

1. **Derive this lesson from lessons 18 and 19, and then say what the
   derivation got wrong.** All three seams hold a value a model should not
   freely choose. Write the paragraph that makes them one idea. Then take the
   pattern lesson 19 gave you — *a name in the tree, an address in a registry,
   resolved before the walk* — and rewrite it as a sentence that is true of all
   three. You are looking for a formulation where the frame is not an exception
   but an instance; if your version needs the word "except", keep going.

2. **Say what the `frame-same-origin` diagnostic is an instance of.** It reports
   something that succeeded, which nothing else in the renderer does. Write one
   paragraph on what class of thing that is — then find one *other* place in
   this course where the system reports a fact about a thing that worked, and
   say what the two have in common. There is at least one, and it is not in Part
   V.

Predict, before writing (1): if your unified sentence is about keeping dangerous
values away from the model, you have written the motivation rather than the
rule. All three seams do that. The rule has to explain why one of the three
leaves the dangerous value in the tree.

---

## Self-check

Six questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. A scheme allowlist is enough for an `href` and not for an `iframe src`. Give
   the difference as a property of what arrives, not as a ranking of how bad
   each one is. Then say why the Gate cannot make up the difference, using the
   axes from lesson 07.
2. State the test that decides which half of a frame's address lives in the tree
   and which half lives in the registry. Then apply it to a case this lesson did
   not cover: a deployment wants to control which *aspect ratios* an embed may
   use. Tree or registry, and why?
3. This seam has no plan and no resolve step where the two before it do. Name
   the property of an allowlist that buys that, and then name what the system
   gives up for it and what the record says a deployment should do if it needs
   the thing given up.
4. A submission has three states and a frame has two. Name the missing one and
   give the reason — and phrase it as a consequence of an earlier decision in
   this same seam rather than as a fact about frames in general.
5. Explain what `sandbox="allow-scripts allow-same-origin"` protects a page from
   when the framed document is on the page's own origin. Then answer both halves
   of the design question: why is it permitted rather than refused, and why is
   it reported rather than left alone?
6. A `frames` declaration fails open when it drifts. Say what "fails open" means
   here concretely — what renders, and what is not raised. Name what the registry
   catches, name the drift it cannot catch, and say why that second one needs a
   different kind of tool than everything else in this system uses.

Question 2 is the one this lesson is really about. Question 6 is the one to be
least satisfied with a short answer to.

---

## Reflect

Write for two minutes, then move on.

- Predict 2 is the one to look at first. If you rated it 4 or 5 and were wrong,
  write down what you *thought* `allow-same-origin` did, because that belief has
  probably been load-bearing somewhere else. If you rated it 1 or 2 and were
  right, that is worth noticing too — this is a case where low confidence was
  well calibrated and the honest answer was "I have never had to know."
- Predict 1 asked you to apply the previous lesson's answer, and the previous
  lesson's answer was wrong here. Look at what you wrote. Did the failure show
  up in your registry design, or only when you worked through the day somebody
  uploads a video? If it was the second, that is the useful observation: the
  design looked fine and the *operations* were what broke it.
- Lesson 19 offered a pattern and this lesson broke two of its three clauses.
  Write down how you now decide whether a pattern in this course is a rule or a
  coincidence — concretely, as something you could do rather than a disposition
  to be careful. Then find one *other* pattern you have been carrying since Part
  II, and say what would falsify it.
- 0095 lists a consequence saying no primitive in the library uses the seam
  yet — and by the time you read this, one does. Say what that means about how
  to read a Consequences section, and which parts of a decision record you
  should expect to age.

---

## Come back to this

Set Y in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 05, 07, 12, 14, 15, 18 and 19 — the widest set in the course so
far, and deliberately so: three seams now rhyme, and telling three things apart
is a different skill from telling two apart.

Part V has three lessons and the shape it seemed to have after two turned out to
be a shape with a load-bearing clause and two coincidences. That is not a failed
pattern; it is what a pattern looks like before the third example, and it is the
reason the third example is worth writing down. Whether there is a fourth is
still open, and the honest thing to say is that the next one — if there is one —
will be found the same way this one was: by trying to apply the pattern and
watching where it does not fit.
