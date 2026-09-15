import { describeRenderDiagnostic, renderLoomTree } from "@loom/runtime/react"
import { resolveTreeSubmissions } from "@loom/runtime"

import { produceActions } from "@/app/(docs)/_lib/submit/actions"
import {
  connectedContactTree,
  produceFormNotices,
  produceResolvedTarget,
  produceSharedPlan,
  produceTrouble,
  produceWhatAModelSees,
} from "@/app/(docs)/_lib/submit/answers"
import { docsEndpoints } from "@/app/(docs)/_lib/submit/endpoints"
import { produceFormVerdicts, produceRefusedDeclaration } from "@/app/(docs)/_lib/submit/proposals"
import { docsRegistry, docsThemes } from "@/app/(docs)/_lib/loom/registry"

/**
 * The produced blocks on *What a form posts to*.
 *
 * Every one of them is a real run of the submission seam as the page is built:
 * real endpoints registered through `defineEndpoint`, a real tree planned, a
 * real resolution, and — in the first block — a real render of the result.
 * Nothing here describes what the runtime would do.
 *
 * Furniture in 0067's sense, like every other generated table on this site. The
 * one block that is not a table is `TheConnectedForm`, and it is furniture too:
 * what it presents is the *output* of a resolution, framed so a reader can see
 * that the same tree renders differently once a deployment has answered. The
 * page's changeable example is the catalogue entry above it.
 */

const Panel = ({
  caption,
  children,
}: {
  readonly caption: string
  readonly children: React.ReactNode
}) => (
  <div className="not-prose border-edge my-6 overflow-hidden rounded-lg border">
    <p className="border-edge bg-surface-sunken text-ink-muted m-0 border-b px-3 py-2 text-xs">
      {caption}
    </p>
    {children}
  </div>
)

const Head = ({ columns }: { readonly columns: readonly string[] }) => (
  <thead>
    <tr className="bg-surface-sunken text-ink">
      {columns.map((column) => (
        <th key={column} className="border-edge border-b px-3 py-2 text-left font-semibold">
          {column}
        </th>
      ))}
    </tr>
  </thead>
)

const Cell = ({ children }: { readonly children: React.ReactNode }) => (
  <td className="text-ink-muted px-3 py-2 align-top text-xs">{children}</td>
)

const Table = ({
  columns,
  children,
}: {
  readonly columns: readonly string[]
  readonly children: React.ReactNode
}) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-sm">
      <Head columns={columns} />
      <tbody>{children}</tbody>
    </table>
  </div>
)

const Row = ({ children }: { readonly children: React.ReactNode }) => (
  <tr className="border-edge border-b last:border-b-0">{children}</tr>
)

/**
 * The same form again, on a deployment that registered an endpoint for it.
 *
 * This is the claim the page is built around, so it is made by running it: the
 * tree is the one the example above is built from with `loom:submit` on its
 * form, the endpoint is asked for real, and `renderLoomTree` is given the
 * resolution. The fieldset is not disabled, there is no notice above it, and
 * the `action`, `method` and hidden input under the frame are the ones the
 * endpoint answered with — printed beside the render rather than asserted about
 * it.
 *
 * A diagnostic would be the most interesting thing on the page if one appeared,
 * so it is shown rather than swallowed.
 */
export const TheConnectedForm = async () => {
  const tree = connectedContactTree()
  const submissions = await resolveTreeSubmissions(tree, { registry: docsEndpoints() })
  const target = await produceResolvedTarget()

  const rendered = renderLoomTree(tree, {
    resolver: docsRegistry,
    validator: docsRegistry,
    themes: docsThemes,
    submissions,
  })

  return (
    <Panel caption={`The same tree, served by a deployment that registered ${target.declared}`}>
      <div className="border-edge bg-surface-page max-h-[32rem] overflow-auto border-b px-2 py-4 sm:px-4">
        {rendered.element}
      </div>

      {rendered.diagnostics.length > 0 && (
        <ul className="border-edge bg-warning-surface text-warning-ink border-b px-3 py-2 text-xs">
          {rendered.diagnostics.map((diagnostic, index) => (
            <li key={index}>{describeRenderDiagnostic(diagnostic)}</li>
          ))}
        </ul>
      )}

      <Table columns={["What the tree says", "What the deployment answered"]}>
        <Row>
          <Cell>
            <span className="font-mono">{`"loom:submit": ${target.declared}`}</span>
            <br />
            <span className="text-ink-faint">{target.description}</span>
          </Cell>
          <td className="text-ink-muted px-3 py-2 align-top text-xs" data-action={target.action}>
            <span className="font-mono">
              {target.method} {target.action}
            </span>
            {target.fields.map((field) => (
              <span key={field.name} className="text-ink-faint block font-mono">
                hidden: {field.name}={field.value}
              </span>
            ))}
          </td>
        </Row>
      </Table>
    </Panel>
  )
}

