"use client"

import { StateNotice } from "./_components/state-notice"

/**
 * What a reader sees when a page throws.
 *
 * Without this file Next renders its own fallback, which is a black page with a
 * stack frame on it — outside the design system, and outside the portal's
 * vocabulary. That is a bad state for any app and a worse one here: the portal's
 * whole claim is that a change is reviewable, and a surface that drops out of
 * its own language the moment something goes wrong is asking to be trusted
 * exactly when it has stopped explaining itself.
 *
 * Two things are on screen and both are deliberate.
 *
 * **The digest, not the message.** Next replaces a server error's message with
 * an opaque digest before it reaches the browser, precisely so an internal
 * failure cannot leak through a UI. Showing the digest gives a reader something
 * to quote into a bug report; inventing a friendlier message in its place would
 * be describing a failure nobody here has seen.
 *
 * **Retry before anything else.** Most of what throws in this app is a read —
 * a store, a journal, a Postgres that was asleep. `reset()` re-runs the segment
 * without a full page load, so the cheapest true fix is the first offer.
 */
const ErrorBoundary = ({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string }
  readonly reset: () => void
}) => (
  <div className="flex max-w-2xl flex-col gap-4 p-8">
    <h1 className="text-2xl tracking-tight">something here failed</h1>

    <StateNotice
      tone="failure"
      title="The page did not finish loading."
      action={
        <button
          type="button"
          onClick={reset}
          className="border-neutral-edge bg-neutral text-neutral-ink hover:bg-surface-active cursor-pointer rounded-md border px-3 py-1.5"
        >
          try again
        </button>
      }
    >
      <p>
        Nothing was written. Every write in this portal goes through one server-side path
        (0017) and a request that failed on the way in never reached it, so whatever you were
        looking at is in the state you left it.
      </p>
      {error.digest !== undefined && (
        <p>
          The server recorded this as <span className="font-mono">{error.digest}</span>. That
          identifier is the whole of what crosses to the browser — quote it if you report this.
        </p>
      )}
    </StateNotice>
  </div>
)

export default ErrorBoundary
