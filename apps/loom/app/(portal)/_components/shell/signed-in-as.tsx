import { endSession } from "@/app/(portal)/portal/sign-in/actions"

/**
 * The name changes are recorded under, and the way to stop being it.
 *
 * A form rather than a link, because signing out clears a cookie and that is a
 * write — a GET that ends a session can be triggered by any page that manages to
 * make the browser fetch it.
 */
export const SignedInAs = ({ actor }: { readonly actor: string }) => (
  <form action={endSession} className="ml-auto flex items-center gap-3">
    <span className="text-ink-muted font-mono text-2xs">{actor}</span>
    <button type="submit" className="text-ink-muted text-2xs hover:underline">
      sign out
    </button>
  </form>
)
