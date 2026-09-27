/**
 * The top of the rail: what this is, and what a stranger is about to do to the
 * page beside it.
 *
 * **A component rather than markup in `page.tsx`, and that is the point of the
 * file.** Everything here is static — it reads no tree, no store and no
 * revision — so there was never a reason for it to sit in the one file in this
 * lane a test cannot reach, and sitting there is why three runs of copy
 * decisions about this header have shipped with nothing asserting any of them.
 *
 * What the lines are for, in order:
 *
 * - **"Live demo"**, because the first thing a stranger has to rule out is a
 *   recording.
 * - **The claim, at the size of a claim.** The rail's heading used to be "ask
 *   this page to change" at 18px — set smaller than the specimen page's body
 *   copy, in a rail with no visual weight, so the sentence saying what this
 *   surface is for was the least prominent sentence on the screen. And it is
 *   "ask *that* page", not "this page": the specimen is a clinic's page and the
 *   rail is Loom's, so "this page" is the one question a stranger must never
 *   have to ask. The heading points instead.
 * - **What the thing on the stage is.** It used to carry a third clause —
 *   *"and every rewrite arrives with a record of what was asked, what Loom
 *   decided, and how to put it back"* — which is the demo's whole claim and was
 *   in the wrong place twice over: abstract, describing a record rather than
 *   being one, and four inches above the button. The claim now sits with the
 *   controls (`AskPanel`), where it is about to become true.
 * - **The two chips**, and they are the only new content on this screen. See
 *   below.
 * - **The referent, on a narrow screen only.** "That page" is only pointing at
 *   something when the page is beside you.
 *
 * ## The type, and why it changed
 *
 * The maintainer's verdict on the default state, 26 September, was that it did
 * not look modern, against an inspiration image whose devices are legible and
 * few: a **monospace micro-label** over a **large, tightly-tracked display
 * line** with one word in the accent, a pair of **quiet chips**, and depth from
 * hairlines rather than from boxes.
 *
 * Every one of those is available here without a single new colour, because the
 * rail already has a mono face, an accent and a two-step border ramp. What it
 * did not have was **contrast between its own levels**: the eyebrow, the
 * section labels and the body copy sat within four pixels of each other, so a
 * rail with five distinct jobs read as one undifferentiated column of grey. The
 * heading is now 30px against an 11px label — a ratio the specimen page has
 * always had and the instrument beside it never did.
 *
 * **The accent lands on one word and it is the verb.** *Change* is what this
 * surface does and the only word in the sentence a stranger needs to have read.
 * It is a `<span>` inside the heading rather than a second element, so the
 * accessible name is still the whole sentence.
 */

/**
 * What the chips say, and the rule that let them on.
 *
 * Nothing decorative earns a place on the first screen. These two are here
 * because they answer, before it is asked, the question that stops a stranger
 * pressing anything on an unfamiliar tool: *what is this going to cost me?*
 * Both are facts about the implementation rather than promises —
 * `visitor.ts` mints an opaque cookie that grants nothing, and a visitor's
 * whole session is a tree in memory that expires with the instance — and both
 * are already stated at the **foot** of the rail, which is the one place a
 * visitor deciding whether to start will not have reached.
 *
 * They are not a third and a fourth. A chip row is a place a later run will
 * want to put a badge, and the answer is that these two remove friction and a
 * third would add it.
 */
const CHIPS: readonly string[] = ["No sign-in", "Nothing kept"]

export const RailHeader = () => (
  <header className="flex flex-col gap-3">
    {/*
      * The micro-label, and the dot is doing work the word cannot: *live* is a
      * claim a recording would also make, and a lit dot is the convention for
      * a thing that is actually running. It is `aria-hidden` because the word
      * beside it already says so.
      */}
    <p className="text-accent flex items-center gap-2 font-mono text-2xs tracking-[0.18em] uppercase">
      <span aria-hidden="true" className="bg-accent h-1.5 w-1.5 shrink-0 rounded-full" />
      Live demo
    </p>

    <h1 className="text-3xl leading-[1.08] font-semibold tracking-tight text-balance">
      Ask that page for a <span className="text-accent">change.</span>
    </h1>

    <p className="text-ink-secondary text-sm">
      It isn’t a picture. It’s data, and an AI can rewrite it.
    </p>

    {/*
      * The referent, and nothing else.
      *
      * **What went with it was an instruction to do something this surface
      * already does.** It used to continue *"Press something, then look for the
      * mark Loom leaves on it"*, and a walk of the stacked layout at 390 × 844
      * says the looking is not the visitor's job: the ask carries them to the
      * card, which renders the part of the page in question inside itself
      * (`part-in-question.tsx`), and answering carries them to the mark on the
      * page with `BackToTheRecord` pinned underneath.
      *
      * Telling a stranger to go hunting on a 6,380px document is worse than
      * saying nothing, and it cost two lines at the top of the one screen with
      * no room to spare.
      */}
    <p className="text-ink-muted text-xs lg:hidden">It’s the page below.</p>


    <ul className="flex flex-wrap items-center gap-1.5">
      {CHIPS.map((chip) => (
        <li
          key={chip}
          className="border-edge-subtle text-ink-muted rounded-sm border px-2 py-1 font-mono text-2xs tracking-wide uppercase"
        >
          {chip}
        </li>
      ))}
    </ul>
  </header>
)
