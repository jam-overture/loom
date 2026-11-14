import { apiEntries } from "./api/reference"

/**
 * Every sentence on this site that tells a reader to do work, paired with the
 * measurement that will say when the runtime starts doing it for them.
 *
 * **The plain version.** A page here can be wrong in three ways, and two of
 * them already have an instrument.
 *
 * A sentence saying something **is** so is held up by the thing itself: an
 * example that stops rendering is a red test, a count is printed off the
 * registry, a code block is compiled. A sentence saying Loom **lacks** a name
 * has `absences.ts`, which ships the claim beside the measurement that will
 * contradict it.
 *
 * The third kind is a sentence that tells the reader to do something —
 * *"remember to stop the broadcaster"*, *"you still check the shape
 * yourself"*, *"there is no override, so change the policy"*. Each of those is
 * **a claim about what the runtime will not do for you**, and each goes stale
 * the day the runtime starts doing it. While it is stale it does not read as a
 * lie. It reads as ordinary writing, and a stranger does the work.
 *
 * ## What that cost, once, measurably
 *
 * On 9 November two sentences at the foot of *What your readers do* were found
 * false, and both had been for days:
 *
 * | the page said | false since |
 * | --- | --- |
 * | a broadcaster watches only the nodes present when it started | at or before 6 November |
 * | a new revision is a new broadcast, so `stop()` the broadcaster and start another | 7 November, when 0366 gave a broadcast the document form |
 *
 * The second is the shape this file is for. It was an **instruction**, and
 * following it would not have lost a reader any data — it would have given
 * them **wrong** data, every signal after a navigation filed under the page
 * the reader left. And the suite was green the whole time, because a test
 * asserted the page still said the sentence. A test that pins prose reads as a
 * test that holds prose to something.
 *
 * ## Why the net is this narrow, in numbers
 *
 * The finding that asked for this file recommended counting before building,
 * on the grounds that the wrong net would be worse than none. The counts, over
 * the thirty-five written pages:
 *
 * | the net | matches | what they are |
 * | --- | --- | --- |
 * | a sentence opening in an imperative verb — *Press a chip*, *Run it*, *Look at what is not there* | **97** | the tutorial voice, and this site is a tutorial. Nearly none is a claim about the runtime |
 * | *by hand* | **11** | the alternative the runtime removes — *writing it out by hand is miserable* — rather than work it leaves a reader |
 * | the host in the third person — *your app has to*, *a deployment must* | **7** | six are the title of *What your app has to do* in a link, and the seventh is a sentence about a host that switches on seven codes |
 * | the second person under an obligation, which is what is swept below | **19** | the registry |
 *
 * **So the imperative is not the marker.** *Press a chip and watch the
 * revision go up* is a page teaching, and a net that flags it flags a hundred
 * sentences to find three. What distinguishes the dangerous sentence is not
 * that it tells the reader to act — it is that it tells them the work is
 * **theirs**, which in English is the second person plus an obligation:
 * *you have to*, *you need to*, *yourself*, *remember to*, *do not expect*.
 *
 * The third-person count is worth keeping for the next writer: this site
 * **writes its host obligations in the second person**, so a page that starts
 * writing *a deployment must* is a page this sweep goes quiet on. The pattern
 * is below and matches almost nothing today; it is here so the first one is
 * flagged rather than missed.
 *
 * ## What a registered instruction has to carry
 *
 * The same thing a registered absence carries, deliberately — this is
 * `SiteAbsence` with one word changed, because the claim is the same claim
 * from the reader's side. *You check the shape yourself* and *Loom has nothing
 * that checks the shape* are one fact, and the second is how you measure the
 * first.
 *
 * ## What this found on the day it was written
 *
 * An unregistered absence, which is the thing it was least expected to be
 * useful for. *What AI may change* says, of a refusal, **"There is no button
 * that turns it into a yes, and no reviewer who can wave it through."** That
 * is a claim about what Loom lacks and it belongs in `absences.ts` — but it
 * carries no dated word, so the dated sweep passed over it, and no run had
 * registered it by hand. The instruction one sentence later is what this net
 * caught it by: *if you find yourself wanting one, change the policy*.
 *
 * It is registered here rather than moved, because the sentence a reader acts
 * on is the instruction and that is the sentence that should be beside the
 * measurement.
 *
 * ## What this cannot see
 *
 * The same blind spot `absences.ts` has, and it is worth stating twice: only
 * written pages, and only their prose. An instruction a component renders is
 * reached by rendering. An instruction inside a code fence is a comment about
 * the example.
 *
 * And it cannot see an instruction written without an obligation marker. *The
 * broadcaster watches the nodes present when it started* was one of those: a
 * statement of fact whose only purpose on the page was to make a reader write
 * a workaround. Nothing short of reading the page catches that, and what
 * catches it instead is the rule the 9 November finding ends on — **an
 * instruction wants the measurement beside it, or it does not get to be
 * there.** This file is the net under that habit, not the habit.
 */

