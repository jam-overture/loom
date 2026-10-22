import { err, ok, type Result } from "@jam-overture/loom"

import type { Actor } from "./accounts"
import { emailSchema, type Credentials } from "./credentials"

/**
 * Who holds the passwords: Supabase Auth, spoken to over its HTTP API (0304).
 *
 * **Its HTTP API, not its client.** 0022 reached Postgres by SQL rather than
 * through the Supabase client, and four requests do not need a library: a
 * sign-up, a password grant, a recovery and a password change. Each is one
 * `fetch`, so the whole contract with the provider is on this page.
 *
 * **The provider holds the password and sends the email; the portal keeps
 * its own session.** A password check answers *which address is this*, and
 * from there sign-in is exactly what it was under 0285: the throttle, the
 * session cookie, `requireActor`. Nothing the provider returns is kept, so its
 * tokens never become a second session to reason about.
 *
 * Free of Next and of `process.env`, so the requests and what each answer
 * means are tested against a stubbed `fetch`.
 */

export type PasswordAuthConfig = {
  /** `https://<project>.supabase.co`, with no path. */
  readonly url: string
  /** The project's public (anon) key. Public by design; it identifies the project. */
  readonly anonKey: string
}

export const SUPABASE_URL_KEY = "LOOM_SUPABASE_URL"
export const SUPABASE_ANON_KEY_KEY = "LOOM_SUPABASE_ANON_KEY"

/** `undefined` until both are set, which the sign-in screen says rather than failing at submit. */
export const readPasswordAuthConfig = (
  env: Record<string, string | undefined>
): PasswordAuthConfig | undefined => {
  const url = env[SUPABASE_URL_KEY]?.trim().replace(/\/+$/u, "") ?? ""
  const anonKey = env[SUPABASE_ANON_KEY_KEY]?.trim() ?? ""

  return url === "" || anonKey === "" ? undefined : { url, anonKey }
}

/**
 * What can go wrong, in the terms a form answers in.
 *
 * `rejected` is deliberately one code for *no such address* and *wrong
 * password*, because the provider does not distinguish them and a form that
 * did would be a way to ask who has an account.
 */
export type PasswordAuthError =
  | { readonly code: "rejected" }
  | { readonly code: "unconfirmed" }
  | { readonly code: "taken" }
  | { readonly code: "weak"; readonly detail: string }
  | { readonly code: "expired" }
  | { readonly code: "busy" }
  | { readonly code: "unavailable"; readonly detail: string }

export type SignUpOutcome = "confirm-by-email" | "confirmed"

export type PasswordAuth = {
  /** `confirmTo` is where the confirmation link lands once it has been followed. */
  readonly signUp: (
    credentials: Credentials,
    confirmTo: string
  ) => Promise<Result<SignUpOutcome, PasswordAuthError>>
  readonly signIn: (credentials: Credentials) => Promise<Result<Actor, PasswordAuthError>>
  /** `resetTo` is the page the emailed link opens, carrying a one-time token. */
  readonly recover: (email: Actor, resetTo: string) => Promise<Result<void, PasswordAuthError>>
  /** Sets a new password with the token a recovery link carried. */
  readonly setPassword: (
    recoveryToken: string,
    password: string
  ) => Promise<Result<Actor, PasswordAuthError>>
}

/** Long enough for a slow provider, short enough that a form does not hang. */
const REQUEST_BUDGET_MS = 8000

type Answer = { readonly status: number; readonly body: Record<string, unknown> }

/**
 * The error code the provider gave, from whichever field this version of it
 * puts it in: newer versions say `error_code`, older ones `error`.
 */
const codeOf = (answer: Answer): string => {
  const { error_code: errorCode, code, error } = answer.body

  return [errorCode, code, error].find((value): value is string => typeof value === "string") ?? ""
}

const messageOf = (answer: Answer): string => {
  const { msg, message, error_description: description } = answer.body

  return (
    [msg, message, description].find((value): value is string => typeof value === "string") ??
    `the provider answered ${answer.status}`
  )
}

