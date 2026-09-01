# 18 — The write seam: a tree names a destination and never carries one

**After this lesson you will be able to** say why a scheme allowlist is the
wrong tool for a form's `action` and what replaced it; state the one asymmetry
between the read seam and the write seam and derive it from what each one
costs when it goes wrong; name the three states a form can be in and say why
there is deliberately no fourth; say why this seam's parse is strict when
almost every other parse of stored JSON is not, and what a form that smuggled
an address actually gets; and say what a registry audit can check about a
component that a declaration on its own never could.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [07](07-measuring-a-change.md),
[09](09-the-gate.md), [10](10-the-pipeline.md), [12](12-projection.md),
[14](14-rendering.md), [15](15-primitives-and-the-registry.md),
[16](16-persistence.md). The ones this lesson leans on hardest are 12, 14 and
15.

Everything in Parts I–IV was about a page that *shows* something. A tree was
built, judged, stored and rendered, and the worst thing a bad change could do
was look wrong — which is bad, and is recoverable, and is what undo is for.

This lesson is the first one where a change can do something that is not
recoverable, because the thing at the other end of it is a stranger's name and
email address. That difference turns out to change the design in one specific
place, and the interesting part is *which* place: almost all of the write seam
is copied from the read seam you already know, and there is exactly one thing
it refuses to copy.

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. Lesson 12 defined a projection in one sentence. Give the sentence, then apply
   it to the catalogue of primitives: source of truth, what is thrown away, and
   who is protected by the throwing-away. *(12, 15)*
2. Lesson 15 said a registration is a set of claims, and that each one is acted
   on somewhere else. Name two of those claims and the different consumer that
   acts on each. Then say what a single render of a component is allowed to
   prove, and name one claim no render can prove at all. *(15)*
3. `renderLoomTree` is synchronous and does no IO. Name two things that
   consequence has already forced to happen somewhere else, and say what would
   have been given up if the walk had been allowed one `await`. *(14)*
4. Lesson 05 says the clock is injected rather than called. State the general
   rule that follows from, in a form that does not mention time — then say
   whether "mint a CSRF token" obeys it. *(05)*
5. A model may not name the nodes it inserts, and may not compose a URL out of
   parts. Both are the same rule about the same thing. Say what the thing is.
   *(04, 12)*

---

## Predict

In writing, before reading on.

> 1. Every URL a model writes into a tree is already checked against a scheme
>    allowlist, so `javascript:` cannot get into an `href`. A model is now asked
>    to put a contact form on a page, and a form needs an `action`. Write down
>    whether the allowlist that is good enough for an `href` is good enough
>    here. If it is not, write the single example that breaks it. **Rate your
>    confidence 1–5 before you check.**
>
> 2. The read seam lets a model write params into a binding — `{ "limit": 6 }` —
>    guarded by a schema the source declares. The write seam accepts an endpoint
>    id and *nothing else*: no params, no options, no fields. Argue for letting
>    the write seam have params too, as well as you can, and then say what the
>    counter-argument is. Then the harder half: a deployment with twenty mailing
>    lists has to register twenty endpoints. Say whether that is a cost of the
>    decision or a feature of it. **Rate your confidence in the second half.**
>
> 3. A form's declaration in the tree is unreadable — somebody wrote
>    `{ "to": "contact.enquiry", "action": "https://collect.example.com/harvest" }`.
>    The parse refuses it. Write down what you think the form then renders as,
>    what the visitor is told, and what the operator is told. Three separate
>    answers, and at least one of them is not what you would design.

Predict 1 is the question the whole seam came out of, and it has a one-line
answer that most people do not write down because they are busy improving the
allowlist.

---

## The problem

A model is asked for a contact page. It writes a form: some fields, a submit
button, and — because that is what a form is — an `action` saying where the
contents go.

Everything about that sentence is ordinary except the last clause, and the last
clause is a change in kind. Up to now the worst an AI-authored prop could do was
render badly. Lesson 09's Gate weighs stakes and reversibility, and the whole
two-axis apparatus assumes the failure mode is *a page that is wrong*, which a
person notices and an inverse delta puts back.

An `action` is not that. A wrong `action` produces a page that looks completely
correct, works, and posts a visitor's name, email address and message to
somewhere nobody chose. Nothing is wrong on screen. Undo puts the page back and
does not put the data back. The first person to find out is whoever filled it
in, and they will not find out.

So: check the URL harder. Loom already does this. Every AI-authored URL in a
tree is held to a scheme allowlist, because otherwise a model writes
`javascript:` into an `href`. Apply the same allowlist here.

It does not help, and 0065 makes the point in one line:

> A scheme allowlist does not help. `https://collect.example.com/harvest` passes
> it.

That is the whole problem. A scheme allowlist answers "is this URL of a kind
that can execute code", and the question here is "is this URL somewhere this
deployment agreed to send a stranger's data" — which is not a property of the
string at all. There is no amount of validating a URL that answers it, because
the answer is not in the URL. It is in a decision somebody made, and the model
was not there when they made it.

Which is why 0065 does not ask the question you would expect it to:

> So the question is not "how do we validate a form action a model wrote". It is
> "how does a form get an action a model never wrote".

Stop and notice what happened there, because it is the transferable move in this
lesson and it is worth more than the seam it produced. The first question has no
good answer and a great deal of work available in it — allowlists of hosts, path
patterns, review queues, an approval step. All of that work is spent making a
dangerous thing safer. The second question deletes the dangerous thing.

