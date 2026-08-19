import type { ReactNode } from "react"

/**
 * The two asides a page needs and prose cannot make: a thing worth knowing, and
 * a thing that will bite. There is no third kind on purpose — a palette of six
 * callout colours turns a documented constraint into decoration, and a reader
 * learns to skip all of them.
 */
export type CalloutKind = "note" | "warning"

const TONE: Record<CalloutKind, { readonly label: string; readonly className: string }> = {
  note: { label: "Note", className: "border-note-edge bg-note-surface text-note-ink" },
  warning: { label: "Careful", className: "border-warning-ink/30 bg-warning-surface text-warning-ink" },
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
      <div className="[&>*+*]:mt-2">{children}</div>
    </aside>
  )
}
