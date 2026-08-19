import Link from "next/link"

import { StateNotice } from "./_components/state-notice"

/**
 * A page that is not here.
 *
 * Reached two ways, and they are worth telling apart because only one of them
 * is a typo. A URL nobody routes is the ordinary case. The other is
 * `notFound()`, called deliberately by `/portal/activity`, `/portal/audit`, `/portal/calibration`
 * and `/portal/history` when a `tree=` parameter is not a well-formed `TreeId` — a
 * refusal to guess at an identifier rather than a missing route. Both land
 * here, so this says both.
 */
const NotFound = () => (
  <div className="flex max-w-2xl flex-col gap-4 p-8">
    <h1 className="text-2xl tracking-tight">nothing at this address</h1>

    <StateNotice
      tone="empty"
      title="No page answers to this URL."
      action={
        <>
          <Link href="/portal/trees">every tree →</Link>
          <Link href="/portal/activity">activity →</Link>
        </>
      }
    >
      <p>
        If you followed a link to a tree or a revision, check the identifier in the address bar.
        The pages that take a <span className="font-mono">tree</span> parameter refuse one that
        is not a well-formed tree id rather than quietly showing you a different tree, and that
        refusal arrives here.
      </p>
    </StateNotice>
  </div>
)

export default NotFound