---

## The idea

### The address is not in the tree, and there is nowhere for it to be

A node names a registered endpoint:

```json
"loom:submit": { "to": "contact.enquiry" }
```

That is the entire AI-authored surface of the write seam: one id, out of a set a
deployment wrote down. A proposal cannot compose an address, cannot append to
one, cannot pass anything that reaches one, and cannot fall back to one when the
name is unknown. The address is resolved for the node, at render time, by the
host — and never appears in the tree, the delta, the log or a diff.

You have met this shape before. Lesson 15's primitive registry is the allowlist
for what may be *built*, and lesson 14 named a second seam alongside this one —
`loom:data`, a question the tree asks the host — which has a registry of its own
for what may be *read*. This is the third: the allowlist for where a write may
go.

What is worth noticing is that the argument for each one is *different*, and
this is the strongest of the three. For primitives the argument is
reviewability: a reviewer needs a bounded set of things a page can be made of.
For sources it is that a tree should not carry a connection string. Here it is
that a mistake sends a person's data to a stranger, and no amount of looking at
the page afterwards reveals it.

Two other reasons the address could not have lived in the tree even if nobody
cared about safety, and both are worth having because they are the ones that
survive an argument with someone who trusts their model:

**It is not a property of the revision.** The address differs between staging and
production, it rotates, and nobody proposes it or undoes it. A tree carrying it
would be a cached copy of one deployment's routing table, and every `configure`
against that tree a write against a stale copy. Rotating a URL would become a
proposal through the Gate.

**Rendering cannot wait.** A CSRF token is minted per request, often against a
store. `renderLoomTree` is pure and synchronous (14), and an `await` in the walk
gives up everything lesson 14 bought.

### One thing the write seam refuses to copy from the read seam

Most of this is the read seam again, in the shape lesson 14 gave you: register,
catalogue, plan, resolve, walk; a `Result` at every edge; nothing throws; the
IO finished before the walk begins.

There is one deliberate difference, and it is Predict 2. A binding carries
**params** — `{ "limit": 6 }`, written by the model, guarded by a schema the
source declares. A submission carries `to` and nothing else.

The argument for the asymmetry is not "writes are scarier" — that is the
conclusion, not the reasoning. It is this: **a read genuinely varies, and a
write does not vary in the same way.** `{ "limit": 6 }` and `{ "limit": 12 }`
are two different questions of the same source, and a system that made you
register a source per limit would be absurd. But a deployment with two mailing
lists does not have one endpoint that varies; it has two endpoints. Registering
both costs one line and makes the allowlist *exact* — the registry lists every
place data can go, and a reviewer can read it.

Params would buy nothing a second registration does not, and would cost the one
thing this seam exists for: an AI-authored value reaching the code that decides
where a submission goes. So the twenty-mailing-lists case is not a cost that was
accepted. It is the mechanism. Twenty registrations *is* the allowlist being
exact about twenty destinations, written by the person who runs the deployment.

The one concession to being wrong about this is the shape. `{ "to": … }` is an
object rather than a bare `"contact.enquiry"` string, so that if params ever do
turn out to be necessary, it is a new key rather than a migration of every
stored tree — which is the cost lesson 03 arranged the whole delta model to
avoid.

### Strict, when almost nothing else is

Here is a detail that looks like a style choice and is not.

Loom parses stored JSON permissively nearly everywhere, and it is right to:
Zod's default is to strip keys it does not recognise, and stripping is the
correct behaviour for a document that may have been written by an older schema.
A tree from six months ago carrying a key this version does not know about
should not fail to load.

This one parse is `.strict()`:

```ts
const submissionSchema = z.object({ to: endpointIdSchema }).strict()
```

Read the reason in the seam's own words:

> the one thing this seam exists to keep out of a tree is an address, and a
> declaration carrying `action` should be refused loudly rather than quietly
> honoured as if the extra key were not there.

Think about what permissive parsing would do to this specific key. A tree
arrives containing `{ "to": "contact.enquiry", "action": "https://collect.example.com/harvest" }`.
Stripping is *safe* — the `action` is dropped, the form posts to the enquiry
inbox, nothing bad happens. And nothing is ever said. The exact thing the seam
was built to make impossible has been attempted, and the system's response is to
silently tidy it away and carry on.

Strictness here is not about the danger of the extra key. It is about wanting to
know. Exercise D is where you find out what it costs the node that tried it, and
the answer is more than you will predict.

### Three states, and no way to say "no target, and that's fine"

A form has a target, or has a named reason it does not, or was never given one.

```ts
type SubmissionOutcome =
  | { status: "ready"; target: SubmissionTarget }
  | { status: "unavailable"; unavailable: SubmissionUnavailable }
```

Two variants — and the third state is not a variant at all. A node that was
never given a submission simply has no outcome: the lookup returns `undefined`.
Absence is the third state, and it is absence rather than a value on purpose,
which Exercise B shows.

What the type is careful about is that there is no *fourth*. Its own comment:

> There is no third state here, and in particular no way to express "no target,
> and that is fine": a form primitive shows something different for "we cannot
> take this right now" than for a form that works, and a shape that cannot tell
> them apart guarantees it eventually shows a submit button that quietly goes
> nowhere.