/** Every named way a form ends up with no target, each one reached. */
export const WhenThereIsNoTarget = async () => {
  const trouble = await produceTrouble()

  return (
    <Panel
      caption={`${trouble.length} ways a form ends up with nowhere to post, and the sentence each one writes`}
    >
      <Table columns={["What happened", "Reason", "What the diagnostics say"]}>
        {trouble.map((row) => (
          <Row key={row.reason + row.to}>
            <Cell>
              <span className="text-ink">{row.what}</span>
              <br />
              <span className="font-mono">{row.to}</span>
            </Cell>
            <td className="text-ink-muted px-3 py-2 align-top text-xs" data-reason={row.reason}>
              <span className="bg-surface-sunken text-ink rounded-full px-2 py-0.5 font-mono">
                {row.reason}
              </span>
            </td>
            <Cell>{row.sentence}</Cell>
          </Row>
        ))}
      </Table>
    </Panel>
  )
}

/** The three sentences a visitor may be shown, in the primitive's own words. */
export const WhatTheVisitorReads = () => {
  const notices = produceFormNotices()

  return (
    <Panel
      caption={`${notices.length} sentences loom.form declares, and none of them is a reason code`}
    >
      <Table columns={["When", "What the page says"]}>
        {notices.map((notice) => (
          <Row key={notice.key}>
            <Cell>
              <span className="font-mono">{notice.key}</span>
            </Cell>
            <Cell>
              <span className="text-ink">{notice.sentence}</span>
            </Cell>
          </Row>
        ))}
      </Table>
    </Panel>
  )
}

/** What the seam will carry as an address, and what it refuses after the host said yes. */
export const WhatAnActionMayBe = async () => {
  const actions = await produceActions()
  const carried = actions.filter((action) => action.accepted)

  return (
    <Panel
      caption={`${actions.length} strings a deployment might answer with — ${carried.length} of them reach the form`}
    >
      <Table columns={["The endpoint answered", "Which is", "What the seam did"]}>
        {actions.map((action) => (
          <Row key={action.action}>
            <Cell>
              <span className="font-mono break-all">{action.action === "" ? " " : action.action}</span>
            </Cell>
            <Cell>{action.what}</Cell>
            <td
              className="text-ink-muted px-3 py-2 align-top text-xs"
              data-accepted={String(action.accepted)}
            >
              <span
                className={
                  action.accepted
                    ? "bg-surface-sunken text-ink rounded-full px-2 py-0.5 font-mono"
                    : "bg-warning-surface text-warning-ink rounded-full px-2 py-0.5 font-mono"
                }
              >
                {action.accepted ? "carried" : "refused"}
              </span>
              <br />
              {action.outcome}
            </td>
          </Row>
        ))}
      </Table>
    </Panel>
  )
}

/** Two configures on one node, judged by the policy a deployment gets for free. */
export const WhoMayMoveAForm = async () => {
  const verdicts = await produceFormVerdicts()

  return (
    <Panel caption="Two changes to the same form, under the policy a deployment has before it configures anything">
      <Table columns={["The ask", "What it comes to", "What the Gate said"]}>
        {verdicts.map((verdict) => (
          <Row key={verdict.ask}>
            <Cell>
              <span className="text-ink">“{verdict.ask}”</span>
            </Cell>
            <Cell>
              <span className="font-mono">configure</span>
              <br />
              <span className="font-mono">{verdict.operation}</span>
            </Cell>
            <td className="text-ink-muted px-3 py-2 align-top text-xs" data-kind={verdict.kind}>
              <span className="bg-surface-sunken text-ink rounded-full px-2 py-0.5 font-mono">
                {verdict.kind}
              </span>
              <br />
              <span className="font-mono">
                {verdict.stakes} · {verdict.reasonCode}
              </span>
              <br />
              {verdict.detail}
            </td>
          </Row>
        ))}
      </Table>
    </Panel>
  )
}

/** Everything a model is told about where a form may post. */
export const WhatAModelMayName = () => {
  const seen = produceWhatAModelSees()
  const shared = produceSharedPlan()

  return (
    <Panel
      caption={`${seen.destinations.length} destinations, an id and a line each — and ${seen.posting.length} of the library's ${seen.primitives} primitives can post at all`}
    >
      <Table columns={["Id", "What it receives"]}>
        {seen.destinations.map((destination) => (
          <Row key={destination.id}>
            <Cell>
              <span className="font-mono">{destination.id}</span>
            </Cell>
            <Cell>{destination.description}</Cell>
          </Row>
        ))}
      </Table>
      <p className="border-edge text-ink-muted m-0 border-t px-3 py-2 text-xs">
        A page carrying {shared.declaring} forms that both name{" "}
        <span className="font-mono">{shared.endpoints.join(", ")}</span> is {shared.asked} question,
        asked once, and one target shared between them.
      </p>
    </Panel>
  )
}

/** The declaration that tried to carry an address, refused at the plan. */
export const AnAddressInTheTree = () => {
  const refused = produceRefusedDeclaration()

  return (
    <Panel caption="A declaration with an address written beside the name, read by the planner">
      <Table columns={["What was written into the tree", "What the planner did with it"]}>
        <Row>
          <Cell>
            <span className="font-mono break-all">{refused.declared}</span>
          </Cell>
          <td className="text-ink-muted px-3 py-2 align-top text-xs" data-planned={refused.planned}>
            {refused.sentence}
            <br />
            <span className="text-ink-faint">
              {refused.planned} endpoints planned, so the form has no target and renders disabled.
            </span>
          </td>
        </Row>
      </Table>
    </Panel>
  )
}
