import { redirect } from "next/navigation"

import { docsEntryPoint } from "@/app/(docs)/_lib/nav"

/**
 * There is no landing page here. §4d builds the site that introduces Loom, in
 * Loom, and a second front door written in MDX would be a second place to keep
 * the same sentences true. `/docs` is the way into the documentation, so it goes
 * to the first page of it.
 *
 * This was `/` while the documentation was its own application. The four
 * surfaces are one application now (0067) and the marketing site holds the front
 * door, so the redirect moved down a segment and did not otherwise change.
 */
const DocsIndex = () => {
  redirect(docsEntryPoint())
}

export default DocsIndex
