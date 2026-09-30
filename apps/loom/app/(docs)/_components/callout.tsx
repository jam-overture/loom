import type { ReactNode } from "react"

/**
 * The two asides a page needs and prose cannot make: a thing worth knowing, and
 * a thing that will bite. There is no third kind on purpose — a palette of six
 * callout colors turns a documented constraint into decoration, and a reader
 * learns to skip all of them.
 *
 * Under the minimal theme the note carries the site's green — a mint ring on a
 * tinted ground, which is the recurring "subtle highlight" the theme is built
 * around. The warning keeps an amber, because the whole value of two kinds is
 * that a reader can tell them apart at a glance, and two greens cannot.
 *
 * `callout-prose` is the one thing here that is not about tone. This is a
 * `.not-prose` region holding *authored markdown*, so the two treatments that
 * content needs — an underline on a link, a chip on a backtick span — have to
 * be asked for rather than inherited from the prose rules the barrier keeps
 * out. They come back in the callout's own color, which is what the shared
 * grey chip never did.
 */
export type CalloutKind = "note" | "warning"

const TONE: Record<CalloutKind, { readonly label: string; readonly className: string }> = {
  note: { label: "Note", className: "border-note-edge bg-note-surface text-note-ink" },
  warning: { label: "Careful", className: "border-warning-edge bg-warning-surface text-warning-ink" },
}

export const Callout = ({
  kind = "note",
  children,
}: {
  readonly kind?: CalloutKind
  readonly children: ReactNode
}) => {
  const tone = TONE[kind]

  return (
    <aside className={`not-prose my-6 rounded-lg border px-4 py-3 text-sm leading-relaxed ${tone.className}`}>
      <p className="mb-1 text-xs font-semibold tracking-wide uppercase">{tone.label}</p>
      <div className="callout-prose [&>*+*]:mt-2">{children}</div>
    </aside>
  )
}
