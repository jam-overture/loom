/**
 * A ceiling on an await into somebody else's code.
 *
 * Loom does two things it cannot predict the duration of: it asks a model what
 * to change, and it asks a host's adapter to answer a binding. Both are
 * documented as *reportable* failures — `ModelClientError.unavailable` is "the
 * service could not answer now" and `SourceFailure.unavailable` says in as many
 * words that it covers "a timeout, a dead connection" — and neither seam could
 * produce one, because nothing in the runtime ever stopped waiting.
 *
 * A call that never answers is the worst of the failure modes and the only one
 * with no sentence: a surface shows a spinner, the log says nothing, and the
 * thing that eventually gives up is the reader. Sandboxed deployments make it
 * routine rather than exotic — Node's `fetch` ignores `HTTPS_PROXY`, so a
 * request behind a proxy is not refused, it is simply never answered.
 *
 * So: **the runtime, not the host, decides how long it is prepared to wait**, and
 * an expiry is an ordinary value in the vocabulary the seam already has. There is
 * deliberately no way to switch a ceiling off. A caller that wants to wait twenty
 * minutes names twenty minutes, which is a number a reader of the call site can
 * see; `undefined` meaning "forever" is not.
 */

/**
 * The ceiling a caller named, or the default when it named nothing usable.
 *
 * `clampLimit`'s rule, for the same reason: this value reaches a `setTimeout`,
 * where a `NaN` fires immediately and a negative one fires immediately, and
 * both of those turn a slow page into an instantly broken one.
 */
export const ceilingOf = (given: number | undefined, fallback: number): number =>
  given !== undefined && Number.isFinite(given) && given > 0 ? given : fallback

/** `250ms`, `10s`, `3m` — a ceiling in the unit somebody would say it in. */
export const describeCeiling = (ms: number): string => {
  if (ms >= 60_000 && ms % 60_000 === 0) return `${ms / 60_000}m`
  if (ms >= 1_000) return `${Number((ms / 1_000).toFixed(2))}s`

  return `${ms}ms`
}

/**
 * Runs `attempt` with a ceiling, and answers with `expired()` if it is reached
 * first.
 *
 * The signal is the half that matters as much as the answer. Walking away from a
 * promise does not stop the work behind it: without the abort, a page that gave
 * up on an integration still holds its socket, and under load the connections a
 * deployment leaks are the ones it already stopped waiting for. An
 * implementation that ignores the signal still cannot delay the answer — it can
 * only fail to release what it is holding.
 *
 * This never rejects for a reason `attempt` did not give it, and it never leaves
 * a rejection unhandled: a promise that loses the race is still going to settle,
 * and an unhandled rejection arriving after the answer would take a Node server
 * down for a call the runtime had already reported on.
 */
export const withCeiling = <T>(
  ceilingMs: number,
  expired: () => T,
  attempt: (signal: AbortSignal) => Promise<T>
): Promise<T> => {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined

  const reached = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      controller.abort(new Error(`no answer in ${describeCeiling(ceilingMs)}`))
      resolve(expired())
    }, ceilingMs)
  })

  const answered = attempt(controller.signal)
  answered.catch(() => undefined)

  return Promise.race([answered, reached]).finally(() => {
    clearTimeout(timer)
  })
}
