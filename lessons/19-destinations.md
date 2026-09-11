# 19 — Destinations: the address the tree never holds

**After this lesson you will be able to** say why a form's action is a different
kind of danger from a link's, and why the check that contains a link does
nothing here; state what a submission declaration contains and — the half that
matters — why it has no params when a binding does, with the reason given as a
property of *writes* rather than as caution; explain why a declaration carrying
an extra key is refused rather than stripped; give the five named reasons a form
has no target and say why "no target, and that is fine" is not among them and
could not be; say what a host's own answer is validated *for*, and name the two
action strings that look like paths and are not; and say what the Gate does when
a change moves a form's destination between two endpoints the host registered
itself, and why that verdict does not depend on who asked.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md), [09](09-the-gate.md),
[10](10-the-pipeline.md), [11](11-the-model-seam.md), [12](12-projection.md),
[13](13-refusal-and-repair.md), [14](14-rendering.md),
[15](15-primitives-and-the-registry.md), [16](16-persistence.md),
[17](17-telemetry.md), [18](18-data.md). This lesson leans hardest on 18, and
will not work if you have not done it — half of what is here is an argument
about where 18's answer stops applying.

Lesson 18 was about a question the tree asks. This one is about a sentence the
tree is not allowed to finish.

A visitor types their name, their email address and a paragraph about what they
need, and presses a button. Somewhere in that moment there is a URL, and the
visitor never sees it. They saw a page that looked like the company's page, and
they trusted the button.

Everything in Part IV was about a document you can read. This is about the one
value on a page whose consequences a reader cannot inspect by reading it.

---

## Warm-up

Closed book, five minutes, mixed across six lessons. Write something for all
five before you look anything up.

1. A binding carries `{ source, params }` and the params are AI-authored. Give
   the reason that was acceptable, then name the thing that makes it acceptable
   — the guard, and who writes it. *(18)*
2. Lesson 14's renderer is a total pure projection. Name what "total" bought
   that `Result` would not have, and say where a render fault goes instead of
   up. *(14)*
3. `nested-target` is `critical` and most stake factors are not. Give the
   property of that factor that earns `critical`, phrased as a claim about the
   *change* rather than about the damage. *(07, 09)*
4. An auto-apply ceiling is per origin. Say what that means a stake level cannot
   express on its own, and name the mechanism lesson 09 used to express it
   anyway. *(09)*
5. A primitive declares `interactive: { whenProps: … }` rather than a bare
   boolean. Give the case that conditional form exists for, in one concrete
   sentence. *(15)*

Question 5 is the door into this lesson's second half, and question 3 is the
door into its last section. Question 1 is the one to answer most carefully:
this lesson disagrees with it, on purpose, and you will get more out of the
disagreement if your own version of the argument is written down first.

---

## Predict

**In writing, before reading on.** Four questions. The first asks you to build
something, and the fourth asks you to judge something you have already been
taught how to judge. Expect to be wrong about the second.

1. You are adding forms to Loom. A model must be able to put a contact form on
   a page, and a form posts somewhere. **Write down the prop you would add and
   the validation you would put on it.** Be specific — an actual key, an actual
   check. Then, underneath, write the worst thing that can happen to a visitor
   if your check passes something it should not have.

2. Lesson 18 let a binding carry AI-authored `params`, guarded by a schema the
   source declares — `{ "limit": 6 }` is a different question of the same
   source. A deployment has twenty mailing lists. **Should a submission
   declaration carry params, so one endpoint can take a list id?** Answer yes or
   no, and give your reason before you read the next section.

3. A host registers an endpoint and answers with an action string. Here are
   seven of them. Write down which ones a form on `https://site.example/pricing`
   could safely post to **on that same origin**:

   ```
   /api/contact
   https://forms.example.com/contact
   //evil.example/harvest
   /\evil.example/harvest
   javascript:fetch('https://evil.example',{method:'POST'})
   (the empty string)
   api/contact
   ```

   Then answer the harder question: **the host wrote all seven. Why would a
   framework check its own host's string at all?**

4. A `configure` moves a node's `loom:submit` from `newsletter.subscribe` to
   `contact.enquiry`. Both were registered by the deployment. No address appears
   anywhere in the tree or in the delta, and nothing leaves the deployment.
   **What should the Gate do, and does your answer change if a developer asked
   for it rather than an end user?**

Do not read on until all four are written down. Question 1 is the one this
lesson takes apart; if you have not built the wrong thing yourself, the argument
for the right thing is just an assertion you are being asked to accept.

---

## The problem

### An action is not an href, and the difference is the visitor

Lesson 15 established that a URL a model writes is checked against a scheme
allowlist — [0053](../decisions/0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md)
— because otherwise a model writes `javascript:` into an `href` and the page has
a bomb in it. If you wrote a scheme check in Predict 1, you were not being lazy;
you were applying the rule the course already gave you.

Now hold two things side by side.

A bad `href` a visitor never clicks costs nothing. It sits in the page inert. It
costs something only when the visitor takes an action, and the action is one
they chose, toward a destination the browser will show them before and after.

A bad `action` costs everything at the moment the visitor does exactly what the
page invited them to do. They typed their name and their email address and what
they wanted, and they pressed a button that said *Send*. Where it went is not on
screen before, during, or after. There is no hover preview for a form.

And here is the part worth sitting with, because it is what makes this a
different problem rather than a worse version of the same one:

> **`https://collect.example.com/harvest` passes a scheme allowlist.**

It is `https`. It is a perfectly well-formed URL. Every check lesson 15 taught
you says yes. A model that writes it has authored a form that collects a
stranger's personal data and sends it to a host nobody at the deployment has
ever heard of, and the page renders, and the tests pass, and the visitor gets a
thank-you message.

So validation is the wrong shape of answer here, and it is worth naming why
precisely: **a scheme allowlist constrains the *form* of a value, and the danger
here is entirely in its *content*.** There is no syntactic property that
separates a company's own form endpoint from a collector's.

