import type { ReactNode } from "react"

import type { TreeId } from "@loom/runtime"
import { describeRenderDiagnostic, type RenderDiagnostic } from "@loom/runtime/react"

import { RevisionLink } from "@/app/(portal)/_components/revision-link"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { PageName } from "@/app/(portal)/_lib/page-name"

/**
 * The chrome around a rendered tree: whose page it is, how much has happened to
 * it, and anything the renderer could not honour.
 *
 * It used to open with an `h1` reading `preview`, which named the pane rather
 * than the thing in it. A person who has opened one of their own pages knows
 * they are looking at a preview; what they do not know is what they can do with
 * it. So the page's own name leads, and the sentence under it says the one
 * thing that makes this screen different from a screenshot: **the page is
 * clickable, and clicking it is how you point at what you want changed.**
 *
 * That heading then read `t_seed1` for a fortnight — the portal's most-read
 * heading, and a machine identifier. It is the page's own name now, derived from
 * the heading the page itself leads with (`_lib/page-name.ts`), and **the id has
 * not moved behind anything**: it sits directly under the name, in monospace and
 * quieter. The 22 August layout defect settled that identity is not technical
 * detail — a reviewer who cannot see which tree they are on cannot act — and the
 * fix for a screen that showed only the id is not a screen that shows only the
 * name.
 *
 * Diagnostics are shown rather than logged because 0008 made the renderer total —
 * it degrades instead of throwing — which only helps if the degradation is
 * visible to the person who can fix it. What that person could not do before is
 * tell whether it mattered: `describeRenderDiagnostic`'s output arrived as a
 * monospace list with no sentence around it, so an unregistered primitive and a
 * prop that failed its schema both read as a wall of amber. The count and the
 * consequence now lead, and every original sentence is one click down, unedited.
 */
export const PreviewFrame = ({
  page,
  treeId,
  revision,
  diagnostics,
  views,
  children,
}: {
  /** What this page is called, and the id it is called by. Both are shown. */
  readonly page: PageName
  /**
   * The same id, branded, because the revision link is built from it.
   *
   * `PageName` carries the id as a plain `string`: it is a value on its way to a
   * screen. A URL builder takes a `TreeId` because a link is a read, and the
   * brand is what stops one being built from a string nobody parsed. So the
   * frame takes the printable half and the readable half separately rather than
   * casting one into the other.
   */
  readonly treeId: TreeId
  readonly revision: number
  readonly diagnostics: readonly RenderDiagnostic[]
  /**
   * The strip of everything else the portal can tell you about this page.
   *
   * Passed in rather than rendered here, because this component's whole job is
   * the chrome around one rendered tree and where the reader can go next is not
   * its decision. It arrives as a slot so that it lands where it has to — after
   * the reader knows which page they are on, before the page itself — which is
   * the one thing about it this component does get to decide.
   */
  readonly views?: ReactNode
  readonly children: ReactNode
}) => (
  <div className="flex flex-col gap-4">
    <header className="flex flex-col gap-1">
      <h1 className="truncate text-2xl tracking-tight" title={page.name}>
        {page.name}
      </h1>
      {/*
        * The id, immediately under the name and never instead of it. It is the
        * string a reader types into a URL, quotes in a support thread, or looks
        * for in a log, so it stays on the surface rather than inside the
        * disclosure below.
        */}
      <p className="text-ink-muted truncate font-mono text-xs">{page.treeId}</p>
      <p className="text-ink-muted text-sm">
        This is your page as people are being served it right now. Click anything on it to point
        at that part, then ask for a change below.
      </p>
      {/*
        * The plain sentence leads and the revision follows it as a handle, not
        * the other way round. At `revision 0` the old order read `revision 0 —
        * 0 changes have been applied`, which opens the screen with a number
        * twice and a runtime word first — and a page nothing has happened to
        * yet is exactly the page a new person opens first.
        */}
      <p className="text-ink-muted text-xs">
        {revision === 0
          ? "Nothing has been changed here yet."
          : `${revision} ${revision === 1 ? "change has" : "changes have"} been applied to this page.`}
        {" · "}
        <RevisionLink treeId={treeId} revision={revision} />
      </p>
    </header>

    {views}

    {diagnostics.length > 0 && (
      <div className="flex flex-col gap-2">
        <div className="bg-awaiting text-awaiting-ink flex flex-col gap-1 rounded-md p-3 text-xs">
          <strong className="font-medium">
            {diagnostics.length === 1
              ? "One part of this page didn't draw."
              : `${diagnostics.length} parts of this page didn't draw.`}
          </strong>
          <p>
            The rest of the page is fine — Loom leaves out what it can&rsquo;t draw rather than
            failing the whole page. Usually it means a piece the page asks for isn&rsquo;t set up
            in this deployment.
          </p>
        </div>

        <TechnicalDetail summary="What the renderer said">
          <ul className="flex flex-col gap-1">
            {diagnostics.map((diagnostic, index) => (
              <li key={index} className="font-mono">
                {describeRenderDiagnostic(diagnostic)}
              </li>
            ))}
          </ul>
        </TechnicalDetail>
      </div>
    )}

    <div className="bg-surface-preview border-edge-subtle rounded-md border p-6">{children}</div>
  </div>
)
