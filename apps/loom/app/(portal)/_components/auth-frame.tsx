import type { ReactNode } from "react"

/**
 * The frame every signed-out screen shares: signing in, opening an account,
 * and getting back in after a password is lost (0310).
 *
 * One frame so the four read as one place. The banner is the page's to pass,
 * because the rule that every screen a stranger can reach says the portal is
 * unfinished is checked against each page's own sources.
 */
export const AuthFrame = ({
  banner,
  title,
  intro,
  children,
  footer,
}: {
  readonly banner: ReactNode
  readonly title: string
  readonly intro: ReactNode
  readonly children: ReactNode
  readonly footer: ReactNode
}) => (
  <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 py-16">
    {banner}

    <div className="flex flex-col gap-3">
      <p className="text-ink-muted text-2xs tracking-wide uppercase">Loom · review portal</p>
      <h1 className="text-3xl tracking-tight">{title}</h1>
      <p className="text-ink-secondary text-sm leading-relaxed">{intro}</p>
    </div>

    {children}

    <div className="border-edge-subtle flex flex-col gap-3 border-t pt-6 text-xs">{footer}</div>
  </div>
)

/** What a form says back, where the eye already is — see `sign-in-form.tsx`. */
export const FormNotice = ({
  tone,
  children,
}: {
  readonly tone: "refused" | "done"
  readonly children: ReactNode
}) => (
  <p
    role={tone === "refused" ? "alert" : "status"}
    className={`m-0 rounded-md px-3 py-2 text-sm ${tone === "refused" ? "bg-rejected text-rejected-ink" : "bg-applied text-applied-ink"}`}
  >
    {children}
  </p>
)
