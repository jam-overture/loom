import { describe, expect, it } from "vitest"

import { readPasswordAuthConfig, supabasePasswordAuth } from "./password-auth"
import { emailSchema } from "./credentials"

const CONFIG = { url: "https://abc.supabase.co", anonKey: "anon" }
const ANA = { email: emailSchema.parse("ana@example.com"), password: "correct horse battery" }

type Seen = { url: string; init: RequestInit }

/** A provider that gives one answer, and the request it was asked. */
const answering = (status: number, body: unknown) => {
  const seen: Seen[] = []
  const send = (async (url: string, init: RequestInit) => {
    seen.push({ url, init })

    return new Response(JSON.stringify(body), { status })
  }) as unknown as typeof fetch

  return { auth: supabasePasswordAuth(CONFIG, send), seen }
}

describe("reading the provider's settings", () => {
  it("needs both, and drops a trailing slash", () => {
    expect(
      readPasswordAuthConfig({
        LOOM_SUPABASE_URL: "https://abc.supabase.co/",
        LOOM_SUPABASE_ANON_KEY: "k",
      })
    ).toEqual({ url: "https://abc.supabase.co", anonKey: "k" })
    expect(readPasswordAuthConfig({ LOOM_SUPABASE_URL: "https://abc.supabase.co" })).toBeUndefined()
  })
})

describe("signing in", () => {
  it("asks for a password grant and answers with the address it names", async () => {
    const { auth, seen } = answering(200, {
      access_token: "t",
      user: { email: "Ana@Example.com" },
    })

    expect(await auth.signIn(ANA)).toEqual({ ok: true, value: "ana@example.com" })
    expect(seen[0]?.url).toBe("https://abc.supabase.co/auth/v1/token?grant_type=password")
    expect(new Headers(seen[0]?.init.headers).get("apikey")).toBe("anon")
  })

  /** One answer for no account and a wrong password, as the provider gives. */
  it("reads invalid credentials as rejected", async () => {
    const { auth } = answering(400, { error_code: "invalid_credentials", msg: "Invalid login" })

    expect(await auth.signIn(ANA)).toEqual({ ok: false, error: { code: "rejected" } })
  })

  it("reads an older provider's invalid grant the same way", async () => {
    const { auth } = answering(400, { error: "invalid_grant" })

    expect(await auth.signIn(ANA)).toEqual({ ok: false, error: { code: "rejected" } })
  })

  it("says an address is waiting to be confirmed", async () => {
    const { auth } = answering(400, { error_code: "email_not_confirmed" })

    expect(await auth.signIn(ANA)).toEqual({ ok: false, error: { code: "unconfirmed" } })
  })

  it("reads a rate limit as busy rather than as a wrong password", async () => {
    const { auth } = answering(429, { error_code: "over_request_rate_limit" })

    expect(await auth.signIn(ANA)).toEqual({ ok: false, error: { code: "busy" } })
  })

  it("reports a provider that cannot be reached rather than throwing", async () => {
    const down = (() => Promise.reject(new Error("connect refused"))) as unknown as typeof fetch

    expect(await supabasePasswordAuth(CONFIG, down).signIn(ANA)).toEqual({
      ok: false,
      error: { code: "unavailable", detail: "connect refused" },
    })
  })
})

describe("signing up", () => {
  it("sends where the confirmation lands, and says to check the inbox", async () => {
    const { auth, seen } = answering(200, { id: "u", email: "ana@example.com" })

    expect(await auth.signUp(ANA, "https://www.loomjs.org/portal/sign-in")).toEqual({
      ok: true,
      value: "confirm-by-email",
    })
    expect(seen[0]?.url).toBe(
      "https://abc.supabase.co/auth/v1/signup?redirect_to=https%3A%2F%2Fwww.loomjs.org%2Fportal%2Fsign-in"
    )
  })

  it("knows when the provider confirmed the address itself", async () => {
    const { auth } = answering(200, { access_token: "t", user: { email: "ana@example.com" } })

    expect(await auth.signUp(ANA, "https://x")).toEqual({ ok: true, value: "confirmed" })
  })

  it("says an address already has an account", async () => {
    const { auth } = answering(422, { error_code: "user_already_exists" })

    expect(await auth.signUp(ANA, "https://x")).toEqual({ ok: false, error: { code: "taken" } })
  })
})

describe("recovering a password", () => {
  it("asks the provider to email a link to the reset page", async () => {
    const { auth, seen } = answering(200, {})

    expect(await auth.recover(ANA.email, "https://www.loomjs.org/portal/reset-password")).toEqual({
      ok: true,
      value: undefined,
    })
    expect(seen[0]?.url).toContain("/auth/v1/recover?redirect_to=")
    expect(JSON.parse(String(seen[0]?.init.body))).toEqual({ email: "ana@example.com" })
  })

  it("sets the new password with the link's token, not the public key", async () => {
    const { auth, seen } = answering(200, { email: "ana@example.com" })

    expect(await auth.setPassword("recovery-token", "a brand new password")).toEqual({
      ok: true,
      value: "ana@example.com",
    })
    expect(seen[0]?.init.method).toBe("PUT")
    expect(new Headers(seen[0]?.init.headers).get("authorization")).toBe("Bearer recovery-token")
  })

  it("reads a used or expired link as expired", async () => {
    const { auth } = answering(401, { error_code: "bad_jwt" })

    expect(await auth.setPassword("old", "a brand new password")).toEqual({
      ok: false,
      error: { code: "expired" },
    })
  })
})
