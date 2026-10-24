import Link from "next/link"

import { AuthFrame } from "@/app/(portal)/_components/auth-frame"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { UnderConstruction } from "@/app/(portal)/_components/under-construction"
import { SIGN_UP_PATH } from "@/app/(portal)/_lib/auth/paths"
import type { AuthReadout } from "@/app/(portal)/_lib/signin-view"

import { KeySignInForm, PasswordSignInForm } from "./sign-in-form"

/**
 * The first page a stranger sees now that the marketing site sends them here.
 *
 * The old version was three sentences, a form, and a paragraph naming an
 * environment variable when configuration was missing. Real for an operator,
 * unreadable to anyone else — and the only navigation off the page was the
 * browser's back button.
 *
 * The rewrite follows the portal's plain-language rule:
 *
 * > Plain language is the default. The technical record is one click away.
 * > Nothing is ever removed.
 *
 * So a person reads what this portal is and who it is for, in one sentence.
 * A person who does not have a key gets somewhere to go — the demo, which is
 * public by design (0068). A person who reached this by accident gets a way
 * back to the marketing site. The env-var message a misconfigured deployment
 * used to shout at every visitor is folded behind a disclosure, and it is the
 * same bytes it always was so an operator loses nothing.
 *
 * Split from `page.tsx` for the reason the topbar's chrome is split from the
 * async `TopBar`: the page gathers its data (return path, config resolution)
 * and this renders it. The renderer is a sync Server Component, testable with
 * ordinary RTL rather than through an async import dance.
 *
 * **An email and a password lead** once a deployment names who holds
 * passwords (0310); the minted key is folded beneath them, and leads only on a
 * deployment that has not.
 */
export const SignInHero = ({
  readout,
  destination,
  passwords,
}: {
  readonly readout: AuthReadout
  readonly destination: string
  /** Whether this deployment takes passwords (0310). */
  readonly passwords: boolean
}) => {
  const disabled = !readout.ok

  const forms = passwords ? (
    <div className="flex flex-col gap-4">
      <PasswordSignInForm from={destination} disabled={disabled} />
      <details className="text-xs">
        <summary className="text-ink-muted hover:text-ink cursor-pointer">
          Use an access key instead
        </summary>
        <div className="pt-3">
          <KeySignInForm from={destination} disabled={disabled} />
        </div>
      </details>
    </div>
  ) : (
    <KeySignInForm from={destination} disabled={disabled} />
  )

  return (
    <AuthFrame
      banner={<UnderConstruction />}
      title="Sign in"
      intro="This is where the people who run this project review the changes an AI proposes before any of them go live. It's signed-in only."
      footer={
        <>
          {passwords ? (
            <p className="text-ink-muted m-0">
              New here?{" "}
              <Link href={SIGN_UP_PATH} className="text-ink">
                Create an account
              </Link>
              .
            </p>
          ) : (
            <p className="text-ink-muted m-0">
              Don&rsquo;t have a key? Whoever set this deployment up can issue you one.
            </p>
          )}
          <Link href="/" className="text-ink-muted hover:text-ink-secondary">
            ← Back to Loom
          </Link>
        </>
      }
    >
      {readout.ok ? (
        forms
      ) : (
        <div className="border-edge-subtle bg-surface-hover flex flex-col gap-3 rounded-md border p-4">
          <p className="text-sm">{readout.headline}</p>
          <p className="text-ink-muted text-xs leading-relaxed">{readout.detail}</p>
          {forms}
          <TechnicalDetail summary="For the operator setting this up">
            <p className="text-ink-muted font-mono leading-relaxed break-words whitespace-pre-wrap">
              {readout.technical}
            </p>
          </TechnicalDetail>
        </div>
      )}
    </AuthFrame>
  )
}
