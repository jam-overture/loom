import Link from "next/link"

import { untilWords, type NextLook } from "@/app/(portal)/_lib/proposing/next-look"
import { plainMoment } from "@/app/(portal)/_lib/when"

/**
 * The line under *For review*'s title saying when Loom next looks at the
 * project's pages by itself (`docs/portal-wireframes.md`, *2 · For review*),
 * or why it will not, with the way to change that where a person can.
 */
export const NextLookLine = ({
  look,
  now,
  projectId,
}: {
  readonly look: NextLook
  readonly now: number
  readonly projectId: string
}) => {
  const settings = (
    <Link href={`/portal/${projectId}/settings`} className="text-ink">
      Settings
    </Link>
  )

  switch (look.kind) {
    case "scheduled": {
      const iso = new Date(look.at).toISOString()

      return (
        <p className="text-ink-muted m-0 text-xs">
          Loom next looks at your pages on <time dateTime={iso}>{plainMoment(iso)}</time>,{" "}
          {untilWords(look.at - now)}.
        </p>
      )
    }
    case "no-key":
      return (
        <p className="text-ink-muted m-0 text-xs">
          Loom looks at your pages once a day once this project has a model key. Set one on{" "}
          {settings}.
        </p>
      )
    case "key-unreadable":
      return (
        <p className="text-ink-muted m-0 text-xs">
          Loom is not looking at your pages: this project&apos;s model key can no longer be read.
          Set it again on {settings}.
        </p>
      )
    case "no-schedule":
      return (
        <p className="text-ink-muted m-0 text-xs">
          Loom does not look at your pages by itself on this deployment yet. Whoever runs it needs
          to set <code>CRON_SECRET</code>.
        </p>
      )
  }
}
