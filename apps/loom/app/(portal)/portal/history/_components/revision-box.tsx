import Form from "next/form"

import type { TreeId } from "@jam-overture/loom"

/**
 * A version number, typed.
 *
 * A revision number is public and stable, so it travels: it appears in a node's
 * attribution, in a report, in a message from whoever asked for the change. Up
 * to now the only way to act on one you were holding was to page back through
 * the log until it appeared, or to edit the URL by hand. 0043 made the store
 * open at a named revision and the link path has used it since; this is the same
 * capability for a reader who has the number and no link.
 *
 * A plain GET form rather than an action. There is nothing to submit — naming a
 * version is a read, it is idempotent, and the result is a URL worth keeping.
 * A server action would turn a shareable page into a POST, and a client
 * component would put JavaScript between a person and a query string. `next/form`
 * keeps the client-side navigation the rest of the portal has via `Link`, and
 * degrades to the native form it already is when that is unavailable.
 *
 * **Only `tree` and `at` are submitted, and dropping the cursor is the point.**
 * `historyRead` resolves a cursor ahead of an anchor — a step a reader took is a
 * later instruction than the link that brought them — so a form that carried
 * `older` through would name a revision the read then ignored, and the box would
 * silently do nothing from the second page onwards. Typing a version is not a
 * step from where you are; it is a fresh position.
 *
 * The label says *version* because that is the portal's word for the number
 * (`_lib/version.ts`); the parameter is still `at` and still carries the same
 * number, so every link anyone holds keeps working.
 */
export const RevisionBox = ({
  treeId,
  typed,
}: {
  readonly treeId: TreeId
  /** Echoed back so a reader who mistyped can see and correct what they sent. */
  readonly typed: string | undefined
}) => (
  <Form action="/portal/history" className="flex flex-wrap items-center gap-2">
    <input type="hidden" name="tree" value={treeId} />

    <label htmlFor="at" className="text-ink-muted text-xs">
      Jump to a version
    </label>

    <input
      id="at"
      name="at"
      type="text"
      inputMode="numeric"
      autoComplete="off"
      defaultValue={typed}
      placeholder="4"
      aria-describedby="at-hint"
      className="border-edge-subtle bg-surface-base placeholder:text-ink-placeholder w-20 rounded-md border px-2 py-1 font-mono text-xs"
    />

    <button
      type="submit"
      className="border-edge-subtle bg-surface-base hover:bg-surface-hover rounded-md border px-3 py-1 text-xs"
    >
      Go
    </button>

    {/*
     * Visible rather than `sr-only`. It was written for a screen reader and it
     * is the sentence that says what the box is *for* — a version number
     * arrives from somewhere else, a report or a message, and without this the
     * box reads as a search field for something a reader cannot name.
     */}
    <span id="at-hint" className="text-ink-muted text-xs">
      A whole number from 1 up. Leave it empty for the newest changes.
    </span>
  </Form>
)
