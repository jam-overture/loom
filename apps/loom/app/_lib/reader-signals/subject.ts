import { clientAddress, SHARED_SUBJECT } from "@/app/(portal)/_lib/auth/subject"

/**
 * Who a delivery is counted against.
 *
 * The same problem the sign-in throttle solved and a different answer, because
 * the constraint is different in the one way that matters. `auth/subject.ts`
 * keys its digest with the session secret because its subjects are **written to
 * a table**, and a digest that changed every deploy would forget every lockout.
 *
 * Nothing here is written anywhere. The counter these keys index is a map in
 * one process's memory (`createIntakeGate`), so a key only has to be stable for
 * as long as that map is — and the key it is derived with can therefore be
 * random, minted at module load, and never stored or shared. Two instances
 * disagree about every subject and it costs nothing, because they were counting
 * separately anyway.
 *
 * That is strictly more private than the sign-in log and worth spelling out,
 * since this is the endpoint 0146 is about: the digests are meaningless to the
 * next process, to the other instance, and to anybody holding a heap dump of
 * this one, and there is no key anywhere that could turn one back into an
 * address. The address itself is read off a header and dropped inside this
 * function.
 *
 * **The forwarded-for reading is imported rather than rewritten.** Counting
 * from the right by the number of trusted hops is the only reading an attacker
 * cannot steer, it is subtle, it is already tested, and a second copy of it
 * here would be a second place for it to be quietly wrong.
 */

/**
 * Minted per process, never stored, never sent. `crypto.getRandomValues` rather
 * than `randomUUID` so this file reaches for nothing Node-only — the endpoint
 * runs wherever the deployment puts it.
 */
const processKey = crypto.getRandomValues(new Uint8Array(32))

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

/**
 * Imported once. `auth/subject.ts` imports its key on every call, which is
 * right for a form somebody submits and wrong for an endpoint a browser posts
 * to every five seconds.
 */
const keyed = crypto.subtle.importKey("raw", processKey, { name: "HMAC", hash: "SHA-256" }, false, [
  "sign",
])

export const subjectOf = async (request: Request, hops: number): Promise<string> => {
  const address = clientAddress(request.headers.get("x-forwarded-for"), hops)

  /**
   * No address means everyone is counted together, which is stricter than
   * counting them separately and is the direction to be wrong in. On `pnpm dev`
   * that is every caller, and on `pnpm dev` there is one.
   */
  if (address === null) return SHARED_SUBJECT

  return toHex(
    new Uint8Array(await crypto.subtle.sign("HMAC", await keyed, new TextEncoder().encode(address)))
  )
}