That reframes the question, and the reframe is the whole lesson:

> The question is not *how do we validate a form action a model wrote*.
> It is *how does a form get an action a model never wrote*.

### Two constraints you already know

Both carry over from lesson 18 unchanged, which is worth noticing: they are
properties of *the renderer*, not of data, so they hold for anything the tree
needs and does not contain.

**Rendering cannot wait.** `renderLoomTree` is pure and synchronous
([0008](../decisions/0008-the-renderer-is-a-total-pure-projection.md)). A CSRF
token is minted per request, frequently against a store, and that is IO. An
`await` in the walk gives up everything lesson 14 argued for.

**The address is not a property of the revision.** It differs between staging
and production. It rotates. Nobody proposes it, nobody reviews it, and nobody
undoes it. A tree carrying it is a cached copy of one deployment's routing
table, and every `configure` after that is a write against a stale copy.

That second one should feel familiar to the point of monotony, and the monotony
is the finding: it is the same argument that kept a *data answer* out of the
tree in lesson 18, arriving at the same conclusion about a completely different
kind of value.

---

## The idea

### A node names a destination and never carries one

[0065](../decisions/0065-a-submission-names-a-destination-and-never-carries-one.md)
puts one key in the tree, the third in the reserved namespace
[0050](../decisions/0050-the-runtimes-props-are-namespaced-and-the-root-mounts-the-theme.md)
opened:

```json
"loom:submit": { "to": "contact.enquiry" }
```

That is the entire AI-authored surface for where a stranger's data goes. One id,
from a registry a deployment wrote. A proposal cannot compose an address, cannot
append to one, and cannot pass a value that reaches one.

Compare it to what you wrote for Predict 1. If you wrote a URL prop with a check
on it, the difference is not that this one is stricter. It is that this one has
**nothing to check**, because an id is not an address and cannot be made into
one from inside the tree. The registry is not a filter over addresses a model
proposed; it is the only place addresses exist.

### There are no params, and this is where the data seam stops being copied

This is the part of the lesson that is not a re-run of 18, and if you answered
"yes, by symmetry" to Predict 2, this is where to slow down.

Lesson 18's params were justified by a specific property: **a read genuinely
varies.** `{ "limit": 6 }` and `{ "limit": 12 }` are different questions *of the
same source*, and there is no sane design where a deployment registers
`catalogue.services.six` and `catalogue.services.twelve`. The variation is real,
so it has to live somewhere, and a schema the source declares is what makes an
AI-authored value safe to have there.

A write does not vary that way. There is no natural sense in which
`newsletter.subscribe` with `{ list: "weekly" }` is *the same write* as
`newsletter.subscribe` with `{ list: "investors" }`. Those are two destinations
wearing one name.

So the trade, stated plainly, because it is a real cost and not a free win:

> A deployment with twenty mailing lists registers **twenty endpoints** instead
> of one endpoint taking a list id.

That is more registration, and it is the right trade for a reason that is not
about effort. The twenty registrations are written by the person who runs the
deployment. The one list id would be written by the model. Params would reopen
an AI-authored channel into the exact code path that decides where a visitor's
data goes, and would buy nothing that a second registration does not — while
making the allowlist *approximate* where it is currently *exact*.

There is a second-order property here worth extracting, because it generalises
past forms: **the registry is the whole allowlist only if nothing composes.** The
moment a declaration can carry a value that participates in choosing the
destination, "what can this deployment receive submissions at" stops being a
list you can read and becomes a question you have to reason about.

### The declaration is an object, and it is parsed strictly

`{ "to": "contact.enquiry" }` rather than `"contact.enquiry"`, and the reason is
lesson 03's reason: an object can grow a key, and a bare string can only be
migrated. Migrating built trees is the cost the whole delta model was arranged
to avoid.

The parse is `.strict()`, which is unusual in this codebase — most parses of
stored JSON strip what they do not recognise, and stripping is right for a
document that may have been written by an older schema. Here it is exactly
wrong:

> The one thing this seam exists to keep out of a tree is an address. A
> declaration carrying `action` must be refused **loudly**, not honoured quietly
> as though the extra key were not there.

Read that as a general principle and it is a good one: *strip what you do not
understand, except where the thing you do not understand is the thing you exist
to exclude.* You will see it fire in Exercise A.

### The same three steps, and they run alongside data rather than after it

Identical in shape to lesson 18, which is the point — a host serving a page with
a form and an integration should not learn two mechanisms:

- `planTreeSubmissions` — **pure.** Walks the tree, reads every declaration,
  returns the endpoint ids and which node named each. Asks nobody anything.
- `resolveSubmissionPlan` — **the step that may do IO.** Asks every endpoint at
  once, never in sequence.
- `renderLoomTree` — takes the targets as a finished lookup and is exactly as
  synchronous as it was.

`renderRequest` is where they meet, and it resolves data and submissions
**together** rather than in turn. Neither seam knows the other exists, and a
page with a form and a data binding pays for the slower of the two rather than
the sum.

**Two forms naming one endpoint share a target.** That is lesson 18's "identical
questions are asked once", applied to a question with nothing to differ by — and
here it is also a correctness requirement rather than an optimisation. A
per-form CSRF nonce would break the second form on the page every time somebody
used the first.

### The host's answer is validated too, and not for the same reason

An endpoint answers with an `action`, a `method` of `get` or `post`, and the
hidden `fields` the form must carry — the CSRF token being why that list exists
at all.

The action is checked. The host wrote it, so this is emphatically *not* 0053's
check on AI-authored URLs. It is the check that a host's own composition mistake
does not become a live form action, and it catches four distinct mistakes:

- a `javascript:` action, which is a composition bug rather than an attack;
- the empty string, which silently means *post to this page*;
- a relative path with no leading `/`, which resolves against whatever route the
  form happens to be rendered on — a destination nobody chose;
