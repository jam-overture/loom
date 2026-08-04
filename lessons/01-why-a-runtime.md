# 01 — Why a runtime, not a code generator

**After this lesson you will be able to** explain why Loom refuses to let AI
write code, what that refusal costs, and why every later constraint in the
system exists to protect it.

**Prerequisites:** none.

---

## Predict

**Answer these in writing before reading on.** You are not expected to get them
right — attempting and missing is what makes the explanation stick. Give it two
minutes, not twenty.

> You are building a product page. A user types: *"Move the reviews above the
> fold and make the buy button louder."* You wire up a model that reads
> `ProductPage.tsx` and writes a new version.
>
> 1. Your CTO asks you to enforce one rule: *AI may rearrange the page, but must
>    never touch checkout.* How would you implement that check?
> 2. Three weeks and two hundred AI-authored changes later, conversion has
>    dropped. How do you find which change did it?
> 3. Having found it, how do you undo **just that one**?

Keep what you wrote. You will compare against it at the end.

---

## The problem

You have a product page. A user says:

> "Move the reviews above the fold and make the buy button louder."

The obvious thing to build is a code generator. The model reads
`ProductPage.tsx`, writes a new version, you diff it and deploy. This works in a
demo. Now put it in production and ask four questions.

**1. What exactly changed?**

You have a diff. Forty lines moved, some JSX reindented, a `className` edited.
Somewhere in there is the actual change. To know whether the reviews moved above
the fold, you have to read the code and simulate it in your head — or run it and
look. The diff does not tell you; it shows you the *text* that changed, not the
*change*.

**2. Was it allowed?**

Suppose you want a rule: *AI may rearrange the page freely, but it may not touch
checkout.* Now write that rule against a diff. You are pattern-matching on source
text. A rename defeats you. A refactor that moves the checkout button into a
shared component defeats you. There is no place to stand where you can ask "does
this change touch checkout?" and get a reliable answer.

**3. Who caused it?**

Three weeks later conversion has dropped. Which of the two hundred AI-authored
changes did it? You have commits. Each is a text diff with a message the model
wrote about itself. Nothing connects a commit to *the sentence a user typed* and
*the decision that let it through*.

**4. Can you undo just that one?**

The change you want to revert was four deploys ago and eleven changes have
landed on top of it, three of which touch the same file. `git revert` gives you a
conflict, not an undo.

Every one of these fails for the same underlying reason: **the change was
delivered as text, and text is not a reviewable unit.** The model's output is
the least structured possible representation of what it decided.

---

## The idea

Stop asking the model for code. Ask it for **a change, described as data**.

Loom makes two moves.

**The UI is a tree, not a file.** A validated data structure — nodes with kinds,
props, and children. Not source code that produces a UI; the UI itself, as data.

**A change is a delta, not a diff.** An ordered list of discrete operations:
insert this node here, move that one there, set this prop. Not a description of
edited text — a description of edited *structure*.

Now re-ask the four questions:

| Question | With a diff | With a delta |
| --- | --- | --- |
| What changed? | Read 40 lines and simulate | `move n_17 → n_3[0]`, `configure n_22 {tone: "loud"}` |
| Was it allowed? | Pattern-match source text | Ask whether any touched node is a `commerce.checkout` |
| Who caused it? | A commit message | The intent, the interpreter, and the rule that permitted it |
| Undo just this? | Revert and pray | Apply its inverse — which was computed before it was applied |

The second column is not better because the format is nicer. It is better
because **the change is now a value you can pass to a function.** Once a change
is a value, deciding about it is programming rather than heuristics — and that
function can be pure, tested, and audited.

That function is the Gate, and it is the reason the whole system is shaped this
way. You will meet it properly in lesson 09.

---

## What this costs

Be clear-eyed: this is a trade, not a free win.

**The model can only build from a fixed vocabulary.** Loom has a registry of
primitives. If a deployment registers `card`, `stack` and `button`, the model can
compose those and nothing else. It cannot invent a carousel. If you need one, a
human writes it and registers it, and *then* AI can use it.

That is the whole bargain: **expressiveness for reviewability.** A code generator
can build anything and you can vouch for none of it. Loom builds from a bounded
set and can account for every change to the last node.

The bargain is only worth it if the vocabulary is good. A registry of five
primitives makes a toy. This is why §4 — the SDK and the registration contract —
matters as much as the Gate: the system's ceiling is set by how easy it is to add
a well-behaved primitive.

---

## In the code

You do not need to read these yet. Know they exist.

