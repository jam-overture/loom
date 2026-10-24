/**
 * The token a password-recovery link carries (0310).
 *
 * The provider puts it in the address's fragment — `#access_token=…&type=recovery`
 * — which never reaches a server, so the page it lands on reads it in the
 * browser. Pure, so the one rule that matters is tested: a fragment that is
 * not a recovery (a sign-up confirmation lands with `type=signup`) is not a
 * token for setting a password.
 */
export type RecoveryLink =
  | { readonly code: "found"; readonly token: string }
  | { readonly code: "missing" }

export const readRecoveryLink = (fragment: string): RecoveryLink => {
  const fields = new URLSearchParams(fragment.replace(/^#/, ""))
  const token = fields.get("access_token")

  return token !== null && token.length > 0 && fields.get("type") === "recovery"
    ? { code: "found", token }
    : { code: "missing" }
}
