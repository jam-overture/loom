import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto"

import { err, ok, type Result } from "@jam-overture/loom"

/**
 * How a project's own model key is kept at rest (0332 clause 2).
 *
 * A model key is a bill somebody else pays, usable anywhere, so unlike the
 * project key (0298) it is never stored readable and unlike the publish key
 * (0312) it cannot be kept as a digest: Loom has to send it back to Anthropic.
 * So it is sealed with AES-256-GCM under a key derived from the portal's session
 * secret, which every deployment that signs anybody in already holds. A copy of
 * the database without the deployment's environment is a table of noise.
 *
 * **Derived, not the secret itself.** HKDF with its own label means the bytes
 * that sign a session and the bytes that seal a key are unrelated, so neither
 * use can leak the other. Replacing the session secret makes every sealed key
 * unreadable, which is said to the owner as *set it again* rather than guessed
 * at.
 *
 * Pure apart from the random nonce: no store, no clock, no `process.env`.
 */

const LABEL = "loom model keys v1"
const VERSION = "v1"
const NONCE_BYTES = 12

export type Sealer = {
  readonly seal: (plain: string) => string
  /** `unreadable` is a value sealed under another secret, or not sealed by this at all. */
  readonly open: (sealed: string) => Result<string, "unreadable">
}

const encode = (bytes: Uint8Array): string => Buffer.from(bytes).toString("base64url")
const decode = (text: string): Buffer => Buffer.from(text, "base64url")

export const sealerFrom = (secret: string): Sealer => {
  const key = Buffer.from(hkdfSync("sha256", secret, "", LABEL, 32))

  return {
    seal: (plain) => {
      const nonce = randomBytes(NONCE_BYTES)
      const cipher = createCipheriv("aes-256-gcm", key, nonce)
      const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])

      return [VERSION, encode(nonce), encode(cipher.getAuthTag()), encode(body)].join(".")
    },

    open: (sealed) => {
      const [version, nonce, tag, body, ...rest] = sealed.split(".")

      if (version !== VERSION || !nonce || !tag || body === undefined || rest.length > 0) {
        return err("unreadable")
      }

      try {
        const decipher = createDecipheriv("aes-256-gcm", key, decode(nonce))
        decipher.setAuthTag(decode(tag))

        return ok(Buffer.concat([decipher.update(decode(body)), decipher.final()]).toString("utf8"))
      } catch {
        return err("unreadable")
      }
    },
  }
}
