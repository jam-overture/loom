import { describeStoreError } from "@loom/runtime/store"

import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { isAuditable } from "@/app/(portal)/_lib/seeds"
import { portalStore } from "@/app/(portal)/_lib/store"

import { CheckupChoices } from "./checkup-choices"

/**
 * The read behind the chooser, and nothing else.
 *
 * What the rows look like is in `CheckupChoices`, which takes them as props — a
 * component that both read the store and decided the wording could only be
 * checked by standing one up. What is left here is the one branch that genuinely
 * needs the store: the read that did not come back.
 *
 * That branch says what has *not* happened, rather than showing an empty list. A
 * screen that cannot list your pages has checked none of them, which is a
 * different thing from finding none to check — and the two used to look
 * identical.
 */
export const CheckupTreeChooser = async () => {
  const page = await portalStore.list()

  if (!page.ok) {
    return (
      <StateNotice tone="failure" title="We couldn't load your pages.">
        <p>
          Nothing has been checked and nothing has passed. A screen that cannot list your pages
          has checked none of them, which is a different thing from finding none to check.
        </p>
        <TechnicalDetail>
          <p className="font-mono">{describeStoreError(page.error)}</p>
        </TechnicalDetail>
      </StateNotice>
    )
  }

  return <CheckupChoices trees={page.value.trees} checkable={isAuditable} />
}
