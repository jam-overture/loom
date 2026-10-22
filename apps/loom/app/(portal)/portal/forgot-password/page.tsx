import Link from "next/link"
import { redirect } from "next/navigation"

import { AuthFrame } from "@/app/(portal)/_components/auth-frame"
import { UnderConstruction } from "@/app/(portal)/_components/under-construction"
import { currentActor, passwordsOffered } from "@/app/(portal)/_lib/auth/identity"
import { DEFAULT_LANDING, SIGN_IN_PATH } from "@/app/(portal)/_lib/auth/paths"

import { ForgotPasswordForm } from "./_components/forgot-password-form"

/** The way back in when a password is lost (0304). */
const ForgotPasswordPage = async () => {
  if ((await currentActor()) !== null) redirect(DEFAULT_LANDING)

  return (
    <AuthFrame
      banner={<UnderConstruction />}
      title="Reset your password"
      intro="Enter the address you signed up with and we will email you a link to choose a new password."
      footer={
        <Link href={SIGN_IN_PATH} className="text-ink-muted hover:text-ink-secondary">
          ← Back to sign in
        </Link>
      }
    >
      {passwordsOffered ? (
        <ForgotPasswordForm />
      ) : (
        <p className="text-ink-muted text-sm">This deployment does not take passwords yet.</p>
      )}
    </AuthFrame>
  )
}

export default ForgotPasswordPage
