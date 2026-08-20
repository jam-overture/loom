import Link from "next/link"

import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { AuthReadout } from "@/app/(portal)/_lib/signin-view"

import { SignInForm } from "./sign-in-form"

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
 */
export const SignInHero = ({
  readout,
  destination,
}: {
  readonly readout: AuthReadout
  readonly destination: string
}) => (
  <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 py-16">
    <div className="flex flex-col gap-3">
      <p className="text-ink-muted text-2xs tracking-wide uppercase">Loom · review portal</p>
      <h1 className="text-3xl tracking-tight">Sign in</h1>
      <p className="text-ink-secondary text-sm leading-relaxed">
        This is where the people who run this project review the changes an AI
        proposes before any of them go live. It's signed-in only — the key on
        the form below is the way in.
      </p>
    </div>

    {readout.ok ? (
      <SignInForm from={destination} disabled={false} />
    ) : (
      <div className="border-edge-subtle bg-surface-hover flex flex-col gap-3 rounded-md border p-4">
        <p className="text-sm">{readout.headline}</p>
        <p className="text-ink-muted text-xs leading-relaxed">{readout.detail}</p>
        <SignInForm from={destination} disabled={true} />
        <TechnicalDetail summary="For the operator setting this up">
          {/*
           * The operator's message goes here word for word. This is what the
           * page used to render at a visitor's altitude, and it belongs here
           * rather than nowhere — an operator who has just deployed the
           * portal and hit the sign-in page is the one person on earth who
           * wants to read `LOOM_PORTAL_SESSION_SECRET is unset…`.
           */}
          <p className="text-ink-muted font-mono leading-relaxed break-words whitespace-pre-wrap">
            {readout.technical}
          </p>
        </TechnicalDetail>
      </div>
    )}

    <div className="border-edge-subtle flex flex-col gap-3 border-t pt-6">
      <p className="text-ink-muted text-xs">
        Don't have a key? You can still see what Loom does, no sign-in needed.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        {/*
         * The single obvious next-action for a visitor who does not hold a
         * key, which is now the largest population reaching this page — the
         * marketing site's Sign-in action is what sends them here (0070).
         * `/portal/demo` is a public path (0068 / `paths.ts`) so this link
         * does not send them back through the redirector.
         */}
        <Link
          href="/portal/demo"
          className="border-edge-subtle bg-surface-base hover:bg-surface-hover rounded-md border px-3 py-2 text-sm"
        >
          See the live demo
        </Link>
        {/*
         * The way out. `/` is the marketing home — the front door that sent
         * them here, so the loop closes. The topbar's wordmark now points at
         * `/` too when signed out; this is the same link phrased for a
         * reader who has already looked past the header.
         */}
        <Link href="/" className="text-ink-muted hover:text-ink-secondary text-xs">
          ← Back to Loom
        </Link>
      </div>
    </div>
  </div>
)
