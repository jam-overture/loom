import Link from "next/link"

import { AuthFrame } from "@/app/(portal)/_components/auth-frame"
import { UnderConstruction } from "@/app/(portal)/_components/under-construction"
import { SIGN_IN_PATH } from "@/app/(portal)/_lib/auth/paths"

import { ResetPasswordForm } from "./_components/reset-password-form"

/**
 * Where a recovery link lands (0304).
 *
 * It does not turn a signed-in person away, unlike the other ways in: a
 * person who follows a reset link means to change the password, whoever the
 * browser is signed in as.
 */
const ResetPasswordPage = () => (
  <AuthFrame
    banner={<UnderConstruction />}
    title="Choose a new password"
    intro="Setting it signs you in."
    footer={
      <Link href={SIGN_IN_PATH} className="text-ink-muted hover:text-ink-secondary">
        ← Back to sign in
      </Link>
    }
  >
    <ResetPasswordForm />
  </AuthFrame>
)

export default ResetPasswordPage
