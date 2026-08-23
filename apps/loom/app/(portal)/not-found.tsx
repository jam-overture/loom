import Link from "next/link"

import { StateNotice } from "./_components/state-notice"
import { TechnicalDetail } from "./_components/technical-detail"

/**
 * A page that is not here.
 *
 * Reached two ways, and they are worth telling apart because only one of them
 * is a typo. A URL nobody routes is the ordinary case. The other is
 * `notFound()`, called deliberately by `/portal/activity`, `/portal/checkup`, `/portal/trust`
 * and `/portal/history` when a `tree=` parameter is not a well-formed `TreeId` — a
 * refusal to guess at an identifier rather than a missing route. Both land
 * here, so this says both.
 */
const NotFound = () => (
  <div className="flex max-w-2xl flex-col gap-4 p-8">
    <h1 className="text-2xl tracking-tight">There&rsquo;s nothing here</h1>

    <StateNotice
      tone="empty"
      title="No page answers to this address."
      action={
        <>
          <Link href="/portal/pages">Your pages →</Link>
          <Link href="/portal/activity">Activity →</Link>
        </>
      }
    >
      <p>
        Either the address is wrong, or the page it named has an identifier Loom could not
        read. Check the address bar, or start again from your pages.
      </p>
      <TechnicalDetail summary="The other way you can end up here">
        <p>
          The pages that take a <span className="font-mono">tree</span> parameter refuse one
          that is not a well-formed tree id rather than quietly showing you a different tree,
          and that refusal arrives here. So a 404 from{" "}
          <span className="font-mono">/portal/history?tree=…</span> is a rejected identifier
          rather than a missing route.
        </p>
      </TechnicalDetail>
    </StateNotice>
  </div>
)

export default NotFound
