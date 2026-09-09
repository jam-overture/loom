import {
  ARRIVAL_ROUTE,
  ARRIVAL_SHORTCUT_HREF,
  ARRIVAL_TOTALS,
  WORDS_A_MINUTE,
  type ArrivalStep,
} from "@/app/(docs)/_lib/arrival/route"

/**
 * The next hour, as six numbered stops.
 *
 * The one thing a reader on the first page cannot get anywhere else is the
 * *shape* of what is ahead — so each stop says what you will have when it is
 * done, not what the page is about, and the numbers beside it are counted off
 * that page rather than estimated.
 *
 * Two links per stop and the difference matters. The **title** opens the page at
 * the top, because somebody walking the route is meant to read it from the
 * beginning. The **checkpoint** jumps to the heading where that name is actually
 * used, for the reader who is already through it once and wants the line back.
 */

const Step = ({ step, position }: { readonly step: ArrivalStep; readonly position: number }) => (
  <li className="border-edge flex gap-4 border-t pt-6 first:border-t-0 first:pt-0">
    <span
      aria-hidden="true"
      className="border-edge text-ink-faint mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold"
    >
      {position}
    </span>

    <div className="min-w-0 flex-1">
      <h3 className="text-base font-semibold tracking-tight">
        <a href={step.href} className="text-accent-strong underline underline-offset-2">
          {step.title}
        </a>
      </h3>

      <p className="text-ink-muted mt-2 leading-relaxed">{step.done}</p>

      <p className="text-ink-faint mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span>
          {step.blocks} {step.blocks === 1 ? "code block" : "code blocks"}
        </span>
        <span aria-hidden="true">·</span>
        <span>{step.minutes} min to read</span>
        <span aria-hidden="true">·</span>
        <span>
          you will have typed{" "}
          {step.checkpointHref === step.href ? (
            <code className="code-chip font-mono">{step.checkpoint}</code>
          ) : (
            <a href={step.checkpointHref} className="underline underline-offset-2">
              <code className="code-chip font-mono">{step.checkpoint}</code>
            </a>
          )}
        </span>
      </p>
    </div>
  </li>
)

export const ArrivalRoute = () => (
  <div className="not-prose my-8">
    <ol className="flex flex-col gap-6">
      {ARRIVAL_ROUTE.map((step, position) => (
        <Step key={step.id} step={step} position={position + 1} />
      ))}
    </ol>

    <div className="border-edge text-ink-faint mt-6 border-t pt-6 text-sm">
      <p>
        <strong className="text-ink-muted font-semibold">
          {ARRIVAL_TOTALS.steps} pages of the {ARRIVAL_TOTALS.sitePages} on this site,{" "}
          {ARRIVAL_TOTALS.blocks} code blocks, about {ARRIVAL_TOTALS.minutes} minutes of reading
        </strong>{" "}
        — so the hour is the typing, not the pages. The minutes are prose at {WORDS_A_MINUTE} words
        a minute, which is the one figure here nobody counted; the pages, the blocks and the order
        are read off the site as this page builds, and every step is further down the sidebar than
        the one before it.
      </p>

      <p className="mt-3">
        {ARRIVAL_TOTALS.compiled}{" "}
        of those blocks are TypeScript, and this repository&rsquo;s own typechecker compiles every
        one of them — a snippet that stopped working is a failing build rather than your bad
        afternoon. The others are shell commands, or marked abridged. If you would rather start
        from a project that already runs than assemble one,{" "}
        <a
          href={ARRIVAL_SHORTCUT_HREF}
          className="text-accent-strong font-medium underline underline-offset-2"
        >
          scaffolding a project
        </a>{" "}
        does the first three steps for you.
      </p>
    </div>
  </div>
)