(It says "third" because it is counting variants of this type, where absence is
not one.) The move is lesson 15's three-valued probe verdict and lesson 16's
`undetermined` again, and by now you should be able to state the rule those
share without being told it: collapsing two states makes a system claim
something it does not know. Here the collapse the type refuses is between "we
cannot take this right now" and "this form works" — and the first rendering as
the second is a submit button a visitor presses that goes nowhere.

The five ways the second state can happen each get a name — `no-such-endpoint`,
`invalid-target`, `endpoint-threw`, `unavailable`, `refused` — and Exercise C
produces all five. The split between the last two is the one worth holding on
to: `unavailable` is "ask again later", `refused` is "not for you", and they are
separate because a form shows different sentences for them and only one is worth
retrying. That is the same distinction lesson 16 drew between the two ways an
append can be refused, in a completely different part of the system, for exactly
the same reason.

### The host's own answer is checked too

An endpoint is host code. It answers with an action, a method, and the hidden
fields the form must carry. The seam validates that answer anyway — the action
must be a root-relative path or an absolute `http(s)` URL.

This is *not* the check made on AI-authored URLs, and confusing the two loses
the point. The host wrote this string. The check is that a host's own
composition mistake does not become a live `javascript:` form action, and that
an empty string does not silently mean "post to whatever page this form is
sitting on". A bare relative path like `signup` is refused for the same reason:
it resolves against whatever route the form happens to be rendered on, which is
not a decision anybody made.

The seam gives the general rule in one sentence, and it is the least intuitive
habit in this codebase: **the type is a claim made when the code was written,
and the schema is what makes the claim true on the day the route moved.** The
same reasoning is why the read seam validates what an adapter answers, and it is
the reason a `Result` at a seam is not paranoia about the person on the other
side of it — it is an acknowledgement that the two sides ship on different days.

### Declared and probed, which is a different thing from declared

0065 built all of the above and named, in its own consequences, what it had not
built:

> Nothing enforces that a form primitive has a target. A primitive that needs one
> and is given none renders untargeted, and only its own author knows that is
> wrong.

Be precise about which failure that is, because it is not the one you would
guess. "A form with no endpoint" is handled — that is the `unavailable` state,
with a diagnostic and a form that renders disabled and says so. The uncovered
case is the **component**: a primitive that is handed a resolved target and
never reads it. It renders a set of fields and a submit control with no
`action`, a browser resolves that by posting to whatever page the form is
sitting on, and nothing throws, logs or reports.

0087 closes it in two halves, and the second is what makes the first worth
having:

- A primitive whose job includes sending what it collected declares
  `submits: true`.
- The registry audit **probes whether it actually places the address it is
  handed** — calling the component with a target whose action is a string
  nothing else would produce, and looking for that string in what came back.

Two facts, three lists:

| list | what it means |
| --- | --- |
| `submits` | places an address — what a deployment holds its endpoint registry against |
| `undeclaredSubmitters` | places one and never said it would |
| `unwiredSubmitters` | said it would and places none |

Lesson 15 asked you to hold on to the difference between a declaration that is
believed and a declaration that is checked. This is the cleanest example of the
second in the repository, and the reasoning is worth quoting because it is about
time rather than about trust:

> A declaration nothing verifies drifts silently — a prop is renamed, a component
> is rewritten, and the claim stays behind. Here the two are compared on every
> audit run.

Note what is *not* the claim. Placing the address is the whole of it — not
reading the outcome, not rendering a different sentence for each state. The
address is what the seam delivers, and a primitive that reads the outcome only
to choose between two notices has connected nothing.

And note what happens on silence: a primitive the probe could not call at all is
in neither list. Declining to answer is not answering no, and "this form is
broken" is not a claim to make on silence. You have met that rule before, in the
part of lesson 15 about what a probe is honest about.

---

## In the code

`src/submit/` is the whole seam, and it imports nothing from `render/` — a host
can resolve a tree's submissions without loading the renderer.

| File | What is in it |
| --- | --- |
| `declaration.ts` | `loom:submit` as it appears in a tree, and the strict parse of it |
| `endpoint.ts` | The host's half: `defineEndpoint`, the target schema, the registry, the five failure reasons |
| `catalogue.ts` | The projection the model is shown — an id and a line |
| `plan.ts` | `planTreeSubmissions`: a pure pass that reads every declaration |
| `resolve.ts` | `resolveTreeSubmissions`: the step that may do IO, asking every endpoint at once |
| `resolution.ts` | The pure fold of a plan plus its answers into the two lookups the walk uses |

Elsewhere:

- `src/render/render.ts` — `nodeSubmissionFor`, which is a map read and collects
  a diagnostic
- `src/render/diagnostics.ts` — `submit-misdeclared`, `submit-unavailable`,
  `submit-unresolved`
- `src/sdk/conformance.ts` — `probeSubmissionPlacement`
- `src/sdk/audit.ts` — `auditRegistry`, and the three lists
- `src/primitives/loom.form.ts` — the one primitive in the starter library that
  posts

The three-step shape is the thing to carry away structurally: **plan is pure,
resolve does the IO, fold is pure again.** Every failure path is testable
without a fake endpoint for each one, because the only impure step is the middle
one.

---

## Try it

Seven exercises. Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

**Predict every output in writing, then run.** Exercise D is the one whose
second half almost nobody predicts, and G is the one that shows you what a
visitor actually sees.

The shared preamble for all seven:

