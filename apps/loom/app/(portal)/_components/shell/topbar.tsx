import Link from "next/link"

import { currentActor } from "@/app/(portal)/_lib/auth/identity"

import { SignedInAs } from "./signed-in-as"

/**
 * Fixed, 56px, above the rail. Deliberately thin: the portal's status belongs to
 * whatever tree is open, so this holds identity only until there is a tree to
 * describe.
 *
 * "Identity" is now literal. Who you are signed in as is shown on every page,
 * because every change made from here is recorded under that name (0027) — and
 * a name you are acting under without being able to see it is one you cannot
 * check before you act.
 */
export const TopBar = async () => {
  const actor = await currentActor()

  return <TopBarChrome actor={actor} />
}

/**
 * The chrome, split out so the async data-gather stays a one-liner and the
 * visual can be rendered in a test as an ordinary component.
 *
 * Everything except the `actor` prop is static, so this file owns the routing
 * decision that used to be a `<span>`.
 */
export const TopBarChrome = ({ actor }: { readonly actor: string | null }) => {
  /**
   * Where the wordmark goes.
   *
   * A signed-in reviewer gets `/portal` — their own home, the way the docs'
   * wordmark points at `/docs`. A signed-out visitor gets `/`, because
   * `/portal` is proxy-guarded (0027) and would redirect them straight back
   * to the sign-in page they were trying to leave — the dead-end the
   * marketing routine filed a finding on when the front door started sending
   * strangers here.
   */
  const home = actor === null ? "/" : "/portal"

  return (
    <header className="bg-surface-topbar border-edge-subtle fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 border-b px-4">
      {/*
       * A `<Link>` rather than a `<span>`. The wordmark was a dead <span> for
       * as long as the portal was its own deployment reached from a bookmark
       * by people who had a key. The four surfaces became one application
       * (0067), the marketing front door now carries a Sign-in action pointing
       * here (0070), and a visitor who followed it out of curiosity landed on
       * a form with no way back but the browser button. Not a `<span>` any more.
       */}
      <Link
        href={home}
        aria-label={actor === null ? "Loom home" : "Portal home"}
        className="hover:text-ink-secondary flex items-center gap-3 rounded-sm"
      >
        <span className="bg-nav-edge inline-block h-4 w-4 rounded-sm" aria-hidden="true" />
        <span className="text-md tracking-tight">loom</span>
        <span className="text-ink-muted font-mono text-2xs">portal · alpha</span>
      </Link>

      {actor !== null && <SignedInAs actor={actor} />}
    </header>
  )
}