- and the one that is genuinely hard to see in review.

That last one is worth its own paragraph, because it is the answer to Predict 3
and most readers get it wrong:

> `//evil.example/harvest` begins with a slash and **leaves the origin
> entirely.** It is scheme-relative. A check for a leading slash accepts it.
> `/\evil.example/harvest` is the same thing with a backslash, which browsers
> normalise to `//` when resolving.

Both look like paths. Both are refused. The rule is not that leaving the origin
is forbidden — an absolute `https://` URL is fine — it is that **crossing an
origin has to be explicit.** A target that quietly leaves is the most costly
version of this mistake and the least likely to be caught by a person reading a
diff.

The seam validates the host's answer for the same reason `defineSource`
validates an adapter's: the type is a claim made on the day the code was
written, and the schema is what makes it true on the day the route moved.

### Three states, and there is deliberately no fourth

A node that declared a submission either has a target, or has a *named reason*
it does not. Plus the state of having said nothing at all.

| state | what it means |
| --- | --- |
| absent | the tree declared nothing; this node is not a form |
| `unavailable` | it declared one and something specific went wrong |
| `ready` | it has a target |

And five named reasons under `unavailable`: `no-such-endpoint`,
`invalid-target`, `endpoint-threw`, `unavailable`, `refused`. Exercise D shows
all five.

What is *not* expressible is the fourth state, and its absence is a design
decision rather than an omission:

> There is no way to say **"no target, and that is fine."**

Because a form primitive shows something different for each of the three, and a
shape that cannot tell "we cannot take this right now" from "this form works"
guarantees that one day it renders a submit button that quietly goes nowhere.
That is the failure this shape exists to make unrepresentable, and it is why
[0073](../decisions/0073-a-form-with-nowhere-to-post-renders-disabled-and-says-so.md)
can require a form with no target to render *disabled and say so* — the
information it needs to do that is in the type.

Note also that `loom.submit` is **optional** on the render context, unlike
`loom.data`, `loom.slots` and `loom.text`, which are always present and often
empty. A node has at most one submission and almost never has one, so a map of a
single entry would be ceremony — and absence is already one of the three states.

### What 0065 left open, and who closed it

This is the part that makes lesson 19 worth reading after lesson 18, so read the
open questions before the answers.

0065 shipped with two things it deliberately did not do, both written down in
its own Consequences:

1. **"The Gate does not yet weigh a change of destination."** A `configure`
   moving `loom:submit` from one registered endpoint to another authors no
   address and leaks nothing — and sends the next visitor's message somewhere
   else. The analysis reported it as a prop key that changed, like any other.
2. **"Nothing enforces that a form primitive has a target."** A primitive that
   needs one and is given none renders untargeted, and only its own author knows
   that is wrong.

Both are now closed, and each closure is a small lesson in itself.

**The redirection**
([0071](../decisions/0071-moving-a-forms-destination-is-a-stake-of-its-own.md)).
`redirected-submission` is a stake factor at `high`, and three things about how
it is measured are worth more than the fact of it:

- **It is measured between the two trees, not off the operations.** A delta that
  moves a destination and moves it back reports nothing, because nothing moved.
- **It counts only where a node's identity persists across the change.** A node
  that *gains* a declaration is a new form — an expectation created, not moved.
  A node that *loses* one is a form that stops posting, which is breakage the
  shape factors already measure. A declaration that stops parsing reads as a
  loss, because that is what the page does with it. This is lesson 04 doing real
  work: the whole factor is defined by a node id meaning the same node.
- **It is `high` and not `critical`,** and the comparison with `nested-target`
  (Warm-up 3) is the argument. `nested-target` is `critical` because it measures
  a change that is wrong *however it was meant*. This one measures a change that
  is often exactly right — a deployment splitting one mailing list into two
  repoints its forms — so a refusal would mean no proposal could ever move a
  form. **The thing that must not happen is not that it happens; it is that it
  happens unnoticed.**

And then the Gate rule, which is the answer to Predict 4 and is the more
interesting half. A stake *level* cannot say "never auto-apply", because ceilings
are per origin ([0002](../decisions/0002-gate-is-a-pure-function-of-two-axes.md)):
`high` is a hold for a user instruction and an auto-apply for a developer. So
this gets a **rule of its own**, in the shape
[0035](../decisions/0035-discarded-work-is-a-stake-and-only-the-runtime-declares-it.md)
established for discarded work, sitting below the refusal floor:

> Where a stranger's data goes should not depend on who asked for it to move.

If your answer to Predict 4 was "hold it, unless a developer asked" — that is
the ceiling mechanism answering, correctly, from lesson 09. What this rule says
is that origin is the wrong axis for this one fact. Exercise F is that sentence
as a table.

**The declaration**
([0087](../decisions/0087-a-primitive-that-posts-declares-it-and-the-audit-checks.md)).
A primitive whose job includes sending what it collected declares `submits:
true`, and the registry audit *probes* whether it actually places the address it
is handed. Two details:

- It is a plain boolean, with no conditional form — unlike `interactive`, which
  takes `{ whenProps }` (Warm-up 5) because a card is a target only when the
  tree gives it an `href`. There is no matching case here. A form is a form, and
  a primitive that posts under one prop value and not another is two primitives
  wearing one name.
- **Placing the address is the claim.** The probe calls the component with a
  target whose action is a string nothing else would produce and looks for that
  string in the output. Not reading the outcome, not rendering a different
  sentence — a primitive that reads the outcome only to choose between two
  notices has connected nothing.

The audit reports `submits`, `undeclaredSubmitters` (places an address and never
said it would) and `unwiredSubmitters` (said it would and places none). Nothing
is refused at registration, per
[0012](../decisions/0012-conformance-is-probed-and-reported-not-enforced.md):
the audit reports and the host decides. And a primitive the probe could not call
appears in neither list, because declining to answer is not answering no.