```ts
import { renderToStaticMarkup } from "react-dom/server"
import { describe, it } from "vitest"

import { renderLoomTree } from "./render/render.js"
import { sequentialIdFactory } from "./ids.js"
import { createStarterPrimitiveRegistry } from "./primitives/index.js"
import { SUBMIT_PROP_KEY } from "./reserved-props.js"
import { err, ok } from "./result.js"
import { auditRegistry } from "./sdk/index.js"
import {
  createEndpointRegistry,
  defineEndpoint,
  describeSubmissionUnavailable,
  parseSubmission,
  planTreeSubmissions,
  resolveTreeSubmissions,
  submissionCatalogue,
  type EndpointId,
} from "./submit/index.js"
import { formTree } from "./testing/fixtures.js"
import { buildElement } from "./tree/builders.js"
import { createTree } from "./tree/tree.js"

const pageWith = (declarations: readonly unknown[]): ReturnType<typeof createTree> => {
  const idFactory = sequentialIdFactory("f")
  const forms = declarations.map((declared) =>
    buildElement(idFactory, {
      type: "loom.form",
      props: { [SUBMIT_PROP_KEY]: declared as never },
    })
  )
  const page = buildElement(idFactory, {
    type: "loom.page",
    props: { title: "Contact" },
    children: forms,
  })

  return createTree(page, idFactory)
}

const registryOf = (...entries: readonly Parameters<typeof defineEndpoint>[0][]) => {
  const built = createEndpointRegistry(entries.map(defineEndpoint))
  if (!built.ok) throw new Error("fixture registry did not build")

  return built.value
}

const enquiry = {
  id: "contact.enquiry",
  description: "Sends an enquiry to the sales inbox.",
  endpoint: {
    target: async () =>
      ok({
        action: "/api/contact",
        method: "post" as const,
        fields: [{ name: "csrf", value: "token-for-this-request" }],
      }),
  },
}
```

### Exercise A — the plan, which asks nobody anything

Five forms. Two name the same endpoint, one names a second, one is malformed,
one tries to bring its own address.

```ts
describe("A", () => {
  it("plans without asking anybody", () => {
    const tree = pageWith([
      { to: "contact.enquiry" },
      { to: "newsletter.subscribe" },
      { to: "contact.enquiry" },
      { to: "not an id" },
      { to: "contact.enquiry", action: "https://collect.example.com/harvest" },
    ])

    const plan = planTreeSubmissions(tree)

    console.log("endpoints:", JSON.stringify(plan.endpoints))
    console.log("submissions:", plan.submissions.length)
    for (const submission of plan.submissions) {
      console.log(`  ${submission.nodeId} -> ${submission.to}`)
    }
    console.log("problems:", plan.problems.length)
    for (const problem of plan.problems) {
      console.log(`  ${problem.nodeId} ${problem.error.path}: ${problem.error.message}`)
    }
  })
})
```

The output:

```
endpoints: ["contact.enquiry","newsletter.subscribe"]
submissions: 3
  n_f1 -> contact.enquiry
  n_f2 -> newsletter.subscribe
  n_f3 -> contact.enquiry
problems: 2
  n_f4 to: Invalid
  n_f5 loom:submit: Unrecognized key(s) in object: 'action'
```

Three things.

**Three submissions, two endpoints.** Two forms naming one endpoint are resolved
once and share a target. That is the read seam's rule that identical questions
are asked once, applied to a question with nothing to differ by — and it is also
what a reader expects: two newsletter forms on one page post to the same place,
and a per-form nonce would break the second one every time somebody used the
first.

**Nothing was asked.** No registry was passed to `planTreeSubmissions`, because
planning is a pure function of the tree. Notice that this means the plan cannot
tell you whether `newsletter.subscribe` exists. That question belongs to
resolution and this step is not allowed to have an opinion about it.

**A malformed declaration is a `problem`, not a `submission`.** Hold on to the
two node ids `n_f4` and `n_f5`; Exercise D is about what happens to them next.

### Exercise B — the target, and where it is not

```ts
describe("B", () => {
  it("resolves a target that is nowhere in the tree", async () => {
    const { tree, ids } = formTree("contact.enquiry")

    const resolution = await resolveTreeSubmissions(tree, {
      registry: registryOf(enquiry),
    })

    const outcome = resolution.lookup(ids.form)
    console.log("form outcome:", outcome?.status)
    if (outcome?.status === "ready") {
      console.log("action:", outcome.target.action)
      console.log("method:", outcome.target.method)
      console.log("fields:", JSON.stringify(outcome.target.fields))
    }

    console.log("aside outcome:", resolution.lookup(ids.aside))

    const serialised = JSON.stringify(tree)
    console.log("tree mentions /api/contact:", serialised.includes("/api/contact"))
    console.log("tree mentions the token:", serialised.includes("token-for-this-request"))
    console.log(
      "what the tree does carry:",
      JSON.stringify(tree.root.kind === "element" ? tree.root.children[0] : null)
    )
  })
})
```

The output:

```
form outcome: ready
action: /api/contact
method: post
fields: [{"name":"csrf","value":"token-for-this-request"}]
aside outcome: undefined
tree mentions /api/contact: false
tree mentions the token: false
what the tree does carry: {"kind":"element","id":"n_form1","type":"loom.form","props":{"loom:submit":{"to":"contact.enquiry"}},"children":[]}
```

