/**
 * Reply bodies of the shape a model produces under the interpreter's output
 * schema, kept as raw strings so tests exercise the parse step rather than
 * starting from an already-decoded object. Node ids refer to `sampleTree`.
 *
 * These stand in for recorded responses: hand-written so the suite is
 * deterministic, offline, and runnable without a key.
 */

export const INSERT_NOTE_REPLY = JSON.stringify({
  outcome: "change",
  rationale: "The footer is empty, so the note goes there as its own element.",
  confidence: 0.86,
  operations: [
    {
      op: "insert",
      parentId: "n_6",
      index: 0,
      node: {
        kind: "element",
        type: "loom.note",
        props: [
          { key: "tone", value: { kind: "string", string: "quiet" } },
          { key: "dismissible", value: { kind: "boolean", boolean: false } },
        ],
        children: [{ kind: "text", value: "Thanks for visiting" }],
      },
    },
  ],
})

export const CONFIGURE_CARD_REPLY = JSON.stringify({
  outcome: "change",
  rationale: "Dropping elevation and clearing the variant makes the card quieter.",
  confidence: 0.71,
  operations: [
    {
      op: "configure",
      nodeId: "n_4",
      set: [
        { key: "elevation", value: { kind: "number", number: 0 } },
        { key: "padding", value: { kind: "json", json: '{"x":2,"y":1}' } },
      ],
      unset: ["variant"],
    },
  ],
})

export const NO_CHANGE_REPLY = JSON.stringify({
  outcome: "no-change",
  rationale: "The page already has a header containing a headline.",
})

export const NOT_UNDERSTOOD_REPLY = JSON.stringify({
  outcome: "not-understood",
  rationale: "«make it pop» does not name a node or a prop to change.",
})

/** Well-formed JSON, but not a shape the reply schema allows. */
export const OFF_SCHEMA_REPLY = JSON.stringify({
  outcome: "change",
  rationale: "Adds a note.",
  confidence: 1.4,
  operations: [{ op: "insert", parentId: "n_6", index: 0, node: { kind: "text", value: "hi" } }],
})

/** An operation that names a node id the id scheme does not permit. */
export const FOREIGN_ID_REPLY = JSON.stringify({
  outcome: "change",
  rationale: "Removes the footer.",
  confidence: 0.9,
  operations: [{ op: "remove", nodeId: "footer" }],
})

/** Passes the schema, but carries a prop the runtime cannot decode. */
export const UNDECODABLE_PROP_REPLY = JSON.stringify({
  outcome: "change",
  rationale: "Sets a padding object on the card.",
  confidence: 0.8,
  operations: [
    {
      op: "configure",
      nodeId: "n_4",
      set: [{ key: "padding", value: { kind: "json", json: "{x: 2}" } }],
      unset: [],
    },
  ],
})

/** Passes the schema, but sets one prop twice. */
export const DUPLICATE_PROP_REPLY = JSON.stringify({
  outcome: "change",
  rationale: "Sets the variant.",
  confidence: 0.8,
  operations: [
    {
      op: "configure",
      nodeId: "n_4",
      set: [
        { key: "variant", value: { kind: "string", string: "filled" } },
        { key: "variant", value: { kind: "string", string: "outlined" } },
      ],
      unset: [],
    },
  ],
})

export const TRUNCATED_REPLY = '{"outcome":"change","rationale":"Adds a not'
