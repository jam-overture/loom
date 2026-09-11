import type { DataRegistry } from "../data/adapter.js"
import { resolveTreeData } from "../data/resolve.js"
import type { FrameOriginRegistry } from "../frame/origin.js"
import type { TreeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import { err, ok, type Result } from "../result.js"
import type { EndpointRegistry } from "../submit/endpoint.js"
import { resolveTreeSubmissions } from "../submit/resolve.js"
import type { ThemeRegistry } from "../theme/registry.js"
import type { TreeError } from "../tree/errors.js"
import { parseTree, type LoomTree } from "../tree/tree.js"

import type { PrimitiveResolver } from "./primitive.js"
import type { PropsValidator } from "./props.js"
import { renderLoomTree, type RenderOutput, type SlotContent } from "./render.js"
import type { TextResolver } from "./text.js"

/**
 * Resolution, once per request.
 *
 * The adaptive part of an adaptive renderer is that the tree served is a
 * function of who is asking, so the tree is loaded per request rather than
 * imported: there is no module-level cache here, and a host that wants one puts
 * it behind `TreeSource` where it can be keyed and invalidated deliberately.
 *
 * `TreeSource.load` returns `unknown`. Storage is a boundary like any other —
 * a document written by an older schema version, or by something that never
 * went through the Gate, must not reach the renderer unvalidated — so the
 * parse happens here rather than being something every host remembers to do.
 */

export type RenderRequest = {
  readonly treeId: TreeId
  /** Decoration is a property of the request, so one process can serve both. */
  readonly editMode: boolean
  /** Opaque host context — audience, locale, flags — passed through to the source. */
  readonly context?: JsonObject
}

export type TreeSourceError = {
  readonly code: "not-found" | "unavailable"
  readonly detail: string
}

export interface TreeSource {
  readonly load: (request: RenderRequest) => Promise<Result<unknown, TreeSourceError>>
}

export type RenderDependencies = {
  readonly source: TreeSource
  readonly resolver: PrimitiveResolver
  readonly validator?: PropsValidator
  /** Absent means the tree's theme is not resolved — see `RenderOptions.themes`. */
  readonly themes?: ThemeRegistry
  /**
   * Absent means the tree's bindings are not answered — see `RenderOptions.data`.
   * Supplying a registry is what bounds the sources a proposal may name, the
   * same way `themes` bounds the palettes (0058).
   */
  readonly sources?: DataRegistry
  /**
   * Absent means the tree's submissions are not answered — see
   * `RenderOptions.submissions`. Supplying a registry is what bounds the
   * destinations a proposal may name, and it is the only thing that does: an
   * address never appears in a tree, so a deployment that registers nothing has
   * no form that posts anywhere (0065).
   */
  readonly endpoints?: EndpointRegistry
  /**
   * The origins this deployment will frame — see `RenderOptions.origins`.
   * Absent means every framable prop is refused with a diagnostic (0094).
   *
   * It sits here beside the other three registries and, unlike them, adds no
   * `await`: an allowlist is a static fact, so it is passed straight through to
   * the walk rather than resolved first.
   */
  readonly origins?: FrameOriginRegistry
  /**
   * Absent means primitives render the strings their authors declared — see
   * `RenderOptions.text`. A host serving one language in the library's own
   * language wires nothing here; a host serving another builds a resolver per
   * dictionary and picks by whatever it reads the request's language from, which
   * is its own business and not the framework's.
   */
  readonly text?: TextResolver
  readonly slots?: SlotContent
  /**
   * References or values — see `RenderOptions.themeValues`. It belongs to the
   * request rather than to the deployment: one route serves a page to a browser
   * and the next draws the same tree into an image, off the same dependencies.
   */
  readonly themeValues?: "variables" | "literals"
}

export type RenderRequestError =
  | { readonly code: "source-failed"; readonly error: TreeSourceError }
  | { readonly code: "invalid-tree"; readonly error: TreeError }
  | { readonly code: "tree-id-mismatch"; readonly requested: TreeId; readonly received: TreeId }

/**
 * The rendered result carries the tree it came from: the caller needs
 * `revision` to set a cache validator, and needs the parsed tree to be the same
 * object the element was built from rather than one it loads again.
 */
export type RenderedRequest = RenderOutput & {
  readonly tree: LoomTree
}

export const renderRequest = async (
  request: RenderRequest,
  dependencies: RenderDependencies
): Promise<Result<RenderedRequest, RenderRequestError>> => {
  const loaded = await dependencies.source.load(request)
  if (!loaded.ok) return err({ code: "source-failed", error: loaded.error })

  const parsed = parseTree(loaded.value)
  if (!parsed.ok) return err({ code: "invalid-tree", error: parsed.error })

  const tree = parsed.value

  /**
   * A source that answers with a different document than the one asked for is a
   * cache-key or routing fault, and serving it would render one tenant's page
   * under another's request. Cheap to check, so it is checked.
   */
  if (tree.treeId !== request.treeId) {
    return err({ code: "tree-id-mismatch", requested: request.treeId, received: tree.treeId })
  }

  /**
   * The only await between loading the tree and rendering it, and the reason
   * this function is async at all. Both seams happen after the parse, because a
   * plan is read off a tree that has been proved to be one, and before the walk,
   * because the walk cannot wait for anything (0058, 0065).
   *
   * They run together rather than in turn. Neither knows about the other, and a
   * page with a form and an integration should not pay for both in series.
   */
  const [data, submissions] = await Promise.all([
    dependencies.sources
      ? resolveTreeData(tree, {
          registry: dependencies.sources,
          ...(request.context ? { context: request.context } : {}),
        })
      : undefined,
    dependencies.endpoints
      ? resolveTreeSubmissions(tree, {
          registry: dependencies.endpoints,
          ...(request.context ? { context: request.context } : {}),
        })
      : undefined,
  ])

  const rendered = renderLoomTree(tree, {
    resolver: dependencies.resolver,
    editMode: request.editMode,
    ...(dependencies.validator ? { validator: dependencies.validator } : {}),
    ...(dependencies.themes ? { themes: dependencies.themes } : {}),
    ...(data ? { data } : {}),
    ...(submissions ? { submissions } : {}),
    ...(dependencies.origins ? { origins: dependencies.origins } : {}),
    ...(dependencies.text ? { text: dependencies.text } : {}),
    ...(dependencies.slots ? { slots: dependencies.slots } : {}),
    ...(dependencies.themeValues ? { themeValues: dependencies.themeValues } : {}),
  })

  return ok({ ...rendered, tree })
}
