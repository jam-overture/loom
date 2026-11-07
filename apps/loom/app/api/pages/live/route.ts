import { serveLivePages } from "@/app/_lib/pages/live"
import { appReadDoor } from "@/app/_lib/pages/store"

/**
 * `/api/pages/live` — where a customer's server pulls the project's live
 * pages (0358 clause 3). Everything it decides is in `_lib/pages/live.ts`,
 * which is testable without a request.
 *
 * `force-dynamic` because the answer is whatever was accepted a moment ago.
 */
export const dynamic = "force-dynamic"

export const GET = (request: Request): Promise<Response> => serveLivePages(request, appReadDoor)