### What this costs, stated plainly

- **A deployment that registers nothing has no form that posts anywhere.** The
  seam fails closed, and that is the intended default rather than a rough edge —
  it is what makes the registry the entire allowlist.
- **Twenty mailing lists is twenty registrations.** Named above; it is the cost.
- **A third registry to wire.** `renderRequest` now takes `sources`, `themes`,
  `text` and `endpoints`.
- **A change that makes a form stop posting is still not this factor.** Unsetting
  `loom:submit` leaves a form that renders and submits nowhere. 0071 records that
  as an open question on purpose: "the destination moved" and "the form broke"
  are different sentences for a reviewer, and the second is a diagnostic the
  seam already produces at render time.

---

## In the code

| Where | What is there |
| --- | --- |
| `src/submit/declaration.ts` | `parseSubmission`, and the `.strict()` schema |
| `src/submit/endpoint.ts` | `defineEndpoint`, `createEndpointRegistry`, `submissionTargetSchema`, and `isSameOriginPath` |
| `src/submit/plan.ts` | `planTreeSubmissions`, `planSubmissionsIn` — the pure pass |
| `src/submit/resolve.ts` | `resolveSubmissionPlan` — the one step that talks to a host |
| `src/submit/resolution.ts` | `SubmissionOutcome`, the three states |
| `src/submit/catalogue.ts` | what a model is shown: an id and a line |
| `src/runtime/redirection.ts` | `redirectedSubmissionsBetween` |
| `src/runtime/stakes.ts` | the `redirected-submission` factor |
| `src/runtime/gate.ts` | `confirmRedirectedSubmission` |

`src/submit/` imports nothing from `render/` and knows nothing about React, so a
static export or a cache warmer can resolve a tree's submissions without loading
the renderer. That is the same independence lesson 18 noted about `src/data/`,
and it is not a coincidence: both are seams the *page* needs, and a page is not
the same thing as a render.

---

## Try it

Six exercises. Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

**Predict every output in writing, then run.** Exercises C and E have answers
most readers get wrong, in two different ways: C because a string looks like
something it is not, and E because the obvious mental model counts operations.

The shared preamble for all six:

```ts
import { describe, it } from "vitest"

import { sequentialIdFactory, type NodeId } from "./ids.js"
import { SUBMIT_PROP_KEY } from "./reserved-props.js"
import { err, ok } from "./result.js"
import { assessChange } from "./runtime/assessment.js"
import { gate } from "./runtime/gate.js"
import type { IntentOrigin } from "./runtime/intent.js"
import { defaultGatePolicy, gatePolicySchema, type GatePolicy } from "./runtime/policy.js"
import type { ProposedChange } from "./runtime/proposal.js"
import { redirectedSubmissionsBetween, describeRedirectedSubmission } from "./runtime/redirection.js"
import {
  createEndpointRegistry,
  defineEndpoint,
  describeSubmissionUnavailable,
  planTreeSubmissions,
  resolveSubmissionPlan,
  submissionTargetSchema,
  type EndpointEntry,
  type EndpointRegistry,
} from "./submit/index.js"
import { applyDelta } from "./tree/apply.js"
import { buildElement } from "./tree/builders.js"
import type { TreeDelta, TreeOperation } from "./tree/delta.js"
import { createTree } from "./tree/tree.js"

/** A page of forms: one card per declaration, in the order given. */
const pagePosting = (...declared: readonly unknown[]) => {
  const idFactory = sequentialIdFactory()

  return createTree(
    buildElement(idFactory, {
      type: "loom.page",
      children: declared.map((declaration) =>
        buildElement(idFactory, {
          type: "loom.card",
          ...(declaration === undefined
            ? {}
            : { props: { [SUBMIT_PROP_KEY]: declaration } as never }),
        })
      ),
    }),
    idFactory
  )
}

const asks = new Map<string, number>()

const endpointAnswering = (id: string, action: string): EndpointEntry =>
  defineEndpoint({
    id,
    description: `receives ${id}`,
    endpoint: {
      target: () => {
        asks.set(id, (asks.get(id) ?? 0) + 1)

        return Promise.resolve(
          ok({
            action,
            method: "post" as const,
            fields: [{ name: "csrf", value: `t0ken-${asks.get(id) ?? 0}` }],
          })
        )
      },
    },
  })

const registryOf = (...entries: readonly EndpointEntry[]): EndpointRegistry => {
  const registry = createEndpointRegistry(entries)
  if (!registry.ok) throw new Error(`refused: ${registry.error.code}`)

  return registry.value
}

const spare = sequentialIdFactory("x")
```

### Exercise A — the destinations, read off the tree

```ts
describe("A", () => {
  it("reads the destinations off the tree without asking anybody", () => {
    const tree = pagePosting(
      { to: "newsletter.subscribe" },
      { to: "newsletter.subscribe" },
      { to: "contact.enquiry" },
      { to: "contact.enquiry", action: "https://collect.example.com/harvest" },
      { to: "not a valid id" },
      { action: "https://collect.example.com/harvest" }
    )

    const plan = planTreeSubmissions(tree)

    console.log("endpoints:", plan.endpoints.length, "| submissions:", plan.submissions.length)
    for (const endpoint of plan.endpoints) console.log("  endpoint:", endpoint)
    console.log("posting:", plan.submissions.map((one) => `${one.nodeId}->${one.to}`).join(" "))
    for (const problem of plan.problems) {
      console.log(`  problem: ${problem.nodeId} ${problem.error.path}: ${problem.error.message}`)
    }
  })
})
```

Predict: how many endpoints, how many submissions, and — the part that
separates the answers — **what happens to the fourth card**, which names a
registered endpoint *and* carries an address.

The output:

```
endpoints: 2 | submissions: 3
  endpoint: newsletter.subscribe
  endpoint: contact.enquiry
posting: n_1->newsletter.subscribe n_2->newsletter.subscribe n_3->contact.enquiry
  problem: n_4 loom:submit: Unrecognized key(s) in object: 'action'
  problem: n_5 to: Invalid
  problem: n_6 to: Required
```

**The fourth card does not post to `contact.enquiry`.** It does not post at all.
This is the strictness paying for itself: a lenient schema would have stripped
`action`, honoured `to`, and rendered a working form — which sounds like the
forgiving thing to do and is in fact the seam quietly accepting a declaration
that tried to carry an address. The refusal is the diagnostic, and it names the
key.

Three other things in that output.

**Nothing was asked.** There is no registry in this exercise. `planTreeSubmissions`
is a pure function of the tree, so a host can know exactly where a revision will
try to post before it has anything to post with — and so can a static analysis of
a proposal, which is what Exercise E is built on.

**Two forms, one endpoint, one entry.** Six cards, three of them posting, two
endpoints. Deduplicated in first-encountered order.

**The node ids are the cards, not the page.** `n_1` is the first card and the
page is `n_7`, because the fixture builds children before their parent — the
same thing lesson 04 corrected in this course's own early lessons. If you
predicted `n_2` through `n_7`, you assumed an id says something about position,
which is exactly the assumption lesson 04 exists to remove.

### Exercise B — asked once, and the token they share

```ts
describe("B", () => {
  it("asks once for an endpoint two forms name", async () => {
    asks.clear()

    const tree = pagePosting(
      { to: "newsletter.subscribe" },
      { to: "newsletter.subscribe" },
      { to: "contact.enquiry" }
    )

    const resolution = await resolveSubmissionPlan(planTreeSubmissions(tree), {
      registry: registryOf(
        endpointAnswering("newsletter.subscribe", "/api/newsletter"),
        endpointAnswering("contact.enquiry", "/api/contact")
      ),
    })

    console.log("host calls:", JSON.stringify(Object.fromEntries(asks)))

    for (const id of ["n_1", "n_2", "n_3", "n_4"] as NodeId[]) {
      const outcome = resolution.lookup(id)
      console.log(
        `  ${id}:`,
        outcome?.status === "ready"
          ? `${outcome.target.method} ${outcome.target.action} csrf=${outcome.target.fields[0]?.value}`
          : String(outcome?.status)
      )
    }
  })
})
```

Predict: how many times each endpoint's code runs, and whether the two
newsletter forms get the same CSRF token or different ones.

The output:

```
host calls: {"newsletter.subscribe":1,"contact.enquiry":1}
  n_1: post /api/newsletter csrf=t0ken-1
  n_2: post /api/newsletter csrf=t0ken-1
  n_3: post /api/contact csrf=t0ken-1
  n_4: undefined
```

**The same token, and that is the requirement rather than the saving.** It is
tempting to read the single call as an optimisation — one fewer round trip — but
run the alternative: two forms on a page, each with its own nonce, and a token
store that invalidates on use. The visitor fills in the first, and the second is
now broken. Deduplication here is what makes the page correct.

`n_4` is the page. It declared nothing, so `lookup` returns `undefined` — the
absent state, which is not a failure and does not appear in `problems`.

### Exercise C — seven strings the host wrote

```ts
describe("C", () => {
  it("holds the host's own answer to a schema", () => {
    const actions = [
      "/api/contact",
      "https://forms.example.com/contact",
      "//evil.example/harvest",
      "/\\evil.example/harvest",
      "javascript:fetch('https://evil.example',{method:'POST'})",
      "",
      "api/contact",
    ]

    for (const action of actions) {
      const parsed = submissionTargetSchema.safeParse({ action, method: "post" })

      console.log(
        `${parsed.success ? "ACCEPTED" : "refused "} ${JSON.stringify(action).padEnd(56)}`,
        parsed.success ? "" : `— ${parsed.error.issues[0]?.message ?? ""}`
      )
    }

    console.log("\nwhere a browser would actually send it, from a page on https://site.example/pricing:")
    for (const action of ["/api/contact", "//evil.example/harvest", "/\\evil.example/harvest", "api/contact"]) {
      console.log(
        `  ${JSON.stringify(action).padEnd(28)} -> ${new URL(action, "https://site.example/pricing").href}`
      )
    }
  })
})
```

This is the one to predict most carefully, and the second half is why. Write
down your accept/refuse for all seven **and** your four resolved URLs before you
run it.

The output:

```
ACCEPTED "/api/contact"                                           
ACCEPTED "https://forms.example.com/contact"                      
refused  "//evil.example/harvest"                                 — must be a same-origin path or an absolute http(s) URL
refused  "/\\evil.example/harvest"                                — must be a same-origin path or an absolute http(s) URL
refused  "javascript:fetch('https://evil.example',{method:'POST'})" — must be a same-origin path or an absolute http(s) URL
refused  ""                                                       — must be a same-origin path or an absolute http(s) URL
refused  "api/contact"                                            — must be a same-origin path or an absolute http(s) URL

where a browser would actually send it, from a page on https://site.example/pricing:
  "/api/contact"               -> https://site.example/api/contact
  "//evil.example/harvest"     -> https://evil.example/harvest
  "/\\evil.example/harvest"    -> https://evil.example/harvest
  "api/contact"                -> https://site.example/api/contact
```

**Two strings that begin with a slash resolve to `evil.example`.** That is the
whole exercise. `value.startsWith("/")` — the check almost everybody writes for
"is this a same-origin path" — accepts both of them, and a form carrying either
posts a visitor's typed data to another origin from a page that looks entirely
normal.

The backslash one is worth a second look, because it is not a browser quirk you
can dismiss as legacy: `new URL("/\\evil.example", "https://site.example")` is
`https://evil.example/` under the current URL standard. The normalisation is
specified.

