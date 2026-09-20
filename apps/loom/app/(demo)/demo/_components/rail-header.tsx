/**
 * The four lines at the top of the rail: what this is, and what a stranger is
 * about to do to the page beside it.
 *
 * **A component rather than markup in `page.tsx`, and that is the point of the
 * file.** Everything here is static — it reads no tree, no store and no
 * revision — so there was never a reason for it to sit in the one file in this
 * lane a test cannot reach, and sitting there is why three runs of copy
 * decisions about this header have shipped with nothing asserting any of them.
 * The 17 September finding asks for readings to be moved out of the page; this
 * is the cheap half of the same move, and the last run's own lesson said it
 * plainly: where a reading can live in a component rather than in the page, the
 * wiring is testable for free.
 *
 * What the four lines are for, in order:
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
 *   being one, and four inches above the button, so a stranger read it before
 *   it could mean anything and had forgotten it by the time a card appeared.
 *   The claim now sits with the controls (`AskPanel`), where it is about to
 *   become true. What is left is the half the bar does not cover and a stranger
 *   can otherwise get wrong — that the thing on the stage is data rather than a
 *   picture of a page.
 * - **The referent, on a narrow screen only.** "That page" is only pointing at
 *   something when the page is beside you. Stacked, it is underneath, and a
 *   visitor who presses a button without knowing that watches nothing happen.
 */
export const RailHeader = () => (
  <header className="flex flex-col gap-2">
    <p className="text-accent text-2xs tracking-wide uppercase">Live demo</p>

    <h1 className="text-2xl leading-tight tracking-tight text-balance">
      Ask that page for a change.
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
      * page with `BackToTheRecord` pinned underneath saying *Loom wrote down
      * what it just did*. The document scrolled 0 → 727 → 4,920 without a hand
      * on it on `main`, and 0 → 684 → 4,878 here — the difference is the two
      * lines this sentence stopped spending.
      *
      * Telling a stranger to go hunting on a 6,380px document is worse than
      * saying nothing, and it cost two lines at the top of the one screen with
      * no room to spare — the same screen where the same walk found the first
      * control 398px down inside a 465px box.
      */}
    <p className="text-ink-muted text-xs lg:hidden">It’s the page below.</p>
  </header>
)
