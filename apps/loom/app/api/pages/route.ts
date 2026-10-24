import { receivePages } from "@/app/_lib/pages/receive"
import { appPublishDoor } from "@/app/_lib/pages/store"

/**
 * `/api/pages` — where a site's build hands Loom its pages (0312). Everything
 * it decides is in `_lib/pages/receive.ts`, which is testable without a
 * request.
 *
 * `force-dynamic` for the signals door's reason: a route that keeps what it is
 * sent must run per request.
 */
export const dynamic = "force-dynamic"

export const POST = (request: Request): Promise<Response> => receivePages(request, appPublishDoor)
