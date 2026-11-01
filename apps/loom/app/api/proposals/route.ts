import { sweepDeployment } from "@/app/(portal)/_lib/proposing/run"
import { scheduleCheck } from "@/app/(portal)/_lib/proposing/schedule"

/**
 * `/api/proposals` — the daily sweep in which Loom reads every project's pages
 * and proposes changes by itself (0329 clause 5). Started by the schedule in
 * `vercel.json`; `_lib/proposing/` holds everything it decides.
 *
 * Five minutes, because each page is two model calls one after another; the
 * sweep stops starting pages before the platform would stop it.
 */
export const dynamic = "force-dynamic"
export const maxDuration = 300

export const GET = async (request: Request): Promise<Response> => {
  const check = scheduleCheck(request.headers.get("authorization"), process.env.CRON_SECRET)

  if (check === "unconfigured") {
    return Response.json({ error: "CRON_SECRET is not set on this deployment" }, { status: 503 })
  }

  if (check === "refused") return Response.json({ error: "not the scheduler" }, { status: 401 })

  return Response.json(await sweepDeployment())
}
