import { endSession } from "@/app/(portal)/portal/sign-in/actions"

/**
 * The name changes are recorded under, and the way to stop being it.
 *
 * On a phone a long address is cut short, whole on a long press, so the
 * breadcrumb and the search keep room beside it; it is never left out.
 *
 * A form rather than a link, because signing out clears a cookie and that is a
 * write — a GET that ends a session can be triggered by any page that manages to
 * make the browser fetch it.
 */
export const SignedInAs = ({ actor }: { readonly actor: string }) => (
  <form action={endSession} className="ml-auto flex shrink-0 items-center gap-3">
    <span
      title={actor}
      className="text-ink-muted max-w-28 truncate font-mono text-2xs sm:max-w-none"
    >
      {actor}
    </span>
    <button type="submit" className="text-ink-muted text-2xs hover:underline">
      sign out
    </button>
  </form>
)
