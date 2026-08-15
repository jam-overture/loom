import type { ReactNode } from "react"

/**
 * The three things a page has to say when it has no rows to show.
 *
 * Before this, all three were the same `<p className="text-ink-muted text-sm">`.
 * That made a *failed read* and an *empty store* indistinguishable — "no trees
 * stored" and "the database refused the connection" arrived as the same grey
 * sentence in the same position, and the only way to tell which one you were
 * looking at was to read it carefully. A reader who mistakes the second for the
 * first concludes the portal is working and their data is gone.
 *
 * So the tone is a prop and it changes the shape, not only the wording:
 *
 * - `empty` — there is nothing here *yet*. Dashed, because a dashed edge reads
 *   as a space something goes in. The body's job is to say what would put
 *   something there, which is the part these states usually omit.
 * - `failure` — the read did not happen. Solid and marked in the refusal
 *   colour, so it cannot be skimmed as emptiness. What is on screen is not the
 *   absence of data; it is the absence of an answer.
 * - `notice` — a condition worth knowing that is not a failure, like an
 *   ephemeral store. Quiet on purpose: it must not compete with the page.
 */
export type NoticeTone = "empty" | "failure" | "notice"

const TONE_CLASSES: Readonly<Record<NoticeTone, string>> = {
  empty: "border-edge-subtle border-dashed bg-surface-base",
  failure: "border-refuse-edge bg-rejected",
  notice: "border-edge-subtle bg-surface-hover",
}

const TITLE_CLASSES: Readonly<Record<NoticeTone, string>> = {
  empty: "text-ink",
  failure: "text-rejected-ink",
  notice: "text-ink-secondary",
}

/**
 * `failure` is announced. The other two are not: an empty list is already
 * described by the heading above it, and a live region that fires on every
 * navigation to a page that happens to be empty is noise. A read that failed is
 * the one a reader has to be told about, because it looks like success.
 */
const TONE_ROLE: Readonly<Record<NoticeTone, "status" | undefined>> = {
  empty: undefined,
  failure: "status",
  notice: undefined,
}

export const StateNotice = ({
  tone,
  title,
  children,
  action,
}: {
  readonly tone: NoticeTone
  /** One line naming the state. Omitted for `notice`, which has no headline. */
  readonly title?: string
  /** Why the page is in this state, and — for `empty` — what would end it. */
  readonly children: ReactNode
  /** The one thing to do about it, if there is one. */
  readonly action?: ReactNode
}) => (
  <div
    role={TONE_ROLE[tone]}
    data-tone={tone}
    className={"flex flex-col gap-2 rounded-md border p-4 " + TONE_CLASSES[tone]}
  >
    {title !== undefined && (
      <p className={"text-sm " + TITLE_CLASSES[tone]}>{title}</p>
    )}
    <div className="text-ink-muted flex flex-col gap-2 text-xs">{children}</div>
    {action !== undefined && <div className="flex flex-wrap gap-3 text-xs">{action}</div>}
  </div>
)
