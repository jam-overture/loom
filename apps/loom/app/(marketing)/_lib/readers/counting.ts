import { INTAKE_KEY, readIntakeSwitch } from "@/app/_lib/reader-signals/settings"

/**
 * Whether this deployment counts the people reading this site.
 *
 * `/what-readers-do` has said since 16 September that *counting is off unless
 * you turn it on*, and until now that was a sentence about somebody else's
 * deployment: this surface broadcast nothing, so the claim was true of it by
 * doing nothing. Three things turn on this one answer now, and they have to
 * agree or the page lies:
 *
 * | what reads it | what it does with it |
 * | --- | --- |
 * | `render.ts` | renders every page `addressed`, so each band carries the id a signal names |
 * | `layout.tsx` | mounts the one client component that starts a broadcaster |
 * | the pages | say, in words a reader can check, whether they are counting them |
 *
 * So it is one function, read in one place per request, and never a second
 * environment lookup that could disagree with the first.
 *
 * **It is the endpoint's own switch, not a switch of our own.** `LOOM_SIGNAL_INTAKE`
 * is what decides whether `/api/reader-signals` keeps a batch
 * (`app/_lib/reader-signals/settings.ts`), and a surface that broadcast on some
 * other condition would either post every reader's batch into a refusal or keep
 * quiet on a deployment that had asked to collect. A page that measures nobody
 * should also not be *asking* to be measured — the bytes, the observers and the
 * beacons are all cost with nothing at the end of them.
 *
 * **Unusable is off.** A value that is neither on nor off is reported by the
 * endpoint as a mistake and keeps nothing (the switch's own rule), so a page
 * that said it was counting you on the strength of `LOOM_SIGNAL_INTAKE=maybe`
 * would be claiming something the deployment does not do. Off is the honest
 * reading of it, and the operator hears about it from the status endpoint, which
 * is the place that can say *you typed something I could not use* to somebody
 * able to fix it.
 *
 * **Read on the server, passed down as a boolean.** Nothing here may reach a
 * browser bundle: `settings.ts` reaches the portal's proxy-hop resolver, and
 * `@jam-overture/loom/signals` carries the schemas — about 66 KB of them (0136). What
 * the browser gets is this answer, as one `true`, and the kinds and types in
 * `asked.ts`, which import nothing at runtime.
 */
export const readersCountedHere = (
  env: Record<string, string | undefined> = process.env
): boolean => readIntakeSwitch(env[INTAKE_KEY]).state === "on"