/** The address an answer names, read through the same schema a typed one is. */
const actorOf = (body: Record<string, unknown>): Actor | undefined => {
  const user = (body["user"] ?? body) as Record<string, unknown>
  const parsed = emailSchema.safeParse(user["email"])

  return parsed.success ? parsed.data : undefined
}

/** Every failure an answer can carry that is not particular to one request. */
const commonFailure = (answer: Answer): PasswordAuthError =>
  answer.status === 429 || codeOf(answer).startsWith("over_")
    ? { code: "busy" }
    : { code: "unavailable", detail: messageOf(answer) }

export const supabasePasswordAuth = (
  config: PasswordAuthConfig,
  send: typeof fetch = fetch
): PasswordAuth => {
  const request = async (
    method: "POST" | "PUT",
    path: string,
    body: Record<string, unknown>,
    bearer: string = config.anonKey
  ): Promise<Result<Answer, PasswordAuthError>> => {
    try {
      const response = await send(`${config.url}/auth/v1${path}`, {
        method,
        headers: {
          apikey: config.anonKey,
          authorization: `Bearer ${bearer}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_BUDGET_MS),
      })
      const text = await response.text()
      const parsed: unknown = text === "" ? {} : JSON.parse(text)

      return ok({
        status: response.status,
        body:
          typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {},
      })
    } catch (cause) {
      return err({
        code: "unavailable",
        detail: cause instanceof Error ? cause.message : "the provider did not answer",
      })
    }
  }

  const redirecting = (path: string, to: string): string =>
    `${path}?redirect_to=${encodeURIComponent(to)}`

  return {
    signUp: async (credentials, confirmTo) => {
      const answered = await request("POST", redirecting("/signup", confirmTo), {
        email: credentials.email,
        password: credentials.password,
      })
      if (!answered.ok) return answered

      const answer = answered.value
      const code = codeOf(answer)

      if (answer.status === 200) {
        return ok(
          typeof answer.body["access_token"] === "string" ? "confirmed" : "confirm-by-email"
        )
      }
      if (code === "user_already_exists" || code === "email_exists") return err({ code: "taken" })
      if (code === "weak_password") return err({ code: "weak", detail: messageOf(answer) })

      return err(commonFailure(answer))
    },

    signIn: async (credentials) => {
      const answered = await request("POST", "/token?grant_type=password", {
        email: credentials.email,
        password: credentials.password,
      })
      if (!answered.ok) return answered

      const answer = answered.value
      const code = codeOf(answer)

      if (answer.status === 200) {
        const actor = actorOf(answer.body)

        return actor === undefined
          ? err({ code: "unavailable", detail: "the provider named no usable address" })
          : ok(actor)
      }
      if (code === "email_not_confirmed") return err({ code: "unconfirmed" })
      if (code === "invalid_credentials" || code === "invalid_grant")
        return err({ code: "rejected" })

      return err(commonFailure(answer))
    },

    recover: async (email, resetTo) => {
      const answered = await request("POST", redirecting("/recover", resetTo), { email })
      if (!answered.ok) return answered

      return answered.value.status === 200 ? ok(undefined) : err(commonFailure(answered.value))
    },

    setPassword: async (recoveryToken, password) => {
      const answered = await request("PUT", "/user", { password }, recoveryToken)
      if (!answered.ok) return answered

      const answer = answered.value
      const code = codeOf(answer)

      if (answer.status === 200) {
        const actor = actorOf(answer.body)

        return actor === undefined
          ? err({ code: "unavailable", detail: "the provider named no usable address" })
          : ok(actor)
      }
      if (answer.status === 401 || answer.status === 403 || code === "bad_jwt") {
        return err({ code: "expired" })
      }
      if (code === "weak_password" || code === "same_password") {
        return err({ code: "weak", detail: messageOf(answer) })
      }

      return err(commonFailure(answer))
    },
  }
}
