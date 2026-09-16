import { appIntake } from "@/app/_lib/reader-signals/intake"
import { readerSignalStatus, receiveReaderSignals } from "@/app/_lib/reader-signals/receive"

/**
 * `/api/reader-signals` — where a published page's batches arrive.
 *
 * The only write endpoint in this application a stranger may use, and the only
 * route that sits outside all five route groups, because the pages posting to
 * it are in three of them. Everything it decides is in
 * `_lib/reader-signals/receive.ts`, which is testable without a request.
 *
 * `force-dynamic` because a route that keeps what it is sent must run per
 * request; without it a build that can evaluate this module is free to answer
 * from a cached response.
 */
export const dynamic = "force-dynamic"

export const POST = (request: Request): Promise<Response> =>
  receiveReaderSignals(request, appIntake)

/** Whether this deployment's mouth is open, for an operator. Never for a sender. */
export const GET = (): Response => readerSignalStatus(appIntake)
