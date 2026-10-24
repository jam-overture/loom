import Link from "next/link"
import { redirect } from "next/navigation"

import { AuthFrame } from "@/app/(portal)/_components/auth-frame"
import { UnderConstruction } from "@/app/(portal)/_components/under-construction"
import { currentActor, passwordsOffered } from "@/app/(portal)/_lib/auth/identity"
import { DEFAULT_LANDING, SIGN_IN_PATH } from "@/app/(portal)/_lib/auth/paths"

import { SignUpForm } from "./_components/sign-up-form"

/**
 * Opening an account (0310). Reachable without a session, because it is how
 * a session is first had; who may open one is the deployment's list.
 */
const SignUpPage = async () => {
  if ((await currentActor()) !== null) redirect(DEFAULT_LANDING)

  return (
    <AuthFrame
      banner={<UnderConstruction />}
      title="Create an account"
      intro="Sign up with your email address and a password. This deployment only takes accounts for the addresses it has been told to."
      footer={
        <p className="text-ink-muted m-0">
          Already have one?{" "}
          <Link href={SIGN_IN_PATH} className="text-ink">
            Sign in
          </Link>
          .
        </p>
      }
    >
      {passwordsOffered ? (
        <SignUpForm />
      ) : (
        <p className="text-ink-muted text-sm">
          This deployment does not take passwords yet. Whoever set it up can issue you an access key
          instead.
        </p>
      )}
    </AuthFrame>
  )
}

export default SignUpPage