The last three lines are the lesson in one output. A fully resolved form, with a
live action and a per-request CSRF token, and the tree contains neither string.
What the tree contains is a name and a key. Serialise the tree, store it, diff
it, replay it a year from now: no address was ever in it, so no address can ever
come out of it.

`aside` is a `loom.form` that declared nothing, and its outcome is `undefined` —
not an object saying "none". That is the third state, and it is absence rather
than a value on purpose: a node has at most one submission and almost never has
that, so a map of one would be ceremony.

### Exercise C — the five ways a form ends up with nowhere to go

```ts
describe("C", () => {
  it("names every way a form ends up with no target", async () => {
    const registry = registryOf(
      {
        id: "a.refuses",
        description: "Refuses.",
        endpoint: {
          target: async () => err({ code: "refused" as const, detail: "not for this audience" }),
        },
      },
      {
        id: "b.unavailable",
        description: "Cannot answer today.",
        endpoint: {
          target: async () => err({ code: "unavailable" as const, detail: "token store timed out" }),
        },
      },
      {
        id: "c.throws",
        description: "Throws.",
        endpoint: {
          target: async () => {
            throw new Error("connection refused")
          },
        },
      },
      {
        id: "d.bad-target",
        description: "Answers with something the seam refuses.",
        endpoint: {
          target: async () => ok({ action: "signup", method: "post" as const, fields: [] } as never),
        },
      }
    )

    const tree = pageWith([
      { to: "a.refuses" },
      { to: "b.unavailable" },
      { to: "c.throws" },
      { to: "d.bad-target" },
      { to: "e.unregistered" },
    ])

    const resolution = await resolveTreeSubmissions(tree, { registry })
    const plan = planTreeSubmissions(tree)

    for (const submission of plan.submissions) {
      const outcome = resolution.lookup(submission.nodeId)
      if (outcome?.status !== "unavailable") {
        console.log(`${submission.to}: ${outcome?.status}`)
        continue
      }
      console.log(`${submission.to}: ${outcome.unavailable.reason}`)
      console.log(`    a form could say: this form ${describeSubmissionUnavailable(outcome.unavailable)}`)
    }
  })
})
```

The output:

```
a.refuses: refused
    a form could say: this form the endpoint refused — not for this audience
b.unavailable: unavailable
    a form could say: this form the endpoint could not be reached — token store timed out
c.throws: endpoint-threw
    a form could say: this form the endpoint threw instead of answering — connection refused
d.bad-target: invalid-target
    a form could say: this form the endpoint answered with a target the seam refuses — action: must be a root-relative path or an absolute http(s) URL
e.unregistered: no-such-endpoint
    a form could say: this form no endpoint is registered for it — registered: a.refuses, b.unavailable, c.throws, d.bad-target
```

Five endpoints, five distinct reasons, **no exceptions and no rejected
promises.** `c.throws` threw a real `Error` out of host code and came back as a
value with a reason on it. That is lesson 05's rule holding at a seam where the
code on the other side is somebody else's, and it is why one host's token store
having a bad afternoon costs the forms on the page rather than the page.

`d.bad-target` is the one to sit with. The host wrote `signup` — a perfectly
ordinary-looking relative path — and the seam refused it, because it would
resolve against whatever route the form happened to be rendered on. The endpoint
is the host's own code and its answer was still checked.

And notice the `detail` on the last one: it lists what *is* registered. That is
a diagnostic written for the person who mistyped an id at three in the
afternoon, which is a different audience from the visitor.

### Exercise D — what strictness costs the form that tried it

This is Predict 3. Two halves; predict them separately.

```ts
describe("D", () => {
  it("refuses a declaration that carries its own address", () => {
    const cases: readonly [string, unknown][] = [
      ["the only legal shape", { to: "contact.enquiry" }],
      ["an address smuggled alongside", { to: "contact.enquiry", action: "https://collect.example.com/harvest" }],
      ["a bare id", "contact.enquiry"],
      ["an address instead of an id", { to: "https://collect.example.com/harvest" }],
      ["nothing at all", {}],
    ]

    for (const [label, declared] of cases) {
      const parsed = parseSubmission(declared)
      console.log(
        `${label}: ${parsed.ok ? `ok -> ${parsed.value.to}` : `refused -> ${parsed.error.path}: ${parsed.error.message}`}`
      )
    }
  })

  it("and what that costs the form that tried it", async () => {
    const tree = pageWith([
      { to: "contact.enquiry" },
      { to: "contact.enquiry", action: "https://collect.example.com/harvest" },
    ])
    const plan = planTreeSubmissions(tree)
    const resolution = await resolveTreeSubmissions(tree, { registry: registryOf(enquiry) })

    for (const nodeId of ["n_f1", "n_f2"] as const) {
      const outcome = resolution.lookup(nodeId as never)
      const problems = resolution.problemsFor(nodeId as never)
      console.log(`${nodeId}: lookup=${outcome?.status ?? "undefined"} problems=${problems.length}`)
      for (const problem of problems) {
        console.log(
          `    ${problem.kind}: ${problem.kind === "misdeclared" ? problem.error.message : problem.unavailable.reason}`
        )
      }
    }
    console.log("endpoints asked:", JSON.stringify(plan.endpoints))
  })
})
```

The output:

```
the only legal shape: ok -> contact.enquiry
an address smuggled alongside: refused -> loom:submit: Unrecognized key(s) in object: 'action'
a bare id: refused -> loom:submit: Expected object, received string
an address instead of an id: refused -> to: Invalid
nothing at all: refused -> to: Required
```

