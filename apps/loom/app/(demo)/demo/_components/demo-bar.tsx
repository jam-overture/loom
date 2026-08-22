/**
 * The one line above everything, and it exists because of what used to be
 * there.
 *
 * The demo lived at `/portal/demo` and wore the review tool's chrome, so the
 * first words a stranger read were "loom portal · alpha" — the name of a
 * signed-in tool they have no account for, on a page whose whole purpose is to
 * be seen by somebody who does not. Below it, the biggest type on the screen
 * belonged to the *specimen page*, whose hero says "Your AI can change this
 * page" and whose primary button goes to GitHub. A visitor could not tell which
 * of the two voices was Loom's.
 *
 * So this bar says three things and stops: whose page this is, that it is live
 * rather than a recording, and where to go next. Everything else on screen is
 * either the page being changed or the record of changing it.
 */
export const DemoBar = ({ revision, policyId }: { readonly revision: number; readonly policyId: string }) => (
  <header className="border-edge-subtle bg-surface-topbar flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2.5 lg:px-5">
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className="bg-accent h-3.5 w-3.5 rounded-sm" />
      <span className="text-md tracking-tight">Loom</span>
    </span>

    <p className="text-ink-secondary min-w-0 text-xs">
      A live page.{" "}
      <span className="text-ink-muted">
        Not a video, not a mock — ask it to change and watch what the runtime does about it.
      </span>
    </p>

    {/*
      * The two numbers that were the *first* thing on the old rail, in a
      * monospace dl under the heading, before a visitor had been told what
      * either word meant. They are worth keeping — a revision counter that
      * moves is the cheapest possible proof the page is real — so they stay,
      * demoted to the far end of a bar where they read as an instrument panel
      * rather than as an explanation.
      */}
    <dl className="text-ink-muted ml-auto flex shrink-0 gap-x-4 font-mono text-2xs">
      <div className="flex gap-1.5">
        <dt>revision</dt>
        <dd className="text-ink">{revision}</dd>
      </div>
      <div className="hidden gap-1.5 sm:flex">
        <dt>policy</dt>
        <dd className="text-ink">{policyId}</dd>
      </div>
    </dl>
  </header>
)
