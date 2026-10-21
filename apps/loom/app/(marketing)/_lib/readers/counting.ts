import { appIngestKeys } from "@/app/_lib/reader-signals/key-store"
import type { IngestKeyStore } from "@/app/_lib/reader-signals/keys"
import { INTAKE_KEY, readIntakeSwitch } from "@/app/_lib/reader-signals/settings"

import { siteSignalUrl } from "./key"

/**
 * Whether this deployment counts the people reading this site.
 *
 * This site has said since 16 September that *counting is off unless you turn
 * it on* — on the retired `/what-readers-do` then, in *What this page counts*
 * on `/what-you-run` now. Until this module, that was a sentence about somebody
 * else's deployment: this surface broadcast nothing, so the claim was true of
 * it by doing nothing. Two things turn on this one answer now, and they have
 * to agree or the page lies:
 *
 * | what reads it | what it does with it |
 * | --- | --- |
 * | `render.ts` | renders every page `addressed`, so each band carries the id a signal names |
 * | `layout.tsx` | mounts the one client component that starts a broadcaster |
 *
 * So it is one function, read in one place per request, and never a second
 * environment lookup that could disagree with the first.
 *
 * ## It is the switch **and** a key, as of 20 October
 *
 * It was the switch alone until today, and the gap was filed by portal steering
 * the day 4b landed: since the door refuses every delivery it cannot name
 * (0298), a deployment with `LOOM_SIGNAL_INTAKE=on` that has never run
 * `pnpm signals:key prj_default` has nowhere to post. `layout.tsx` already knew
 * that and mounted no broadcaster. `render.ts` did not, so every page came back
 * carrying the addresses a signal names with nothing on the page able to send
 * one — 6.4 KB of them on the front door, 6.1 on `/how-it-works`, 3.6 on
 * `/what-you-run`, read by nobody.
 *
 * That is the state `render.ts`' own comment says must not happen: *a page
 * carrying the addresses while nothing broadcasts is a page that looks
 * instrumented and is not.* So the two halves are one answer here rather than
 * one answer and a second condition further down, and `readerSignalUrl` is
 * where it is decided — the boolean is that URL existing, which is as close as
 * two callers can get to reading the same fact.
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
 * **What it costs, and who pays it.** On a deployment that has not switched
 * signals on — which is every deployment today, this one included — it is one
 * environment read and no query, exactly as before. On one that has, the key
 * table is read twice per request rather than once: `layout.tsx` asked it
 * already, and `render.ts` now asks it too. That is the price of the markup and
 * the broadcaster agreeing, and it is a real price on a pool where every query
 * waits for the last (`stored.ts` has the argument, and the three seeding reads
 * it removed on 13 October). Not memoised, because the honest spellings are a
 * per-request cache this repository uses nowhere and a per-process one that
 * would serve a stale answer across a re-mint. Worth revisiting if a counting
 * deployment ever measures it; not worth a cache nothing has asked for yet.
 *
 * **Read on the server, passed down as a boolean.** Nothing here may reach a
 * browser bundle: `settings.ts` reaches the portal's proxy-hop resolver, and
 * `@jam-overture/loom/signals` carries the schemas — about 66 KB of them (0136). What
 * the browser gets is this answer, as one `true`, and the kinds and types in
 * `asked.ts`, which import nothing at runtime.
 */

/**
 * Where this site's pages post their readers' signals, or `null` when this
 * deployment counts nobody.
 *
 * **The switch is asked first, and the table only if it said yes.** A
 * deployment that never asked for reader signals never asks this table
 * anything, which is the property `readers/key.ts` was written expecting and is
 * now enforced here rather than by each caller remembering to check.
 */
export const readerSignalUrl = async (
  env: Record<string, string | undefined> = process.env,
  keys: IngestKeyStore = appIngestKeys
): Promise<string | null> =>
  readIntakeSwitch(env[INTAKE_KEY]).state === "on" ? siteSignalUrl(keys, env) : null

/**
 * The same answer as a boolean, for the caller that renders rather than mounts.
 *
 * It is `readerSignalUrl` and a comparison, deliberately: a boolean worked out
 * from the switch alone is what shipped 16 KB of unread addresses across three
 * pages, and two functions reading two halves of one condition is how that
 * happened. The one case this cannot close is a key minted between the layout's
 * read and the page's, which would address a page whose broadcaster had not
 * started. It costs a reader nothing and the next request is right.
 */
export const readersCountedHere = async (
  env: Record<string, string | undefined> = process.env,
  keys: IngestKeyStore = appIngestKeys
): Promise<boolean> => (await readerSignalUrl(env, keys)) !== null
