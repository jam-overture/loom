import { currentActor, roleOf } from "@/app/(portal)/_lib/auth/identity"
import { readWaitingCount } from "@/app/(portal)/_lib/review-reading"
import { answerWaitingCount } from "@/app/(portal)/_lib/waiting-count"

export const dynamic = "force-dynamic"

const answer = answerWaitingCount({ currentActor, roleOf, readWaitingCount })

/**
 * How many changes wait for a person in one project, for the count beside
 * *For review* on the project's rail (`docs/portal-wireframes.md`, *The
 * chrome*), guarded as `answerWaitingCount` says.
 *
 * **Why a read of its own rather than the layout's.** A layout is not drawn
 * again when a person moves between the screens it wraps, so a count the
 * layout read would still say *3* after the person had answered all three.
 * The rail asks here each time the address changes instead.
 */
export const GET = async (
  _request: Request,
  { params }: { readonly params: Promise<{ project: string }> }
): Promise<Response> => answer((await params).project)
