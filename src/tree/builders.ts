import type { IdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { primitiveTypeSchema, slotNameSchema } from "../primitive-type.js"

import type { ElementNode, LoomNode, SlotNode, TextNode } from "./node.js"

/**
 * Construction helpers for trusted, in-process callers — tests, fixtures, and
 * the SDK's scaffolding. They parse their string arguments eagerly and throw on
 * a malformed literal, because a bad primitive type here is a typo in source
 * rather than untrusted input. Data arriving from the wire or from AI goes
 * through `parseTree` / `parseDelta`, which never throw.
 */

export type ElementSpec = {
  readonly type: string
  readonly props?: JsonObject
  readonly children?: readonly LoomNode[]
}

export const buildElement = (idFactory: IdFactory, spec: ElementSpec): ElementNode => ({
  kind: "element",
  id: idFactory.nodeId(),
  type: primitiveTypeSchema.parse(spec.type),
  props: spec.props ?? {},
  children: spec.children ?? [],
})

export const buildText = (idFactory: IdFactory, value: string): TextNode => ({
  kind: "text",
  id: idFactory.nodeId(),
  value,
})

export const buildSlot = (
  idFactory: IdFactory,
  name: string,
  fallback: readonly LoomNode[] = []
): SlotNode => ({
  kind: "slot",
  id: idFactory.nodeId(),
  name: slotNameSchema.parse(name),
  children: fallback,
})