/** Work this site tells a reader to do, because the runtime will not do it. */
export type ReaderInstruction = {
  readonly id: string
  /** The page the sentence is on, as a reader's address. */
  readonly page: string
  /**
   * Distinctive fragments of the sentences that give the instruction, as the
   * page writes them.
   *
   * Short and centred on the obligation, so that improving the prose around an
   * instruction costs nothing and changing the instruction itself costs an
   * edit here.
   */
  readonly says: readonly string[]
  /** One plain sentence: what the reader has to do, and what Loom does not do. */
  readonly of: string
  /** Where the measurement reads, for somebody who wants to go and look. */
  readonly from: string
  /**
   * What now exists that would do the work for them. Empty while the
   * instruction holds.
   *
   * A list rather than a boolean so the failure names what it found, which is
   * the difference between a run that goes to the sentence and a run that goes
   * reading.
   */
  readonly found: () => readonly string[]
  /** One sentence: what the page should say instead, on the day this goes red. */
  readonly whenItLands: string
}

/** A group of sentences the sweep flags that are not instructions. */
export type NotAnInstruction = {
  /** Why none of these is work the runtime leaves to a reader. */
  readonly reason: string
  /** The fragments, centred on the marker, exactly as the pages write them. */
  readonly says: readonly string[]
}

/** Every published symbol whose name a caller picks out, with its signature. */
const publishedDeclarations = (): readonly { readonly name: string; readonly signature: string }[] =>
  apiEntries.flatMap((entry) =>
    entry.groups.flatMap((group) =>
      group.symbols.map((symbol) => ({ name: symbol.name, signature: symbol.signature }))
    )
  )

/**
 * The published signature of one declaration, read off the generated reference.
 *
 * The reference is built from the declaration files in `dist/`, so this
 * measures what a reader can actually import rather than what `src/` happens
 * to contain — and it means an instruction can be held against the **shape** a
 * reader is handed rather than only against a list of names.
 */
export const publishedSignatureOf = (name: string): string | undefined =>
  publishedDeclarations().find((declaration) => declaration.name === name)?.signature

/** Every published name, for an instruction measured by something appearing. */
export const everyPublishedName = (): readonly string[] =>
  publishedDeclarations().map((declaration) => declaration.name)

/**
 * Whether a published signature names the source an answer came from.
 *
 * Named and exported so the test can ask it both ways round. A measurement
 * that is only ever asked about today's declaration passes identically when
 * the pattern inside it has stopped matching anything, which is the way a
 * guard dies quietly.
 */
export const namesASource = (signature: string): boolean => /\bsource\b/i.test(signature)

/** Whether a published name would turn a verdict into a different one. */
export const overridesAVerdict = (name: string): boolean =>
  /override|bypass|exempt|waive/i.test(name)

/** The command kinds a published union of commands offers. */
export const commandKindsIn = (signature: string): readonly string[] =>
  [...signature.matchAll(/kind:\s*"([^"]+)"/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]]
  )

/** What `loom` does today, which is write files and stop. */
export const SCAFFOLDING_COMMANDS: readonly string[] = ["init", "add-primitive", "help"]

/**
 * The two readings that take a published signature, each as a function of the
 * signature rather than of the reference.
 *
 * Extracted because of a mutation that survived: a measurement that answers
 * *nothing found* when the declaration it reads **has gone** is a measurement
 * that passes forever, and with the declaration present no test could reach
 * that branch. A guard whose failure mode is silence is the thing this whole
 * directory exists to avoid, so the branch is a value a test can hand in.
 */
export const sourceNamedOnAnAnswer = (outcome: string | undefined): readonly string[] => {
  if (outcome === undefined) return ["DataOutcome is no longer published"]

  return namesASource(outcome) ? [`DataOutcome now carries a source: ${outcome}`] : []
}

