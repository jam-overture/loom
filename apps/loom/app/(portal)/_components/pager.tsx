import Link from "next/link"

/**
 * *Newer* where a list can step back one page, and *Newest* where it can only
 * start again from the top, as *Events* does, whose cursor reads one way.
 */
export type PagerBack = { readonly label: "Newer" | "Newest"; readonly href: string | undefined }

const Step = ({ label, href }: { label: string; href: string | undefined }) =>
  href === undefined ? (
    <span aria-disabled="true">{label}</span>
  ) : (
    <Link href={href} className="text-ink">
      {label}
    </Link>
  )

/**
 * The foot of every list in the portal (`docs/portal-wireframes.md`, *Patterns
 * every screen shares*, *Pagination*): a line saying which rows the page shows
 * and the stretch of time they cover, then the way to newer rows and to older
 * ones. A way that leads nowhere is still drawn, greyed, so the two never trade
 * places as a person pages through.
 */
export const Pager = ({
  span,
  back,
  older,
}: {
  span: string | undefined
  back: PagerBack
  older: string | undefined
}) => (
  <nav
    aria-label="Pages of this list"
    className="text-ink-muted flex flex-wrap items-center justify-between gap-3 text-xs"
  >
    <span>{span}</span>
    <span className="flex gap-3">
      <Step label={back.label} href={back.href} />
      <Step label="Older" href={older} />
    </span>
  </nav>
)