Two things this exercise is *not* saying. It is not saying the host is an
attacker — every one of these is a composition mistake, a template that
concatenated wrong, a config value that arrived empty. And it is not saying
leaving the origin is forbidden: `https://forms.example.com/contact` is
accepted, because a host that means to post off-origin can say so in a way a
reviewer can see. **The rule is that crossing an origin is explicit.**

Notice what the empty string would have meant, too: `action=""` posts to the
current page. Silently. A config value that failed to load becomes a form that
submits a visitor's data to whatever route they happen to be on.

### Exercise D — five ways to have no target, and one way to not be a form

```ts
describe("D", () => {
  it("has three states and no fourth", async () => {
    const tree = pagePosting(
      { to: "contact.enquiry" },
      { to: "newsletter.subscribe" },
      { to: "orders.refund" },
      { to: "audit.log" },
      { to: "tokens.mint" },
      { to: "typo.enqiury" },
      undefined
    )

    const resolution = await resolveSubmissionPlan(planTreeSubmissions(tree), {
      registry: registryOf(
        endpointAnswering("contact.enquiry", "/api/contact"),
        defineEndpoint({
          id: "newsletter.subscribe",
          description: "the mailing list",
          endpoint: {
            target: () =>
              Promise.resolve(err({ code: "unavailable" as const, detail: "token store timed out" })),
          },
        }),
        defineEndpoint({
          id: "orders.refund",
          description: "refunds, staff only",
          endpoint: {
            target: () =>
              Promise.resolve(err({ code: "refused" as const, detail: "not for this audience" })),
          },
        }),
        defineEndpoint({
          id: "audit.log",
          description: "an endpoint whose route moved",
          endpoint: {
            target: () =>
              Promise.resolve(
                ok({ action: "//audit.example/collect", method: "post" as const, fields: [] })
              ),
          },
        }),
        defineEndpoint({
          id: "tokens.mint",
          description: "an endpoint with a bug in it",
          endpoint: {
            target: () => {
              throw new Error("csrf store not configured")
            },
          },
        })
      ),
    })

    for (const id of ["n_1", "n_2", "n_3", "n_4", "n_5", "n_6", "n_7", "n_8"] as NodeId[]) {
      const outcome = resolution.lookup(id)

      if (outcome === undefined) {
        console.log(`  ${id}: (absent) the tree declared nothing`)
        continue
      }

      console.log(
        `  ${id}: ${outcome.status.padEnd(11)}`,
        outcome.status === "ready"
          ? `${outcome.target.action}`
          : `${outcome.unavailable.reason} — ${describeSubmissionUnavailable(outcome.unavailable)}`
      )
    }
  })
})
```

Predict the reason for each of the eight, and — the part that matters — say for
each whether a *primitive* should show the visitor a form.

The output:

```
  n_1: ready       /api/contact
  n_2: unavailable unavailable — the endpoint could not be reached — token store timed out
  n_3: unavailable refused — the endpoint refused — not for this audience
  n_4: unavailable invalid-target — the endpoint answered with a target the seam refuses — action: must be a same-origin path or an absolute http(s) URL
  n_5: unavailable endpoint-threw — the endpoint threw instead of answering — csrf store not configured
  n_6: unavailable no-such-endpoint — no endpoint is registered for it — registered: contact.enquiry, newsletter.subscribe, orders.refund, audit.log, tokens.mint
  n_7: (absent) the tree declared nothing
  n_8: (absent) the tree declared nothing
```

Five reasons and the absent state, which is the whole vocabulary.

**`n_4` is the one to look at twice.** The host is registered, its code ran, it
returned successfully, and the form still has no target — because the action it
returned was `//audit.example/collect`, which is Exercise C arriving from the
other direction. This is the only one of the five where nothing failed: the
endpoint behaved exactly as written, and the seam refused the answer. That is
what "the type is a claim made when the code was written" means in practice.

**`n_5` threw and the page did not.** One `try`, the same single `try` the data
seam has, in the same place and for the same reason: an endpoint is not Loom's
code, and one host's broken token store must not be why a whole page 500s.

**Two of them are only knowable by calling.** `unavailable` and `refused` are
the host's own vocabulary — *ask again later* versus *not for you* — and they
are separate because a primitive shows different things for them and only one is
worth retrying.

Now the second half of the prediction. `n_2` says *we cannot take this right
now*; `n_3` says *this is not for you*; `n_7` is not a form. If your answer for
all six failing cases was the same rendering, look again at why the fourth state
does not exist: 0073 requires a form with no target to render **disabled and say
so**, and it can only do that because these reasons are distinguishable.

### Exercise E — a redirection is a fact about two trees

```ts
describe("E", () => {
  it("measures a redirection between two trees, not off the operations", () => {
    const before = pagePosting(
      { to: "newsletter.subscribe" },
      { to: "contact.enquiry" },
      { to: "contact.enquiry" },
      undefined
    )

    const change = (label: string, operations: readonly TreeOperation[]) => {
      const delta: TreeDelta = {
        deltaId: spare.deltaId(),
        treeId: before.treeId,
        baseRevision: 0,
        operations: [...operations],
      }

      const applied = applyDelta(before, delta)
      if (!applied.ok) throw new Error(applied.error.code)

      const moved = redirectedSubmissionsBetween(before.root, applied.value.root)

      console.log(
        `${label.padEnd(44)} ${moved.length} —`,
        moved.map(describeRedirectedSubmission).join("; ") || "nothing"
      )
    }

    const set = (nodeId: string, to: string): TreeOperation => ({
      op: "configure",
      nodeId: nodeId as NodeId,
      set: { [SUBMIT_PROP_KEY]: { to } },
      unset: [],
    })

    change("moves one form to another endpoint", [set("n_1", "contact.enquiry")])
    change("moves two", [set("n_2", "newsletter.subscribe"), set("n_3", "newsletter.subscribe")])
    change("gives an unposted node a destination", [set("n_4", "contact.enquiry")])
    change("unsets a destination", [
      { op: "configure", nodeId: "n_1" as NodeId, set: {}, unset: [SUBMIT_PROP_KEY] },
    ])
    change("breaks a declaration so it stops parsing", [
      { op: "configure", nodeId: "n_1" as NodeId, set: { [SUBMIT_PROP_KEY]: { to: "not an id" } }, unset: [] },
    ])
    change("moves it and moves it back", [
      set("n_1", "contact.enquiry"),
      set("n_1", "newsletter.subscribe"),
    ])
  })
})
```

