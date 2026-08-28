import { describeAuthProblem, type AuthResult } from "./auth/config"
import type { SignInPressure } from "./auth/pressure"
import { describeWait, type ThrottlePolicy } from "./auth/throttle"
import type { OutcomeTone } from "./outcome"

/**
 * Sign-in pressure, in the words an operator reads.
 *
 * Separate from the arithmetic in `pressure.ts` for the reason `audit-view.ts`
 * is separate from `auditSnapshot`: the numbers are one thing to get right and
 * the sentence built from them is another, and a component that computed both
 * would only be testable through a renderer.
 *
 * Everything here is bounded by what the log can say. It knows how many callers
 * have failed and how recently; it cannot say who, where, or against which
 * reviewer's key, because `subject.ts` stores a keyed digest on purpose and
 * `survey` does not return even that (0039). So the wording never implies an
 * identity an operator could go and look up.
 */

export type PressureTone = "quiet" | "counting" | "locking"

export type PressureReading = {
  readonly tone: PressureTone
  readonly headline: string
  readonly detail: string
  /**
   * What the reader should do about it, which is the question every screen is
   * supposed to answer and the one this screen had never answered out loud.
   *
   * The answer existed. It was in a comment above the page component — *"There
   * is nothing here to act on and nothing to click, deliberately. Unlocking a
   * caller would mean a way to clear a count from a browser, which is a way to
   * defeat the throttle from a browser"* — addressed to the next programmer
   * rather than to the operator staring at a number that says three people are
   * locked out. A reader who does not know that will spend their next ten
   * minutes looking for the button.
   */
  readonly next: string
}

/**
 * Borrowed from the portal's outcome palette rather than a second one, the same
 * choice `/portal/checkup` made. `locking` is `rejected` because that is what is
 * happening — attempts are being turned away — and not because it is an
 * emergency; the detail is where the difference between "working" and "wrong"
 * is drawn, and colour is never the only channel.
 */
const TONES: Readonly<Record<PressureTone, OutcomeTone>> = {
  quiet: "applied",
  counting: "awaiting",
  locking: "rejected",
}

export const toneOfPressure = (tone: PressureTone): OutcomeTone => TONES[tone]

const SECOND_MS = 1000
const MINUTE_MS = 60 * SECOND_MS
const HOUR_MS = 60 * MINUTE_MS

/**
 * Elapsed time, rounded *down* — the opposite of `describeWait`, which rounds a
 * remaining wait up. A wait reported as shorter than it is invites a retry that
 * is refused again; a failure reported as older than it is makes a burst look
 * finished. Each is rounded in the direction that does not mislead.
 */
export const describeSince = (elapsedMs: number): string => {
  if (elapsedMs < MINUTE_MS) return "less than a minute ago"

  if (elapsedMs < HOUR_MS) {
    const minutes = Math.floor(elapsedMs / MINUTE_MS)

    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  }

  const hours = Math.floor(elapsedMs / HOUR_MS)

  return `${hours} hour${hours === 1 ? "" : "s"} ago`
}

const subjectCount = (count: number): string =>
  `${count} ${count === 1 ? "caller" : "callers"}`

/**
 * A locked count that the survey's cap could not confirm is reported as a floor
 * rather than as a total. It is the number an operator would act on, so it does
 * not get to be approximately right silently.
 */
export const describeLocked = (pressure: SignInPressure): string =>
  `${pressure.lockedIsExact ? "" : "at least "}${pressure.locked}`

const toneFor = (pressure: SignInPressure): PressureTone => {
  if (pressure.locked > 0) return "locking"

  return pressure.subjects === 0 ? "quiet" : "counting"
}

const headlineFor = (pressure: SignInPressure, tone: PressureTone): string => {
  switch (tone) {
    case "quiet":
      return "Nothing is being counted against anyone."
    case "counting":
      return `${subjectCount(pressure.subjects)} ${pressure.subjects === 1 ? "has" : "have"} failed recently. None is locked out.`
    case "locking":
      return `${describeLocked(pressure)} of ${subjectCount(pressure.subjects)} ${pressure.locked === 1 ? "is" : "are"} locked out right now.`
  }
}