| Idea | Where |
| --- | --- |
| The tree | [`src/tree/node.ts`](../src/tree/node.ts) |
| The delta | [`src/tree/delta.ts`](../src/tree/delta.ts) |
| Applying one | [`src/tree/apply.ts`](../src/tree/apply.ts) |
| The decision | [`src/runtime/gate.ts`](../src/runtime/gate.ts) |
| The whole flow | [`src/runtime/pipeline.ts`](../src/runtime/pipeline.ts) |

---

## It could have been otherwise

Three alternatives were live, and each was rejected for a reason worth knowing.

**Let the model emit code, and review it harder.** This is what most of the
field does. It fails on question 2 and 3 above, and no amount of review
tooling fixes it, because the information you need was never in the artefact.

**Let the model emit a whole replacement tree.** Structured — so it fixes the
"can't parse it" problem — but it collapses *what changed* back into something
you have to reverse-engineer by diffing two trees. And a tree-diff is a worse
input to a Gate than the operations that produced the tree, because the model
knew its intent and the diff has to guess. This is why whole-tree replacement is
deliberately **not** one of the four operations.

**Let the model emit a constrained flat list of sections.** Loom's predecessor
in the `hermes` repo did exactly this: a page was a flat list of block
instances, re-authored wholesale on every edit. It solved "no arbitrary code"
and kept "opaque change" — and a flat list cannot express nesting, so it cannot
express a general UI. Loom is not migration-compatible with it, and that was
accepted going in.

---

## Explain it back

Closed book. Do not scroll up.

1. Explain to a colleague, in **four sentences or fewer**, why Loom does not let
   AI write code. No jargon from this lesson — if you use the word "delta", define
   it in the same breath.

2. Think of a system you have worked on where an automated process changed
   something and you later could not tell what or why. Which of the four
   questions failed there? Would Loom's trade have helped, or was your problem
   somewhere else entirely?

3. Now argue the **other side**: describe a product where a code generator is
   genuinely the better choice, and say what makes it different.

Question 3 is not a rhetorical exercise. If you cannot argue against a design,
you do not yet understand what it costs.

---

## Self-check

For each question: write your answer, **then rate your confidence 1–5**, *then*
reveal. The gap between your rating and your accuracy is the thing worth
watching — most people are overconfident on 1 and underconfident on 3.

1. A colleague says: "We could get the same safety by having the model emit code
   and then running a linter that forbids touching checkout files." What is wrong
   with this?

2. Loom cannot build a carousel unless someone registers a carousel primitive. Is
   that a bug, a limitation, or the point?

3. Why is a delta a better input to a policy decision than a diff of two trees,
   given that both are structured data?

4. What single property does the rest of the system exist to protect?

---

## Reflect

Compare what you wrote in **Predict** against the lesson.

- Which of the three did you get closest to? Which did you not see at all?
- Your answer to Predict Q1 was probably some form of "check the file paths" or
  "check the diff". What did you assume was available to check, and why was it
  not?
- What is one thing you now think is true that you did not think an hour ago?

---

## Come back to this

- **In 2 days:** Self-check questions 1 and 4, closed book.
- **In 1 week:** Explain it back, question 1 — the four-sentence version, out
  loud, without rereading.
- See [`review-schedule.md`](review-schedule.md).

---

## Deeper

- [`decisions/0001`](../decisions/0001-tree-and-delta-as-the-unit-of-change.md) — the founding decision, in its own words
- [`README.md`](../README.md) — the build order and what has been built
- Next: [02 — UI as data: the tree](02-ui-as-data.md)

---

## Answers

1. The linter reads source text, so it inherits every failure of text. A rename,
   an extraction into a shared component, or an import indirection defeats it —
   not through cleverness, just through ordinary refactoring. And it still gives
   you nothing for questions 3 and 4: no attribution, no undo. It moves the
   check earlier without making it reliable.

2. The point — but only conditionally. It is the deliberate half of the trade:
   bounded vocabulary buys reviewability. It becomes a real limitation if
   registering a new primitive is hard, which is why the SDK is a first-class
   part of the system rather than an afterthought.

3. Because a delta records *intent*, and a diff records *outcome*. The model knew
   it was moving the reviews section; a tree-diff has to infer that from a node
   disappearing in one place and appearing in another — and it cannot reliably
   distinguish "moved" from "deleted and separately created", which are very
   different changes to reason about. Structure is necessary but not sufficient;
   the delta preserves information a diff destroys.

4. That a proposed change is a **value you can pass to a function** — inspectable,
   gateable, attributable, reversible. Every later constraint (only four
   operations, stable ids, purity, inverse deltas) exists to keep that true.
