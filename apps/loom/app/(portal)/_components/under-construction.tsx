/**
 * The banner that tells a visitor this surface is not finished.
 *
 * Added at the maintainer's direct instruction on 28 September. The portal is
 * reachable from the marketing site's menu and its footer — a stranger who
 * follows *Portal* from the front door arrives at a working screen and has no
 * way to know that most of what it will be is not built yet. The plan for the
 * rest of it is `docs/portal.md`.
 *
 * ## Why it is a component rather than a `StateNotice`
 *
 * `StateNotice` answers *what a page says when it has no rows to show* — its
 * four tones are `empty`, `settled`, `failure` and `notice`, and every one of
 * them is a statement about the data behind a section. **This is a statement
 * about the surface**, true on every path including the one where the store
 * refused to answer, and it sits above the heading rather than inside a
 * section. Reusing a component whose whole vocabulary is about rows would make
 * the next reader look for the rows.
 *
 * `notice` was the near miss and it is the wrong one for a second reason its
 * own comment gives: it is *"quiet on purpose: it must not compete with the
 * page."* That is right for an ephemeral store and wrong for this, which a
 * reader needs to have seen **before** they judge anything else on the screen.
 *
 * ## The tone
 *
 * `awaiting` is the portal's amber — the color it already uses for a change
 * that is held, waiting on a person. A surface that is waiting to be finished
 * is the same idea at the width of the screen, so this needs no color of its
 * own. Not `refuse`: nothing here is broken, and red would say it was.
 *
 * `role="status"` rather than `role="alert"`. An alert interrupts, and this is
 * a standing condition rather than something that just happened — it would be
 * read out on every navigation within the portal, which is the behavior
 * `StateNotice` already reasons about and rejects for everything but a failed
 * read.
 */
export const UnderConstruction = () => (
  <aside
    role="status"
    data-under-construction
    className="border-edge-subtle bg-awaiting text-awaiting-ink flex flex-col gap-1 rounded-lg border px-4 py-3"
  >
    <p className="text-sm font-medium">The portal is still being built.</p>
    <p className="text-sm">
      This is an early preview — screens are incomplete, some are missing, and what is here will
      change. Coming soon.
    </p>
  </aside>
)