```
n_f1: lookup=ready problems=0
n_f2: lookup=undefined problems=1
    misdeclared: Unrecognized key(s) in object: 'action'
endpoints asked: ["contact.enquiry"]
```

The second half is the one to have got wrong.

The form that tried to bring its own address does not post to the harvester —
obviously. It also does not post to `contact.enquiry`, which is the part almost
nobody predicts. Its `to` was perfectly valid and it named a registered endpoint,
and it gets **no target at all**: `lookup` is `undefined`, exactly as it is for a
form that declared nothing.

Trace why, because the mechanism matters more than the fact. A declaration is
parsed as a unit. It failed, so the node went into `plan.problems` and never into
`plan.submissions`; only planned submissions ever get an outcome. There is no
partial credit and no recovery of the good half.

That is what `.strict()` buys, stated properly: not "the extra key is ignored"
but **an attempt to smuggle an address costs the node its submission entirely.**
Compare it to the permissive alternative one more time. Stripping would have
produced a working form posting to the right place, and a page nobody ever looked
at twice.

Two things fall out of it that are worth writing down:

- The seam **fails closed**, and this is what that phrase means concretely. The
  failure of a check does not degrade to the safe-looking option; it degrades to
  nothing.
- A misdeclared node lands in the *same* `lookup` state as a node that declared
  nothing. The reason it does is sound, and what it means for what a visitor sees
  is Exercise G.

### Exercise E — what the model is shown

```ts
describe("E", () => {
  it("shows the model the id and the line and nothing else", () => {
    const registry = registryOf(enquiry, {
      id: "newsletter.subscribe",
      description: "Adds an address to the monthly newsletter.",
      endpoint: {
        target: async () =>
          ok({ action: "https://lists.example.com/subscribe", method: "post" as const, fields: [] }),
      },
    })

    const catalogue = submissionCatalogue(registry)
    console.log(JSON.stringify(catalogue, null, 2))

    const registered = registry.endpoint("contact.enquiry" as EndpointId)
    console.log("keys the registry holds:", Object.keys(registered ?? {}).join(", "))
    console.log("keys the catalogue offers:", Object.keys(catalogue[0] ?? {}).join(", "))
  })
})
```

The output:

```
[
  {
    "id": "contact.enquiry",
    "description": "Sends an enquiry to the sales inbox."
  },
  {
    "id": "newsletter.subscribe",
    "description": "Adds an address to the monthly newsletter."
  }
]
keys the registry holds: id, description, resolve
keys the catalogue offers: id, description
```

Apply lesson 12's definition of a projection to those two lines and you have the
whole of this exercise. Source of truth: the registry. What is thrown away:
`resolve` — the function that knows the address, the method, and how to mint a
token. Who is protected by the throwing-away: the visitor whose data would go
somewhere else if the model could see, and therefore choose, a destination that
was not registered.

The catalogue is thinner than the data catalogue on purpose. A source's
catalogue carries a params schema because a model supplies params; here the id
is the only thing a model supplies, so the id and one line is everything there
is to show. Whether an endpoint posts or gets, where it posts to, and what it
carries are resolved after the choice is made and are none of the model's
business.

### Exercise F — the declaration, checked

```ts
describe("F", () => {
  it("compares what was declared against what was placed", () => {
    const built = createStarterPrimitiveRegistry()
    if (!built.ok) throw new Error("registry did not build")

    const audit = auditRegistry(built.value)

    console.log("registered primitives:", built.value.primitives.length)
    console.log("submits (probed):", JSON.stringify(audit.submits))
    console.log("undeclaredSubmitters:", JSON.stringify(audit.undeclaredSubmitters))
    console.log("unwiredSubmitters:", JSON.stringify(audit.unwiredSubmitters))

    for (const entry of audit.audits) {
      if (entry.declaresSubmits || entry.submission.outcome === "places") {
        console.log(`  ${entry.type}: declared=${entry.declaresSubmits} probe=${entry.submission.outcome}`)
      }
    }
  })
})
```

The output:

```
registered primitives: 68
submits (probed): ["loom.form"]
undeclaredSubmitters: []
unwiredSubmitters: []
  loom.form: declared=true probe=places
```

One primitive out of sixty-eight posts anywhere, it says it does, and the probe
confirms it. Both failure lists are empty.

**Now go and read 0087's consequences, which say the opposite.** That record,
dated 23 August, states plainly: "`loom.form` posts, does not declare `submits`,
and the audit says so — `submits: ["loom.form"]`, `undeclaredSubmitters:
["loom.form"]`." It was true when it was written, and the record was right to
record it — 0087 built the check and filed the one-line fix for the routine that
owns `src/primitives/`. Somebody then did it.

Both are worth taking away, and they are different points. The one about this
system: the audit found a real gap and the gap got closed, which is what a check
that reports rather than refuses is *for*. The one about reading a codebase: a
decision record tells you what was true on the day it was decided, and the only
thing that tells you what is true now is running it. This lesson's brief for
itself says the same thing — describe behaviour, not intent — and this is the
exercise where you can watch the difference be a whole sentence wide.

### Exercise G — what a visitor actually sees

Four trees, rendered through the real starter library, with one endpoint
registered.

