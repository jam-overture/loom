import { redirect } from "next/navigation"

import { docsEntryPoint } from "@/lib/nav"

/**
 * There is no landing page here. §4d builds the site that introduces Loom, in
 * Loom, and a second front door written in MDX would be a second place to keep
 * the same sentences true. `/` is the way into the documentation, so it goes
 * to the first page of it.
 */
const Home = () => {
  redirect(docsEntryPoint())
}

export default Home