const detailFor = (pressure: SignInPressure, tone: PressureTone, now: number): string => {
  if (tone === "quiet") {
    return (
      "Every failed sign-in Loom was still counting has either been forgiven or has aged out, " +
      "so the next attempt from anywhere starts from zero."
    )
  }

  const since =
    pressure.latestFailureAt === null
      ? ""
      : ` The most recent was ${describeSince(now - pressure.latestFailureAt)}.`

  if (tone === "counting") {
    return (
      `${pressure.failures} failed ${pressure.failures === 1 ? "attempt" : "attempts"} ` +
      `${pressure.failures === 1 ? "is" : "are"} still being held against someone.${since} ` +
      "This is what a mistyped key looks like as well as what a slow search does, and the two " +
      "are not distinguishable from here."
    )
  }

  return (
    `Loom is doing exactly what it is meant to: ${pressure.failures} failed ` +
    `${pressure.failures === 1 ? "attempt" : "attempts"} across ` +
    `${subjectCount(pressure.subjects)}, and the longest wait still owed is ` +
    `${describeWait(pressure.longestWaitMs)}.${since} ` +
    "A caller who changes address gets a fresh count, so this is a floor on what is being " +
    "tried rather than a measure of it."
  )
}

/**
 * The three answers to "what do I do now?", which are two kinds of nothing and
 * one kind of nothing that has to be explained.
 *
 * The last one is the whole reason this belongs on the screen. A page reporting
 * that somebody is locked out, with no button anywhere, reads as a page that
 * forgot to have one. It did not: a control that cleared a count from a browser
 * would be a way to clear a count from a browser, which is the same thing the
 * caller doing the guessing wants. Saying so turns a missing feature into a
 * decision the reader can agree with.
 */
const NEXT_STEPS: Readonly<Record<PressureTone, string>> = {
  quiet: "Nothing to do. This is the page you want to be boring.",
  counting:
    "Nothing to do. A count on its own is usually somebody mistyping their own key, and it " +
    "clears itself once they get it right or once enough time passes.",
  locking:
    "If the person locked out is you, wait it out — getting the key right clears the count. " +
    "If it is not, there is deliberately nothing to press here: anything that could let a " +
    "caller back in from a browser would let whoever is guessing do the same. Turning them " +
    "away for good belongs in whatever sits in front of this app.",
}

export const describePressure = (pressure: SignInPressure, now: number): PressureReading => {
  const tone = toneFor(pressure)

  return {
    tone,
    headline: headlineFor(pressure, tone),
    detail: detailFor(pressure, tone, now),
    next: NEXT_STEPS[tone],
  }
}

/**
 * The rule in force, spelled out. A page that said "3 locked out" without
 * saying what locks anyone would leave an operator to read the source to find
 * out whether that is alarming.
 *
 * It read `5 failures within 60 minutes locks a caller out for 1 minute,
 * doubling with each further failure up to 15 minutes. A correct key clears the
 * count.` Every number is unchanged; what moved is that the sentence now names
 * the thing a person typed (a sign-in) rather than the thing the code counts
 * (a failure), and says "getting the key right" where it said "a correct key",
 * because one of those is something you do and the other is a state of affairs.
 */
export const describePolicy = (policy: ThrottlePolicy): string =>
  `${policy.threshold} failed sign-ins within ${describeWait(policy.windowMs)} lock somebody ` +
  `out for ${describeWait(policy.lockoutMs)}. Each further failure doubles the wait, up to ` +
  `${describeWait(policy.maxLockoutMs)}. Getting the key right clears the count.`

/**
 * The sign-in page in two altitudes: what a visitor reads, and what an operator
 * needs to fix.
 *
 * The page used to lead with the operator's message word for word —
 * `LOOM_PORTAL_SESSION_SECRET is unset or shorter than 32 characters, so no
 * session can be signed. Generate one with: openssl rand -hex 32` — because
 * `describeAuthProblem` returns exactly that string and the page rendered it
 * unaltered. Right for an operator, wrong for a visitor who has never heard of
 * this portal and reads it as an error they somehow caused.
 *
 * The plain-language rule this file exists to support (0074, and the
 * `vocabulary.ts` comment): a visitor reads a sentence in a person's words,
 * and the operator's message is one click away and unchanged. So this splits
 * the one string into two, and the technical field is the exact bytes
 * `describeAuthProblem` returned — nothing removed.
 *
 * Every case gets one plain sentence because a visitor's next move is the
 * same in both — wait for whoever runs this to finish setting it up, or look
 * at the demo in the meantime. Which environment variable is missing does not
 * change what they do; it belongs in the disclosure.
 */
export type AuthReadout =
  | { readonly ok: true }
  | {
      readonly ok: false
      /** The one sentence a visitor reads first. Never a variable name. */
      readonly headline: string
      /** One more sentence saying what the visitor might do next. */
      readonly detail: string
      /** `describeAuthProblem`'s output, verbatim. Shown behind a disclosure. */
      readonly technical: string
    }

export const authReadout = (auth: AuthResult): AuthReadout => {
  if (auth.ok) return { ok: true }

  return {
    ok: false,
    headline: "This portal isn't set up yet.",
    detail:
      "Whoever runs this deployment has to finish configuring sign-in before " +
      "anyone can use it. You can still see what Loom does in the live demo.",
    technical: describeAuthProblem(auth.error),
  }
}
