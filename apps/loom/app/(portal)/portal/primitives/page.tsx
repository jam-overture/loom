import { catalogueOf } from "@loom/runtime/sdk"

import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { portalRegistry } from "@/app/(portal)/_lib/registry"

import { PrimitiveCard } from "./_components/primitive-card"

/**
 * What a model may build here, as data (0013).
 *
 * This is the same projection the interpreter is given, read from the same
 * registry — not a hand-maintained list beside it. A primitive that appears here
 * and not in a proposal's options, or the reverse, would mean the catalogue had
 * stopped describing the registry.
 */
const PrimitivesPage = async () => {
  await requireActor("/portal/primitives")

  const catalogue = catalogueOf(portalRegistry)

  return (
    <div className="flex max-w-3xl flex-col gap-4 p-8">
      <div>
        {/*
         * The heading was `primitives`, lower-case, naming its own route — and
         * the sweep in `plain-language.test.ts` refuses both the case and the
         * word. This is the smallest edit that satisfies it, and it is
         * deliberately the same sentence the open rename of this screen leads
         * with, so that when that lands and deletes this file the two do not
         * have to be reconciled. Everything else here is left alone.
         */}
        <h1 className="text-2xl tracking-tight">What Loom can put on your page</h1>
        <p className="text-ink-muted mt-1 text-sm">
          {catalogue.length} registered. This is exactly what a model is told it may build.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {catalogue.map((primitive) => (
          <li key={primitive.type}>
            <PrimitiveCard primitive={primitive} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default PrimitivesPage