Predict all six counts. Four of them are zero, and getting which four right is
the exercise.

The output:

```
moves one form to another endpoint           1 — n_1 from newsletter.subscribe to contact.enquiry
moves two                                    2 — n_2 from contact.enquiry to newsletter.subscribe; n_3 from contact.enquiry to newsletter.subscribe
gives an unposted node a destination         0 — nothing
unsets a destination                         0 — nothing
breaks a declaration so it stops parsing     0 — nothing
moves it and moves it back                   0 — nothing
```

**The last row is the one that shows what "measured between two trees" buys.**
Two operations, both of them configuring `loom:submit`, and the factor reports
nothing — because the tree that came out posts exactly where the tree that went
in did. A measurement taken off the operations would have counted two
redirections in a change that redirected nothing, and a reviewer would have been
asked to confirm a move that did not happen. Do that often enough and
confirmation becomes something people click through.

**Rows three, four and five are all "not this fact", for two different reasons.**
Giving an unposted node a destination creates an expectation rather than moving
one — nobody's belief about where their message goes is being changed. Unsetting
one, and breaking one so it stops parsing, are the same event as far as the page
is concerned: a form that stops posting. That is real, and 0071 says out loud
that it is *not covered here*, because "the destination moved" and "the form
broke" are different sentences for a reviewer and the second one is already a
render-time diagnostic.

Notice what row five implies. A malformed declaration reads as a loss because
that is what the page does with it — `planSubmissionsIn` reports a problem and
the node renders with no target. A redirection has to be somewhere a visitor's
data will actually arrive.

### Exercise F — the rule that does not care who asked

```ts
type Ask = { readonly origin?: IntentOrigin; readonly confidence?: number }

const proposalOf = (delta: TreeDelta, ask: Ask = {}): ProposedChange => ({
  proposalId: spare.proposalId(),
  intentId: spare.intentId(),
  delta,
  rationale: "teaching",
  provenance: {
    origin: ask.origin ?? "user-instruction",
    interpreter: "scratch",
    authoredBy: "model",
    confidence: ask.confidence ?? 0.9,
    interpretedAt: "2026-08-16T00:00:00.000Z",
  },
})

describe("F", () => {
  it("holds a redirection whatever the origin's ceiling allows", () => {
    const tree = pagePosting({ to: "newsletter.subscribe" }, { to: "contact.enquiry" })

    const verdict = (label: string, policy: GatePolicy, ask: Ask, operations: TreeOperation[]) => {
      const delta: TreeDelta = {
        deltaId: spare.deltaId(),
        treeId: tree.treeId,
        baseRevision: 0,
        operations,
      }

      const assessed = assessChange(tree, proposalOf(delta, ask), policy, spare.deltaId())
      if (!assessed.ok) throw new Error(assessed.error.code)

      const disposition = gate(assessed.value, policy)

      console.log(
        label.padEnd(46),
        JSON.stringify({
          stakes: disposition.stakes,
          kind: disposition.kind,
          reason: disposition.reason.code,
        })
      )
    }

    const move: TreeOperation = {
      op: "configure",
      nodeId: "n_1" as NodeId,
      set: { [SUBMIT_PROP_KEY]: { to: "contact.enquiry" } },
      unset: [],
    }
    const rename: TreeOperation = {
      op: "configure",
      nodeId: "n_2" as NodeId,
      set: { title: "Get in touch" },
      unset: [],
    }

    const permissive = gatePolicySchema.parse({
      ...defaultGatePolicy,
      autoApplyCeilings: {
        "user-instruction": "high",
        "developer-action": "high",
        "system-maintenance": "high",
      },
    })

    verdict("an ordinary configure, user instruction", defaultGatePolicy, {}, [rename])
    verdict("a redirection, user instruction", defaultGatePolicy, {}, [move])
    verdict("a redirection, developer action", defaultGatePolicy, { origin: "developer-action" }, [move])
    verdict("a redirection, ceilings all raised to high", permissive, { origin: "developer-action" }, [move])
    verdict("an ordinary configure, ceilings raised", permissive, { origin: "developer-action" }, [rename])
  })
})
```

Predict all five verdicts. The fourth row is the one that decides whether you
have understood the rule or only the stake level.

The output:

```
an ordinary configure, user instruction        {"stakes":"low","kind":"accepted","reason":"within-policy"}
a redirection, user instruction                {"stakes":"high","kind":"requires-confirmation","reason":"redirected-submission"}
a redirection, developer action                {"stakes":"high","kind":"requires-confirmation","reason":"redirected-submission"}
a redirection, ceilings all raised to high     {"stakes":"high","kind":"requires-confirmation","reason":"redirected-submission"}
an ordinary configure, ceilings raised         {"stakes":"low","kind":"accepted","reason":"within-policy"}
```

**Row four is a policy that explicitly says "auto-apply anything up to `high`",
and the change is held anyway.** That is not the ceiling mechanism from lesson
09 failing; it is a different mechanism, and comparing rows four and five shows
it cleanly. The same policy, the same origin, the same operation *kind* — a
`configure` on one node — and one is accepted while the other waits for a
person. The only difference is which prop changed.

