import type { CataloguedPrimitive } from "@loom/runtime"

/**
 * `props: undefined` is a distinct claim from "no props" — it means the declared
 * schema is not an object schema, so its keys cannot be enumerated. Rendering
 * both as an empty list would flatten "none" and "unknown" into the same thing.
 */
export const PrimitiveCard = ({ primitive }: { readonly primitive: CataloguedPrimitive }) => (
  <div className="border-edge-subtle bg-surface-base rounded-md border p-4">
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-sm">{primitive.type}</span>
      {primitive.slots.length > 0 && (
        <span className="text-ink-muted font-mono text-2xs">
          slots: {primitive.slots.join(", ")}
        </span>
      )}
    </div>

    <p className="text-ink-secondary mt-1 text-sm">{primitive.description}</p>

    {primitive.props === undefined ? (
      <p className="text-ink-muted mt-2 text-xs">Props cannot be enumerated from this schema.</p>
    ) : primitive.props.length === 0 ? (
      <p className="text-ink-muted mt-2 text-xs">No props.</p>
    ) : (
      <ul className="mt-2 flex flex-wrap gap-1">
        {primitive.props.map((prop) => (
          <li
            key={prop.name}
            className="border-edge-subtle rounded-sm border px-1.5 py-0.5 font-mono text-2xs"
          >
            {prop.name}
            {prop.required ? "" : "?"}
          </li>
        ))}
      </ul>
    )}
  </div>
)
