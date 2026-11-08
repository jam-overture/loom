import type { Result } from "@jam-overture/loom"

/**
 * A read whose answer is kept for a while, per argument, in this process.
 *
 * For a value that changes rarely and is read on every request: the marketing
 * site asks which key it counts readers under on every page it serves, and
 * the answer changes only when somebody replaces the key on *Connect your
 * site*. Reading it from the database each time put one or two round trips in
 * front of every page, on a connection that may not be open yet.
 *
 * The answer is kept as the promise, so requests that arrive while the first
 * read is in flight share it rather than each starting their own. A refusal is
 * not kept: the next request asks again, so a database that was briefly
 * unreachable does not switch a setting off for the whole window.
 */
export const rememberedFor = <A, T, E>(
  windowMs: number,
  read: (argument: A) => Promise<Result<T, E>>,
  keyOf: (argument: A) => string,
  now: () => number = Date.now
): ((argument: A) => Promise<Result<T, E>>) => {
  const held = new Map<string, { readonly at: number; readonly answer: Promise<Result<T, E>> }>()

  return (argument) => {
    const key = keyOf(argument)
    const kept = held.get(key)
    const at = now()

    if (kept !== undefined && at - kept.at < windowMs) return kept.answer

    const answer = read(argument)
    const entry = { at, answer }

    held.set(key, entry)
    void answer.then(
      (result) => {
        if (!result.ok && held.get(key) === entry) held.delete(key)
      },
      () => {
        if (held.get(key) === entry) held.delete(key)
      }
    )

    return answer
  }
}