And note the reason code. It is not `stakes-above-ceiling`, which is what a
level-based hold would produce; it is `redirected-submission`. A reviewer reading
their queue is told **this form now posts somewhere else**, with both endpoint
ids in the sentence, rather than *high stakes exceeded your ceiling*. That is
lesson 09's argument about a rule ladder arriving in a place lesson 09 could not
have anticipated: order encodes precedence, and a named rule that fires early
produces a better sentence than a threshold that fires late.

If you predicted row four as `accepted` — that is lesson 09 answering correctly
from what lesson 09 knew. What this rule adds is that origin is the wrong axis
for one specific fact.

---

## It could have been otherwise

Five, and the first two are the ones a reasonable person ships.

**An endpoint as a data source that answers with a URL.** No new machinery at
all: `defineSource` already validates params, catches throws, and answers `ready`
or `unavailable`, and a target is JSON. Rejected on two counts. The primitive
receives `JsonValue` and has to re-parse it, which puts an unchecked cast in
every form author's lap. And it collapses the distinction that is the entire
point — a source is a read and an endpoint is a write, and a reviewer looking at
a catalogue needs to see which registrations can *receive a stranger's data*. One
mechanism serving both would list them together.

**A URL prop, validated by an allowlist of hosts.** The cheapest thing that
works, and probably what you wrote for Predict 1. It fails at the first
deployment that does not know its own production hostname at build time. Worse,
it makes the address part of the revision: the tree carries it, the delta carries
it, the log records a *model* having chosen it, and rotating a URL becomes a
proposal through the Gate.

**Params on the declaration, guarded by a schema like 0058's.** Argued above,
and worth naming what it gives up: exactness. Twenty registrations instead of
one, in exchange for an allowlist that is a list rather than a computation.

**Letting the primitive render its own action from a prop the host wires through
React context.** It works, and it puts the framework outside the one decision it
most needs to be inside. A host wiring context per primitive is a host
reimplementing this seam once per form, differently each time, with no
diagnostic when it forgets one.

**A synchronous registry lookup, with tokens threaded through
`RenderRequest.context`.** Half the machinery — no plan, no resolve, no async. It
pushes minting into whatever the host does before calling `renderRequest`, which
means every deployment builds the same token plumbing by hand and the seam has no
idea whether it happened.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections while
you write. Then compare.

1. **Derive this lesson from lesson 18, and then find where the derivation
   fails.** Both seams keep something out of the tree, both use plan → resolve →
   render, both have three states. Write the paragraph that shows they are one
   idea. Then name the place they diverge and say what property of the world —
   not of the code — forces the divergence. If your answer is "writes are more
   dangerous", keep going: that is the motivation, and there is a structural
   reason underneath it about what varies.

2. **Say what a reviewer approves when they approve a form.** Lesson 18 asked
   what an approval covers when the thing approved is a question; this is the
   same question about a destination, and the answer is a different shape. Write
   one paragraph. Then apply it to a case this lesson did not cover: a
   deployment renames `contact.enquiry` to `contact.general` in its registry and
   changes nothing in any tree. What happens, who finds out, and *when* — and
   which of the five reasons in Exercise D is the one that fires?

Predict, before writing (1): if your paragraph's punchline is that both move an
untrusted value out of AI's reach, you have described the mechanism and not the
argument. The argument is about the difference between a value that varies and a
value that only appears to.

---

## Self-check

Six questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. State why a scheme allowlist is the right tool for an `href` and the wrong
   tool for a form action. Give the answer as a property of the *check* rather
   than as a claim about how bad each outcome is.
2. A binding has AI-authored params and a submission has none. Give the
   structural reason. Then give the strongest argument for the other side —
   there is a real one — and say what a deployment pays because it lost.
3. Name the five reasons a form has no target. Say which one means the host's
   code ran and returned successfully, and which one could not exist if the seam
   trusted the host's types.
4. There is no way to declare "no target, and that is fine." Say what would
   become possible if there were, and name the decision record that would stop
   being enforceable.
5. `redirectedSubmissionsBetween` reports nothing for a change that moves a
   destination and moves it back. Say why that is right rather than a missed
   case, and name what the design would have to give up to catch it.
6. `redirected-submission` is `high` where `nested-target` is `critical`, and it
   still gets a Gate rule of its own that ignores the origin ceiling. Explain
   both halves: why not `critical`, and why the level alone was not enough.

Question 2 is the one this lesson is really about. Question 6 is the one to be
least satisfied with a short answer to.

---

## Reflect

Write for two minutes, then move on.

- Which prediction were you most confidently wrong about? If it was Predict 3,
  say what rule you were actually applying to those seven strings, and where else
  in this course you have accepted a value because of how it was *shaped* rather
  than what it *meant*.
- Predict 1 asked you to design this yourself. Look at what you wrote. Did you
  reach for a better check, or for a different place to put the value? Most
  people reach for the check — say what in the course so far should have pointed
  the other way, and why it did not.
- Lesson 18 removed a data answer from the tree; this one removed an address.
  Both were replaced by a name from a host-written registry. Say what a third
  removal would look like — 0065 and this lesson both hint at one — and what the
  registry for it would contain. Then say what would make something *not* a
  candidate.
- 0065 shipped naming two things it had not done, and both are now done by other
  records. Say what that says about the value of writing down what a decision
  does not cover, and find one other place in this course where an open question
  in a record became the next piece of work.

---

## Come back to this

Set X in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 04, 07, 09, 14, 15 and 18 — and it is the first set that asks
you to hold two seams side by side and say where they *disagree*, which is the
discrimination the interleaving has been building towards.

Part V now has two lessons, and they rhyme deliberately: a question the tree
asks, and a sentence the tree cannot finish. The pattern both share — *a name in
the tree, an address in a registry, resolved before the walk* — is a shape rather
than a coincidence, and the honest position is that nobody yet knows how many
more times it recurs. A frame's origin looks like the third
([0095](../decisions/0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md)),
and whether that is a lesson or a footnote is a judgement for whoever is learning
this rather than whoever is writing it down.