```ts
describe("G", () => {
  it("renders the states a visitor can end up in", async () => {
    const built = createStarterPrimitiveRegistry()
    if (!built.ok) throw new Error("registry did not build")

    const show = async (label: string, declared: unknown | undefined) => {
      const idFactory = sequentialIdFactory("g")
      const form = buildElement(idFactory, {
        type: "loom.form",
        props: (declared === undefined ? {} : { [SUBMIT_PROP_KEY]: declared }) as never,
      })
      const tree = createTree(
        buildElement(idFactory, { type: "loom.page", children: [form] }),
        idFactory
      )

      const submissions = await resolveTreeSubmissions(tree, { registry: registryOf(enquiry) })
      const rendered = renderLoomTree(tree, {
        resolver: built.value,
        validator: built.value,
        submissions,
      })
      const markup = renderToStaticMarkup(rendered.element)

      console.log(`${label}:`)
      console.log(
        `    form tag           ${/<form[^>]*>/.exec(markup)?.[0]?.replace(/ style="[^"]*"/, " style=...") ?? "(no form)"}`
      )
      console.log(`    hidden csrf        ${markup.includes('name="csrf"') ? "yes" : "no"}`)
      if (markup.includes('name="csrf"')) {
        console.log(`    csrf before fieldset ${markup.indexOf('name="csrf"') < markup.indexOf("<fieldset")}`)
      }
      console.log(`    fieldset disabled  ${markup.includes("<fieldset disabled") ? "yes" : "no"}`)
      console.log(`    notice             ${/<p style="[^"]*">([^<]*)<\/p>/.exec(markup)?.[1] ?? "(none)"}`)
      console.log(`    diagnostics        ${JSON.stringify(rendered.diagnostics)}`)
    }

    await show("the tree named a registered endpoint", { to: "contact.enquiry" })
    await show("the tree named nothing at all", undefined)
    await show("the tree smuggled an address", {
      to: "contact.enquiry",
      action: "https://collect.example.com/harvest",
    })
    await show("the tree named an endpoint nobody registered", { to: "nowhere.at-all" })
  })
})
```

The output:

```
the tree named a registered endpoint:
    form tag           <form style=... action="/api/contact" method="post">
    hidden csrf        yes
    csrf before fieldset true
    fieldset disabled  no
    notice             (none)
    diagnostics        []

the tree named nothing at all:
    form tag           <form style=...>
    hidden csrf        no
    fieldset disabled  yes
    notice             This form is not connected yet, so it cannot be sent.
    diagnostics        []

the tree smuggled an address:
    form tag           <form style=...>
    hidden csrf        no
    fieldset disabled  yes
    notice             This form is not connected yet, so it cannot be sent.
    diagnostics        [{"code":"submit-misdeclared","nodeId":"n_g1","error":{"path":"loom:submit","message":"Unrecognized key(s) in object: 'action'"}}]

the tree named an endpoint nobody registered:
    form tag           <form style=...>
    hidden csrf        no
    fieldset disabled  yes
    notice             This form cannot be sent just now. Please try again in a moment.
    diagnostics        [{"code":"submit-unavailable","nodeId":"n_g1","to":"nowhere.at-all","unavailable":{"reason":"no-such-endpoint","detail":"registered: contact.enquiry"}}]
