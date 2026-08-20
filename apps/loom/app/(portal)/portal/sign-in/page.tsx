import { redirect } from "next/navigation"

import { currentActor } from "@/app/(portal)/_lib/auth/identity"
import { safeReturnPath } from "@/app/(portal)/_lib/auth/paths"
import { portalAuth } from "@/app/(portal)/_lib/auth/config"
import { authReadout } from "@/app/(portal)/_lib/signin-view"

import { SignInHero } from "./_components/sign-in-hero"

/**
 * The only page reachable without a session.
 *
 * The page is a shell now: it gathers the return path, checks that nobody is
 * already signed in, resolves the deployment's config into the visitor-and-
 * operator readout, and hands both to the hero. Everything a visitor reads and
 * everything an operator does about it is in `SignInHero`; that split is what
 * makes both testable without an async-server-component dance.
 */
const SignInPage = async ({ searchParams }: { searchParams: Promise<{ from?: string }> }) => {
  const { from } = await searchParams
  const destination = safeReturnPath(from)

  /** Already signed in: nothing to do here, and a second sign-in is not a page. */
  if ((await currentActor()) !== null) redirect(destination)

  return <SignInHero readout={authReadout(portalAuth)} destination={destination} />
}

export default SignInPage
