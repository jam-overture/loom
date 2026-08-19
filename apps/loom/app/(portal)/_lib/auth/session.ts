/**
 * A signed session token, and nothing else.
 *
 * Deliberately free of Next, of the runtime, and of `process.env`: the guard
 * that runs in middleware and the pages that run in Node both verify tokens the
 * same way, and a module either of them could not import would force a second
 * implementation of the one check that must not have two.
 *
 * The token carries the actor and says when it was issued. It carries nothing
 * else — no roles, no display name, no key material — because everything a
 * bearer token asserts is something an attacker who steals one gets to assert.
 * The narrower the claim, the smaller that is.
 */

/**
 * Lives here rather than beside the code that sets it, so the middleware guard
 * can name the cookie without importing `next/headers` — which is server-only
 * and would not load on the edge.
 */
export const SESSION_COOKIE = "loom_portal_session"

export type Session = {
  readonly actor: string
  readonly issuedAt: number
  readonly expiresAt: number
}

export type SessionProblem =
  /** Not a token this version knows how to read. */
  | { readonly code: "malformed" }
  /** Read, but not signed by this deployment's secret — forged, or the secret rotated. */
  | { readonly code: "bad-signature" }
  | { readonly code: "expired"; readonly expiredAt: number }

/**
 * Twelve hours: long enough to review for a day without signing in twice, short
 * enough that a token copied off a shared machine stops working the same day.
 * A session is re-minted on nothing — there is no sliding renewal, because a
 * window that extends itself whenever it is used never closes.
 */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000

const VERSION = "v1"

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const toBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

const fromBase64Url = (value: string): Uint8Array | null => {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) return null

  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    "="
  )

  try {
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
  } catch {
    return null
  }
}

/**
 * Comparison whose duration does not depend on where two byte strings first
 * differ. Length is compared first and leaks only that, which for a fixed-size
 * HMAC is a constant.
 */
export const timingSafeEqual = (left: Uint8Array, right: Uint8Array): boolean => {
  if (left.length !== right.length) return false

  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0)
  }

  return difference === 0
}

const signingKey = (secret: string): Promise<CryptoKey> =>
  crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

const sign = async (payload: string, secret: string): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.sign("HMAC", await signingKey(secret), textEncoder.encode(payload)))

const payloadOf = (actor: string, issuedAt: number): string =>
  `${VERSION}.${toBase64Url(textEncoder.encode(actor))}.${issuedAt}`

export const mintSession = async (
  actor: string,
  issuedAt: number,
  secret: string
): Promise<string> => {
  const payload = payloadOf(actor, issuedAt)

  return `${payload}.${toBase64Url(await sign(payload, secret))}`
}

/**
 * The whole verification, in the order that matters: shape, then signature,
 * then expiry.
 *
 * Signature before expiry is not an accident. Expiry is read out of the token,
 * so checking it first would mean trusting a number an unauthenticated caller
 * wrote — and a forged token claiming a distant expiry would be answered with
 * "expired: no" before anything established it was a token at all.
 */
export const readSession = async (
  token: string,
  secret: string,
  now: number
): Promise<{ readonly ok: true; readonly value: Session } | { readonly ok: false; readonly error: SessionProblem }> => {
  const parts = token.split(".")
  const [version, encodedActor, issuedAtText, signature] = parts

  if (parts.length !== 4 || version !== VERSION || !encodedActor || !issuedAtText || !signature) {
    return { ok: false, error: { code: "malformed" } }
  }

  const issuedAt = Number(issuedAtText)
  if (!Number.isSafeInteger(issuedAt) || issuedAt <= 0) {
    return { ok: false, error: { code: "malformed" } }
  }

  const presented = fromBase64Url(signature)
  const actorBytes = fromBase64Url(encodedActor)
  if (!presented || !actorBytes) return { ok: false, error: { code: "malformed" } }

  const expected = await sign(`${version}.${encodedActor}.${issuedAtText}`, secret)
  if (!timingSafeEqual(presented, expected)) {
    return { ok: false, error: { code: "bad-signature" } }
  }

  const actor = textDecoder.decode(actorBytes)
  if (actor.length === 0) return { ok: false, error: { code: "malformed" } }

  const expiresAt = issuedAt + SESSION_TTL_MS
  if (now >= expiresAt) return { ok: false, error: { code: "expired", expiredAt: expiresAt } }

  return { ok: true, value: { actor, issuedAt, expiresAt } }
}

export const describeSessionProblem = (problem: SessionProblem): string => {
  switch (problem.code) {
    case "malformed":
      return "That session is not one this portal issued."
    case "bad-signature":
      return "That session was not signed by this deployment. Sign in again."
    case "expired":
      return "That session has expired. Sign in again."
  }
}
