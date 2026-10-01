/**
 * Whether this document is being shown inside somebody else's page.
 *
 * The demonstration was written for its own address and is no longer only
 * there. §4d landed on 18 September and the front door now **contains** the
 * demonstration rather than pointing at it
 * ([0056](../../../../../decisions/0056-the-demo-is-public-and-shares-nothing-but-the-deployment.md)),
 * so the likeliest way a stranger meets this surface is inside a 1078 × 673 box
 * on the marketing home page. Everything on the stage and everything on the
 * rail works there, which is the whole point of having framed the running
 * application rather than a recording of it.
 *
 * **What does not work there is leaving.** `loom.embed` withholds
 * `allow-top-navigation` from every frame including this one, deliberately and
 * correctly — that is the grant that turns an embedded document into a redirect
 * — and it withholds `allow-popups` too. So from inside the box:
 *
 * | what a link could try | what the browser does |
 * | --- | --- |
 * | an ordinary `href` | loads the destination **into the box** |
 * | `target="_top"` | blocked by the sandbox — a silently dead control |
 * | `target="_blank"` | blocked by the sandbox — a silently dead control |
 *
 * There is no fourth row. A framed demonstration is a closed room, and the two
 * links that leave it (`Wordmark`, `ReadTheDocs`) can only ever open into the
 * room they are in. `Loom marketing` measured the absurd end of that on
 * 18 September and filed it: click the demonstration's own wordmark inside the
 * frame and the **front door renders inside its own embed**, one click deep,
 * with a working back button and nothing saying so.
 *
 * Which is why this is a predicate rather than a prop. A query parameter from
 * the embedding page would work and is worse — it makes the demonstration's
 * chrome a function of who linked to it, and a third party who frames this is
 * owed the same behavior as the host that ships it. `window.self !== window.top`
 * is true of any host, needs no coordination, and is the browser answering a
 * question about itself.
 *
 * **Absence means not framed, and that direction is chosen.** A wrong "not
 * framed" renders today's link, which is what ships now. A wrong "framed"
 * withdraws the way out of a top-level page, which is the defect
 * `Loom marketing` filed on 22 August — this route group containing exactly one
 * anchor, and it the skip link. One of those is a page nobody can leave; the
 * other is a link that behaves as it always has.
 */

/**
 * The two window handles the question is asked of, and nothing else about a
 * window.
 *
 * A `Window` rather than this would make the predicate untestable outside a
 * browser and would claim to need properties it does not read. Comparing the
 * two handles is also the one thing that is safe across an origin boundary:
 * `window.top` is readable from a cross-origin frame — it is the *properties*
 * of the document behind it that are not — so identity never throws.
 */
export type FrameView = {
  readonly self: unknown
  readonly top: unknown
}

/**
 * `top` absent is a detached or unparented document, not a framed one, and
 * takes the safe direction above.
 */
export const isFramed = (view: FrameView | undefined): boolean =>
  view !== undefined && view.top !== undefined && view.top !== null && view.self !== view.top
