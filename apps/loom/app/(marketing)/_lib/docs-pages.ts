/**
 * The pages of the documentation this site sends a reader to by name.
 *
 * Until this run there was one: `/docs`. Every control on the site that
 * promised something specific about the documentation pointed at the front of
 * it, and `/docs` is a redirect to the first page in reading order — so
 * **"Follow the install guide" landed on *Introduction***, three pages above
 * the install command it had just printed. The reader had to recognize that
 * they were in the right place and then find their way.
 *
 * ## Why these are written down rather than typed into the copy
 *
 * A path into another lane's surface is the one kind of link this route group
 * cannot check by building the page. `routes.ts` says whether this application
 * serves an address, which is the cheap half and the half that catches a moved
 * page. It cannot say whether the page at that address is the page the sentence
 * beside the link is talking about. This lane filed exactly that on 4 October:
 *
 * > *"A link from `/what-you-run` to `/how-it-works#see-it-happen` is checked
 * > against the anchors `/how-it-works` declares. A link to `/docs#something`
 * > is checked for nothing… Both are true today and both were checked by a
 * > person. Nothing would say so if either stopped being."*
 *
 * The finding asked for a surface to publish the list of things it promises to
 * carry. That is still the better shape and it is the documentation lane's to
 * build. What this is instead is the shape the 15 October run settled on for a
 * different cross-lane claim: **read it off the repository.** A documentation
 * page is an MDX file with its own heading at the top of it, so the heading a
 * reader lands on is a fact this lane can check without importing anything,
 * inferring it from a screenshot, or retyping it.
 *
 * ## What each entry promises, and who it binds
 *
 * `heading` is the page's own first heading, so a link into the documentation
 * is held to arriving somewhere this lane has read. It is **not** this lane's
 * wording for the link — the three links on `/how-it-works` happen to use it,
 * because a reader who presses *What your app has to do* and lands on a page
 * headed *What your app has to do* knows they got there, and that agreement is
 * worth having. The install control's label is its own.
 *
 * `carries` is the claim. One phrase or several, in the page's own source,
 * chosen to be the thing this site sent the reader for rather than a word that
 * happens to be on the page. The day a documentation run moves the install
 * command out of *Installation*, the control on this site that promises an
 * install guide goes red here rather than going quietly wrong.
 *
 * **Nothing in this route group may edit `(docs)` to make this pass.** If a
 * phrase stops being on the page the honest answers are to point the link
 * somewhere else or to reword the promise, both of which are this lane's; the
 * third is a finding for `Loom docs`.
 */

/** A page of the documentation this site points a reader at by name. */
export type DocPage = {
  /** The address. Held to being one this application serves. */
  readonly path: string
  /** The first heading of the page, as the documentation writes it. */
  readonly heading: string
  /**
   * Phrases the page's own source must carry, because this site promised them.
   *
   * Matched as written and case-sensitively: these are quotations from somebody
   * else's page, and a looser match is how a check starts agreeing with itself.
   */
  readonly carries: readonly string[]
}

/**
 * The page a reader who has just been shown a command wants next.
 *
 * The front door's install band prints `pnpm add` and then offers *Follow the
 * install guide*. This is that guide: the same two packages, what each one is,
 * and the warning that neither is stable yet. `carries` is the command rather
 * than the word *install*, because the command is the thing the band promised
 * the longer version of.
 */
export const INSTALLATION: DocPage = {
  path: "/docs/getting-started/installation",
  heading: "Installation",
  carries: ["pnpm add @jam-overture/loom"],
}

/**
 * The three pages `/how-it-works` hands over to, and they are the three things
 * that page's closing paragraph already said the documentation has.
 *
 * The paragraph has read *"what a rule can say, what the record holds field by
 * field, and how to wire it into a page you already have"* since 26 September,
 * under a single button to the front of the documentation. Three specific
 * promises and one general door. Each of the three is a page, and each of them
 * is now the link.
 *
 * `carries` is the sentence the page makes the point in, rather than a word it
 * happens to contain. A single word is the wrong size for this, measured rather
 * than assumed: **the word *policy* is on 18 of the 31 written documentation
 * pages**, so a check for it would go on passing long after the page about
 * policies had been rewritten into something else.
 *
 * Three of the five phrases in this file cross a line break in the file they
 * are quoted from, and one of them is quoted out of the middle of a bold run,
 * **which is why the two normalizations in the test are load-bearing rather
 * than defensive.** The documentation's prose is hard-wrapped at about eighty
 * columns; a check written without them would quietly pass only the short
 * claims and would look exactly like one that worked.
 */
export const WHAT_A_RULE_CAN_SAY: DocPage = {
  path: "/docs/building-with-loom/what-ai-may-change",
  heading: "What AI may change",
  carries: ["a small object called a policy", "the second list you write"],
}

export const WHAT_THE_RECORD_HOLDS: DocPage = {
  path: "/docs/the-runtime/what-every-ask-leaves-behind",
  heading: "What every ask leaves behind",
  carries: ["what it remembers"],
}

export const WHAT_YOUR_APP_DOES: DocPage = {
  path: "/docs/the-runtime/what-your-app-has-to-do",
  heading: "What your app has to do",
  carries: ["one function that changes a page"],
}

/**
 * Every documentation page this site names, which is also the whole of what a
 * sweep is allowed to find.
 *
 * `docs-pages.test.ts` holds both directions: each of these is served and says
 * what this site sends people there for, **and** no page of this site links
 * into the documentation at an address that is not one of them. The second half
 * is what stops the next run typing a path into a band and getting no check at
 * all, which is the state the site was in this morning.
 */
export const DOC_PAGES: readonly DocPage[] = [
  INSTALLATION,
  WHAT_A_RULE_CAN_SAY,
  WHAT_THE_RECORD_HOLDS,
  WHAT_YOUR_APP_DOES,
]