export const commandsBeyondScaffolding = (command: string | undefined): readonly string[] => {
  if (command === undefined) return ["CliCommand is no longer published"]

  return commandKindsIn(command).filter((kind) => !SCAFFOLDING_COMMANDS.includes(kind))
}

/**
 * The instructions, each with the thing that would make it unnecessary.
 *
 * Three. Each is a sentence a stranger acts on, so each is a sentence worth
 * the cost of being held to something.
 */
export const READER_INSTRUCTIONS: readonly ReaderInstruction[] = [
  {
    id: "check-the-shape-yourself",
    page: "/docs/building-with-loom/where-content-comes-from",
    says: ["You still check the shape yourself", "never told which source it was bound to"],
    of: "A primitive is handed an answer and not the source it came from, so whether a row can be drawn is a question only the primitive can ask — three lines the reader writes.",
    from: "the published signature of `DataOutcome`, which is the whole of what a bound primitive is handed for a name",
    found: () => sourceNamedOnAnAnswer(publishedSignatureOf("DataOutcome")),
    whenItLands:
      "An answer that names its source is an answer the runtime could validate against the binding's schema, so say which of the two checks is now the runtime's and which three lines a primitive still owes — a reader who stops writing them because half the job moved is the worst outcome of this page.",
  },
  {
    id: "call-the-library-yourself",
    page: "/docs/getting-started/scaffolding-a-project",
    says: ["library code you call yourself"],
    of: "The CLI scaffolds and stops: it writes files and never runs a page, so everything after `loom init` is the reader calling the library.",
    from: "the published `CliCommand`, which is every command `loom` parses",
    found: () => commandsBeyondScaffolding(publishedSignatureOf("CliCommand")),
    whenItLands:
      "A third command means the terminal does something a reader was told to write, so say what it does and where it stops — the sentence's value is the boundary, and a boundary that has moved and not been redrawn is worse than none.",
  },
  {
    id: "change-the-policy-not-the-verdict",
    page: "/docs/building-with-loom/what-ai-may-change",
    says: ["If you find yourself wanting one", "no reviewer who can wave it through"],
    of: "Nothing published turns a refusal into a yes, so a deployment that wants a refused change allowed has to change the policy under a new name.",
    from: "every published name, swept for one that overrides, bypasses, exempts or waives a verdict",
    found: () => everyPublishedName().filter(overridesAVerdict),
    whenItLands:
      "Say who may use it and what it leaves in the history, because the callout's argument is that a refusal is evidence rather than an obstacle — and an override that leaves no record is the one thing this framework claims cannot happen.",
  },
]

/**
 * The sentences the sweep flags that are not instructions, and why.
 *
 * Grouped by the reason rather than listed one by one, because the reasons are
 * what a writer needs and they repeat. The largest group by far is the second
 * person used rhetorically — *the part you cannot reconstruct later* — which is
 * the price of keeping `you cannot` in the net, and it is worth paying: of the
 * sentences on this site that say Loom will not do something, that is the
 * phrase most of them would be written in.
 */