```

Four things are worth taking from that.

**The `action` attribute exists in exactly one of the four.** In every other
case the `<form>` tag carries no `action` at all — not an empty one, which a
browser would resolve to the current page. The seam failing closed reaches all
the way to the markup.

**The CSRF field is outside the fieldset.** In the working case, `name="csrf"`
appears before `<fieldset`. A disabled fieldset makes every control inside it
unsuccessful, so a token that ever sat in one would be a form posting without it
on the day an endpoint had a bad afternoon.

**Two of the four say nothing to the operator, and correctly.** A tree that
declared nothing is not a misdeclaration — nothing was declared wrongly — so
there is no diagnostic, and the page itself has to be honest about it instead.
That is the split this whole design runs on: the visitor gets a sentence, the
operator gets a diagnostic, and neither gets the other one's information. The
visitor is never shown `token store timed out`.

**Cases two and three show the visitor the same sentence.** A form that nobody
wired and a form whose declaration was refused both say *This form is not
connected yet, so it cannot be sent.* They are told apart in the diagnostics and
not on the page — which is right, because the visitor's question is "can I send
this" and the answer is the same. This is the one place in the seam where two of
the three states genuinely do collapse, and the collapse is downstream of the
decision, in the primitive, rather than in the shape.

---

## It could have been otherwise

Six, from 0065 and 0087.

**A URL prop, validated by an allowlist of hosts.** The cheapest thing that
works, and it fails at the first deployment that does not know its own
production hostname at build time. Worse, it makes the address part of the
revision: the tree carries it, the log records a model having chosen it, and
rotating a URL becomes a proposal through the Gate.

**An endpoint as a data source that answers with a URL.** Genuinely tempting —
`defineSource` already validates params, catches throws and answers `ready` or
`unavailable`, and a target is JSON. Rejected on two counts, and the second is
the better one: the primitive would receive `JsonValue` and have to re-parse it,
putting an unchecked cast in every form author's lap; and it collapses the
distinction that is the entire point. A source is a read, an endpoint is a
write, and a reviewer reading a catalogue needs to see which registrations can
receive a visitor's data. One mechanism serving both would list them together.

**Params on the declaration, guarded by a schema.** Predict 2. What was given up
is named rather than waved away: a deployment with twenty mailing lists
registers twenty endpoints instead of one taking a list id. The trade is that
the registration is written by the person who runs the deployment, and the
alternative is a validated but still AI-authored value reaching the code that
decides where a submission goes.

**Letting the primitive render its own action from a prop the host wires through
React context.** It works, and it puts the framework outside the one decision it
most needs to be inside. A host wiring context per primitive is a host
reimplementing this seam once per form, differently each time, with no
diagnostic when it forgets.

**The declaration alone, as 0065 sketched it** — read `submits` off the
definition and report the list. A third of the code, and an unchecked claim: the
audit would echo back what the author typed. It catches a form that forgot to
declare and nothing at all about a form that declared and does not work.

**Derivation alone, with no declaration** — report `submits` from the probe and
stop. This one is worth arguing with, because it needs no author to do anything
and it is the fact a deployment actually holds its endpoint registry against.
What it cannot express is the one thing the seam exists for: a primitive that
*should* post and does not is indistinguishable from one that was never meant
to. That gap is only closable by someone saying what was intended.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections while
you write. Then compare.

1. **Derive this seam from lesson 12's projection, then find where the
   derivation stops.** Lesson 12 said the model is not shown the AST, it is
   shown a projection. Write the paragraph that makes the endpoint catalogue the
   same decision — source of truth, what is withheld, who is protected. Then the
   part that is not a projection: a projection withholds information, and this
   seam also withholds *the ability to compose*. Say what the difference is
   between "the model cannot see the address" and "the model could not write one
   even if it knew it", and which of the two is doing the work here. Then name
   one other place in this course where both were needed and neither was
   sufficient alone. *(12, 04)*

2. **Say what the audit's second half buys, in a sentence that does not use the
   word "trust".** 0087 pairs a declaration with a probe. Explain what a probe
   can establish that a declaration cannot, then say what a declaration can
   establish that a probe cannot — both directions, because the record is
   explicit that either one alone was rejected. Then apply the same test to a
   claim from lesson 15 that is declared and never probed, and say what would
   have to be true about that claim for a probe to be able to check it at all.
   *(15)*

If your answer to (1) is mostly about the model being untrustworthy, you have
written the argument that produces a review step. The argument this seam is
built on produces an allowlist, and the difference between those two artefacts —
one of which scales with how much you look, and one of which does not — is the
thing to explain.

---

## Self-check

Six questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. Give the one-line reason a scheme allowlist does not solve this problem, with
   the example. Then state, in general terms, what class of question an
   allowlist over a *string* can never answer — and name one other place in this
   course where the same limitation showed up under a different name.
2. A read seam carries params and a write seam does not. Give the argument from
   what varies rather than from what is dangerous. Then say what the object form
   of the declaration is protecting against, and what the cost of getting it
   wrong would have been.
3. Almost every parse of stored JSON in Loom is permissive; this one is strict.
   Give the reason. Then say precisely what a node that smuggled an address ends
   up with, and why "the extra key is stripped and the form works" is a *worse*
   outcome than what actually happens.
4. Name the three states a form can be in, and say why there is no fourth. Then
   name the two of them that a visitor cannot tell apart on the page, say why
   that collapse is acceptable, and say where the distinction is preserved
   instead.
5. `probeSubmissionPlacement` looks for a specific string in what a component
   rendered. Say what claim that is testing, and name two things a primitive
   could do that would look like connecting a form and would correctly fail the
   probe. Then say what happens to a primitive the probe could not call at all,
   and why that is not counted as a failure.
6. Exercise F's output disagrees with a decision record's consequences. Say what
   changed and why neither of the two is wrong. Then give the general rule you
   would now apply when reading any `Accepted` record in this repository.

Question 3 is the slow one and the one to write in full sentences. Question 6 is
the one worth being uncomfortable about.

---

## Reflect

Write for two minutes, then move on.

- Which prediction were you most confidently wrong about? If it was Predict 3,
  go back to what you wrote and find the assumption — most people predict that
  the good half of a refused declaration survives, and the assumption underneath
  that is that a validator's job is to salvage. Say where else you might be
  carrying it.
- 0065 replaced "how do we validate a form action a model wrote" with "how does
  a form get an action a model never wrote". Write down one problem you are
  currently carrying that is phrased the first way. You do not have to solve it;
  the exercise is noticing that it is phrased as a validation problem.
- Exercise F showed a decision record describing a state that no longer holds.
  Write one sentence about what you will do differently next time you read an
  `Accepted` record and want to know whether it is still true.

---

## Come back to this

Set U in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 03, 05, 12, 14, 15 and 16, and built around the failure mode
this lesson exists to name: **treating a dangerous input as something to
validate rather than something to remove.**

**Where Part V goes next.** This lesson is the first of a part about a page that
*does* something rather than one that shows something, and it took the seam with
the sharpest consequence first. The door out of here is a sentence in 0065's own
consequences that this lesson quoted and did not resolve:

> The Gate does not yet weigh a change of destination. A `configure` that moves
> `loom:submit` from `newsletter.subscribe` to `contact.enquiry` sends the next
> visitor's message somewhere else. Both are registered, so nothing leaves the
> deployment, and the analysis reports the prop change like any other.

Lessons 07, 08 and 09 taught you a Gate that weighs stakes and reversibility.
You have now met a prop whose change is perfectly ordinary by every measure that
Gate applies, and which redirects a stranger's data. Hold that against Set U
question 6 before the next lesson tells you what was done about it.
