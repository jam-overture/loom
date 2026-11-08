import { projectIdSchema } from "@jam-overture/loom/store"

import { actorSchema } from "@/app/(portal)/_lib/auth/accounts"
import { currentActor, roleOf } from "@/app/(portal)/_lib/auth/identity"
import { readWaitingCount } from "@/app/(portal)/_lib/review-reading"
import { waitingCountBody } from "@/app/(portal)/_lib/waiting-count"

export const dynamic = "force-dynamic"

/** Never kept by a browser or a cache: the count is only worth what it says now. */
const FRESH = { "Cache-Control": "no-store" } as const

/**
 * How many changes wait for a person in one project, for the count beside
 * *For review* on the project's rail (`docs/portal-wireframes.md`, *The
 * chrome*).
 *
 * **Why a read of its own rather than the layout's.** A layout is not drawn
 * again when a person moves between the screens it wraps, so a count the
 * layout read would still say *3* after the person had answered all three.
 * The rail asks here each time the address changes instead.
 *
 * Guarded as a screen is: a signed-in member of the project, or nothing. One
 * answer for *not yours* and *no such project*, as everywhere else, so this is
 * not a way to ask which ids exist; and a store that cannot say what somebody
 * may see is no count, never a count for somebody it could not check.
 */
export const GET = async (
  _request: Request,
  { params }: { readonly params: Promise<{ project: string }> }
): Promise<Response> => {
  const actor = await currentActor()

  if (actor === null)
    return Response.json(waitingCountBody(undefined), { status: 401, headers: FRESH })

  const asked = projectIdSchema.safeParse((await params).project)
  const member = actorSchema.safeParse(actor)

  if (!asked.success || !member.success) {
    return Response.json(waitingCountBody(undefined), { status: 404, headers: FRESH })
  }

  const role = await roleOf(member.data, asked.data)

  if (role === null)
    return Response.json(waitingCountBody(undefined), { status: 404, headers: FRESH })
  if (role === undefined) {
    return Response.json(waitingCountBody(undefined), { status: 503, headers: FRESH })
  }

  return Response.json(waitingCountBody(await readWaitingCount(asked.data)), { headers: FRESH })
}
