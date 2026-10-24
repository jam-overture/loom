import { describe, expect, it } from "vitest"

import { readRecoveryLink } from "./recovery-link"

describe("readRecoveryLink", () => {
  it("reads the token from a recovery link's fragment", () => {
    expect(readRecoveryLink("#access_token=abc.def&expires_in=3600&type=recovery")).toEqual({
      code: "found",
      token: "abc.def",
    })
  })

  it("refuses a fragment that is not a recovery, such as a sign-up confirmation", () => {
    expect(readRecoveryLink("#access_token=abc.def&type=signup")).toEqual({ code: "missing" })
  })

  it("refuses an empty fragment, and one with an empty token", () => {
    expect(readRecoveryLink("")).toEqual({ code: "missing" })
    expect(readRecoveryLink("#access_token=&type=recovery")).toEqual({ code: "missing" })
  })

  /** The provider reports a spent or expired link in the fragment too. */
  it("refuses a fragment carrying the provider's error instead", () => {
    expect(readRecoveryLink("#error=access_denied&error_code=otp_expired")).toEqual({
      code: "missing",
    })
  })
})