export const NOT_AN_INSTRUCTION: readonly NotAnInstruction[] = [
  {
    reason:
      "The second person used rhetorically: a statement about what a reader can know or reconstruct, which asks them to do nothing.",
    says: [
      "the part you cannot reconstruct later",
      "a change you cannot describe is a change you cannot review",
      "you already know you cannot measure the page",
      "a state you cannot reach by waiting for it",
      "you cannot tell whether anything is broken",
      "a template you have to reconstruct",
    ],
  },
  {
    reason:
      "A step of the tutorial the reader is reading, which is work the page is teaching rather than work the runtime left behind.",
    says: ["Build the tree yourself", "the map you need to write your first import"],
  },
  {
    reason:
      "The reader's own machine or their own past: where they are sitting, or what they did on an earlier page.",
    says: [
      "on your own machine",
      "you said yes yourself",
      "Your site is running on your own server, somewhere Loom has never been.",
    ],
  },
  {
    reason:
      "A capability rather than an obligation — something the reader *may* do, where the sentence's point is that it is available.",
    says: ["You can read the delta for yourself"],
  },
  {
    reason:
      "A sentence introducing a produced list, so what it claims is read off the published door on every build rather than typed. `ContractSuites` is the measurement, beside the sentence, already.",
    says: [
      "for each seam you can implement yourself",
      "any seam you implemented yourself",
    ],
  },
  {
    reason:
      "Work the reader does to find something out, where the page answers it in the next line. The obligation is to read on.",
    says: ["you need to know which primitives they reach for"],
  },
  {
    /**
     * These are the inverse claim and they cannot go stale in the direction
     * this file guards. The failure mode here is the runtime starting to do
     * something a page says it will not; a sentence saying *there is nothing
     * for you to add* breaks the other way, and on these three pages it breaks
     * loudly — each sits beside a produced table or a mounted example that
     * would stop rendering first.
     */
    reason:
      "A sentence denying an obligation: it tells a reader there is nothing to write, set or run, and the produced thing beside it is what would fail if that stopped being true.",
    says: [
      "The two lists you should not write by hand",
      "The one list you should not write by hand",
      "needs a table you have to add",
      "not something your code has to opt into",
    ],
  },
  {
    reason:
      "The page's own title, which names the obligations the page is about rather than giving one.",
    says: ["# What your app has to do"],
  },
  {
    reason:
      "A hypothetical host in an argument about the runtime's design, which asks nothing of the reader's.",
    says: [
      "A host that switches on seven codes has to hold all of them",
      "a caller that has to catch has a path on which the page is lost",
    ],
  },
]

/**
 * The markers that make a sentence an instruction to the reader.
 *
 * Two groups and they are not the same kind of evidence.
 *
 * The first is the second person under an obligation, which is what this site
 * actually writes: 19 sentences, every real instruction on it among them.
 *
 * The second is the host in the third person — *your app has to*, *a
 * deployment must*. It matches seven sentences and six of those are the title
 * of *What your app has to do* in a link. It is here because the pattern that
 * matches nothing today is the one that catches the first sentence somebody
 * writes in a voice this sweep would otherwise be blind to, and `absences.ts`
 * keeps four such patterns for the same reason.
 *
 * `by hand` is **not** here. It matches eleven sentences and all eleven are
 * the alternative the runtime removes — *that list is worked out rather than
 * kept by hand* — which is the opposite claim, and registering eleven reasons
 * to catch none would teach the next writer that this list is a formality.
 */
const OBLIGED = new RegExp(
  [
    "you (?:will |'ll )?have to",
    "you need(?:ed)? to",
    "you will need",
    "you must",
    "you should",
    "you are expected to",
    "up to you",
    "remember to",
    "do(?: not|n't) expect",
    "yourself",
    "on your own",
    "you cannot",
    "you can't",
    "your (?:app|application|deployment|host|server|code|project)[^.]{0,40}?(?:has to|have to|must|needs? to|is responsible)",
    "(?:a|the) (?:host|deployment|caller)[^.]{0,40}?(?:has to|have to|must|needs? to|is responsible)",
  ].join("|"),
  "i"
)

/**
 * The text of a link to another page here, which is that page's name.
 *
 * Taken out before the sweep reads a sentence, because a link's text is a
 * title and not a claim this page is making. Six of the seven third-person
 * matches on this site are `[What your app has to do](...)` inside somebody
 * else's sentence, and a registry that carried a line for each of those would
 * teach the next writer that the list is a formality — which is the one thing
 * that would stop it working.
 *
 * Only `/docs` links, and only their text: an obligation written *inside* a
 * link would be missed, and the answer to that is that an obligation belongs
 * in the prose around a link rather than in its title.
 */
const INTERNAL_LINK_TEXT = /\[([^\]]*)\]\(\/docs[^)\s]*\)/g

/**
 * Every sentence of a page's prose that tells the reader the work is theirs.
 *
 * Fences come out first because they are compiled and a comment inside an
 * example is about the example; import lines because they are not prose. Then
 * paragraphs, then sentences — the same walk `datedSentencesIn` makes, and for
 * the same reason: splitting straight to sentences glues a heading to the
 * paragraph under it.
 */
export const instructionSentencesIn = (source: string): readonly string[] =>
  source
    .replace(/^```[\s\S]*?^```/gm, "")
    .replace(INTERNAL_LINK_TEXT, " ")
    .split("\n")
    .filter((line) => !/^\s*(?:import|export)\b/.test(line))
    .join("\n")
    .split(/\n\s*\n/)
    .flatMap((block) => block.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/))
    .filter((sentence) => OBLIGED.test(sentence))
