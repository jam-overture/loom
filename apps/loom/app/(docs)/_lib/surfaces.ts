/**
 * The rest of the application, and the way back out of the documentation.
 *
 * This site is one route group of five (0067). A reader arrives here from the
 * front door, and until now the documentation had **no link back to it at all**
 * — a measurement `Loom marketing` made on 24 September by standing at `/` and
 * walking through: the marketing site carries the way *in* four times over, and
 * three of the four surfaces it hands a visitor to carry no way home. Somebody
 * who followed *Docs* was, from that moment, in an application whose front door
 * could only be reached by editing the address bar.
 *
 * That entry asked each of the three surfaces to **decide** rather than inherit
 * the omission. This module is this surface's answer, and it is deliberately the
 * smallest one that works.
 *
 * **A surface is known here by its front door and nothing else.** The
 * documentation does not know that the portal has a history page or that the
 * course has eleven lessons, and must not: a path into another lane's interior
 * is a link that breaks the day that lane reorganizes, and no test on this side
 * could see it break. A front door is the one address a route group owes the
 * rest of the application, so it is the one address this site keeps.
 *
 * The same rule, written from the other side, is already in
 * `(marketing)/_lib/chrome.ts` — *"Neither knows anything about another route
 * group beyond its front-door path"*. Two surfaces reaching the same conclusion
 * independently is the reason it is stated here rather than shared: sharing it
 * would be one lane importing another's module, which is the coupling the rule
 * exists to prevent.
 */

export type Surface = {
  /**
   * The front door's address. It is the whole of what this site knows about
   * another route group, and `surfaces.test.ts` holds it to being a front door
   * — one segment, or `/` — rather than a path into somewhere.
   */
  readonly path: string
  /**
   * What the link says. These are the words the front door uses for the same
   * places, on purpose: a reader who followed *Docs* to get here should find
   * *Demo* and *Lessons* spelled the way they were spelled a moment ago.
   */
  readonly label: string
  /**
   * What a reader gets if they follow it, in a clause.
   *
   * The plain version first, which is the rule this whole site is written
   * under. "Portal" tells a stranger nothing; "sign in and answer the changes a
   * model proposed" tells them whether they want it.
   */
  readonly blurb: string
}

/** The front door. The one link this finding is really about. */
export const HOME: Surface = {
  path: "/",
  label: "Home",
  blurb: "What Loom is, and why a person would want it",
}

/**
 * Every surface of this application except this one, the front door first.
 *
 * `surfaces.test.ts` derives the same list from `apps/loom/app/` and fails if
 * the two disagree, so a sixth route group added tomorrow is a red test rather
 * than a surface nobody can reach from here.
 */
export const OTHER_SURFACES: readonly Surface[] = [
  HOME,
  {
    path: "/demo",
    label: "Demo",
    blurb: "Ask a page to change, in your own words, and watch it happen",
  },
  {
    path: "/lessons",
    label: "Lessons",
    blurb: "The same ideas as a course, in order, with exercises",
  },
  {
    path: "/portal",
    label: "Portal",
    blurb: "Sign in and answer the changes a model has proposed",
  },
]

/** This surface's own front door, which is where the wordmark's second half goes. */
export const DOCS_HOME = "/docs"

/**
 * Where the site points when it points at the project itself.
 *
 * The header already carried the first of these as a literal; it reads from
 * here now, so the two places the repository is named cannot drift apart.
 */
export const REPOSITORY_URL = "https://github.com/jam-overture/loom"
export const DECISIONS_URL = "https://github.com/jam-overture/loom/tree/main/decisions"

/**
 * A file in the repository, at the address a reader can open — at a line of
 * it, where the caller knows one.
 *
 * Three places now send a reader to a file rather than to the project: the
 * licence in the footer, every decision record the Architecture section
 * indexes, and the source behind a signature the API reference had to cut
 * short. `blob/main` was written out in two of them before this existed.
 *
 * It takes a repository-relative path — `src/signals/copy.ts`, `LICENSE` —
 * because that is what the things on the other side of it hold. Nothing that
 * resolves a path should have to know this site is reading from GitHub, and
 * `#L83` is the second thing only this module knows: the line anchor is
 * GitHub's own spelling, not a fact about a file. `0` is no line, which is how
 * everything upstream of here says *I could not find it* — and the address
 * then still opens the file, which is where the link went before any of this.
 */
export const repositoryFileUrl = (path: string, line: number = 0): string =>
  `${REPOSITORY_URL}/blob/main/${path}${line === 0 ? "" : `#L${line}`}`

export const LICENSE_URL = repositoryFileUrl("LICENSE")

/**
 * The one sentence at the very foot of the page.
 *
 * It is the licence and nothing else. A footer is the place a reader looks for
 * the answer to *may I use this*, and this project's answer became MIT on
 * 26 September; everything else a footer is traditionally filled with is either
 * on this site already or is not true of a pre-production alpha.
 */
export const LICENSE_NOTICE = "Loom is open source under the MIT license."
