import { currentActor } from "@/lib/auth/identity"

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

  return (
    <header className="bg-surface-topbar border-edge-subtle fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 border-b px-4">
      <span className="bg-nav-edge inline-block h-4 w-4 rounded-sm" aria-hidden="true" />
      <span className="text-md tracking-tight">loom</span>
      <span className="text-ink-muted font-mono text-2xs">portal · alpha</span>

      {actor !== null && <SignedInAs actor={actor} />}
    </header>
  )
}
