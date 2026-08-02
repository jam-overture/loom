import { redirect } from "next/navigation"

import { describeAuthProblem, portalAuth } from "@/lib/auth/config"
import { currentActor } from "@/lib/auth/identity"
import { safeReturnPath } from "@/lib/auth/paths"

import { SignInForm } from "./_components/sign-in-form"

/**
 * The only page reachable without a session.
 *
 * When nothing is configured it says which variable is missing, rather than
 * showing a form that could never accept anything. An operator who has just
 * deployed this needs the name of the thing they forgot; "that key was not
 * recognised" would send them looking for a key that does not exist.
 */
const SignInPage = async ({ searchParams }: { searchParams: Promise<{ from?: string }> }) => {
  const { from } = await searchParams
  const destination = safeReturnPath(from)

  /** Already signed in: nothing to do here, and a second sign-in is not a page. */
  if ((await currentActor()) !== null) redirect(destination)

  return (
    <div className="flex max-w-md flex-col gap-6 p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl tracking-tight">sign in</h1>
        <p className="text-ink-muted text-sm">
          Every change this portal makes is recorded against whoever asked for it, so it
          needs to know who you are before it will show you a tree.
        </p>
      </div>

      {portalAuth.ok ? (
        <SignInForm from={destination} disabled={false} />
      ) : (
        <>
          <SignInForm from={destination} disabled={true} />
          <p className="text-ink-muted text-xs">{describeAuthProblem(portalAuth.error)}</p>
        </>
      )}
    </div>
  )
}

export default SignInPage
