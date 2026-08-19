/**
 * Who an attempt is counted against.
 *
 * The throttle has to recognise a caller it has seen before. It does not need to
 * know who they are, and a table of addresses beside a public sign-in form is a
 * visitor log nobody asked this portal to keep — so what is stored is a keyed
 * digest of the address, never the address. The deployment can tell that two
 * attempts came from the same place; it cannot tell where, and neither can
 * anyone who reads the table.
 *
 * Keyed with the session secret, so the digests are meaningless outside this
 * deployment. Rotating that secret forgets every lockout as well as invalidating
 * every session, which is the correct pairing: rotation is the "start again"
 * lever, and half of one would be a surprise.
 */

/**
 * A forwarded-for list is written by whoever is in front of the app, and
 * *appended to* by each hop — so the entries on the left are the ones the client
 * could have invented, and the rightmost is what the nearest trusted proxy
 * actually observed.
 *
 * Counting from the right by the number of proxies in front is therefore the
 * only reading that an attacker cannot steer. Taking the leftmost entry — the
 * obvious reading, and the one most examples show — would let a caller reset
 * their own count on every request by sending a header.
 */
export const DEFAULT_TRUSTED_HOPS = 1

export const clientAddress = (forwardedFor: string | null, hops: number): string | null => {
  const entries = (forwardedFor ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

  /**
   * Fewer entries than there are proxies means the request did not arrive the
   * way this deployment is configured to expect. Guessing at the client would
   * mean reading an entry a hop nearer the caller than the one that was
   * trusted, so the answer is that there is no address.
   */
  return entries[entries.length - hops] ?? null
}

/**
 * A malformed value falls back to one hop rather than failing the request.
 *
 * One is the conservative direction — it reads the entry furthest from the
 * caller, so a deployment that has miscounted its proxies over-collects
 * attempts into one bucket rather than handing each caller a bucket they can
 * choose. Refusing to serve would be the other reading of "fail closed", and it
 * would take a portal down over a typo in a variable nobody has to set.
 */
export const resolveTrustedHops = (value: string | undefined): number => {
  const parsed = Number(value?.trim())

  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : DEFAULT_TRUSTED_HOPS
}

/**
 * Named rather than an empty string so a row in the table is legible: attempts
 * whose origin could not be established are counted together, deliberately.
 *
 * On a host that always sets the header this bucket is empty. Where it is not —
 * a misconfigured proxy, or `pnpm dev` — everyone shares one count, which is
 * stricter than counting them separately and is the direction to be wrong in.
 */
export const SHARED_SUBJECT = "unattributed"

const textEncoder = new TextEncoder()

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

/**
 * HMAC-SHA256 rather than a bare hash. The address space is small enough to
 * enumerate — every IPv4 address is four bytes — so an unkeyed digest of one is
 * a reversible encoding of it, and would leave exactly the visitor log this
 * module exists to avoid.
 */
export const subjectFor = async (address: string | null, secret: string): Promise<string> => {
  if (address === null) return SHARED_SUBJECT

  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  return toHex(new Uint8Array(await crypto.subtle.sign("HMAC", key, textEncoder.encode(address))))
}
