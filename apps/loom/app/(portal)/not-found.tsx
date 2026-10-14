import Link from "next/link"

import { screenName } from "./_lib/screen-names"

import { Screen } from "./_components/screen"
import { StateNotice } from "./_components/state-notice"
import { TechnicalDetail } from "./_components/technical-detail"

/**
 * A page that is not here.
 *
 * Reached two ways, and they are worth telling apart because only one of them
 * is a typo. A URL nobody routes is the ordinary case. The other is
 * `notFound()`, called deliberately when an identifier in a parameter is not
 * well formed — a refusal to guess rather than a missing route. Both land here,
 * so this says both.
 *
 * **The way out was two dead links until 14 October.** It offered *Your pages*
 * and *Activity*, and unit 0 deleted both screens — so the page a lost reader
 * reaches sent them somewhere equally missing. Found by `destinations.test.ts`,
 * which was written the same hour for the same class of defect in the
 * registration action, and which sweeps every file in this group rather than
 * every screen because neither bug was in a `page.tsx`.
 */
const NotFound = () => (
  <Screen>
    <h1 className="text-2xl tracking-tight">There&rsquo;s nothing here</h1>

    <StateNotice
      tone="empty"
      title="No page answers to this address."
      action={
        <>
          {/*
           * One way out rather than two, because there is one place to go: the
           * front door lists what this deployment has. The screen is named
           * rather than spelled, which is the habit worth keeping from the two
           * links this replaces — on the one screen where a reader is already
           * lost, a label that drifts from the destination is the last thing
           * they need.
           */}
          <Link href="/portal">{screenName("/portal")} →</Link>
        </>
      }
    >
      <p>
        Either the address is wrong, or the page it named has an identifier Loom could not
        read. Check the address bar, or start again from the front door.
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
  </Screen>
)

export default NotFound
