import { describe, expect, it } from "vitest"

import { existingPrimitives, planCommand, type CliError, type WritePlan } from "./plan.js"

const planOf = (
  command: Parameters<typeof planCommand>[0],
  existing: readonly string[] = []
): WritePlan => {
  const planned = planCommand(command, existing)
  if (!planned.ok) throw new Error(`expected a plan, got ${planned.error.code}`)

  return planned.value
}

const errorOf = (
  command: Parameters<typeof planCommand>[0],
  existing: readonly string[] = []
): CliError => {
  const planned = planCommand(command, existing)
  if (planned.ok) throw new Error("expected the command to be refused")

  return planned.error
}

const pathsOf = (plan: WritePlan): readonly string[] => plan.files.map((file) => file.path)

const contentsOf = (plan: WritePlan, path: string): string => {
  const file = plan.files.find((candidate) => candidate.path === path)
  if (!file) throw new Error(`${path} was not planned`)

  return file.contents
}

describe("planCommand — init", () => {
  it("plans a primitive, a registry, and the conformance test", () => {
    expect(pathsOf(planOf({ kind: "init", directory: "loom" }))).toEqual([
      "loom/primitives/loom.page.ts",
      "loom/primitives/registry.ts",
      "loom/primitives/registry.test.ts",
    ])
  })

  it("honours the directory it was given", () => {
    expect(pathsOf(planOf({ kind: "init", directory: "app/ui" }))[0]).toBe(
      "app/ui/primitives/loom.page.ts"
    )
  })

  /** Re-running init over a populated directory would discard every registration. */
  it("refuses when any file it would write already exists", () => {
    for (const existing of [
      "loom/primitives/loom.page.ts",
      "loom/primitives/registry.ts",
      "loom/primitives/registry.test.ts",
    ]) {
      expect(errorOf({ kind: "init", directory: "loom" }, [existing])).toEqual({
        code: "file-exists",
        path: existing,
      })
    }
  })
})

describe("planCommand — add primitive", () => {
  const command = { kind: "add-primitive", directory: "loom", type: "commerce.product-card" } as const

  it("plans the definition and regenerates the registry", () => {
    expect(pathsOf(planOf(command))).toEqual([
      "loom/primitives/commerce.product-card.ts",
      "loom/primitives/registry.ts",
    ])
  })

  it("does not rewrite the conformance test, which init owns", () => {
    expect(pathsOf(planOf(command))).not.toContain("loom/primitives/registry.test.ts")
  })

  it("regenerates the registry from the whole directory, not just the new primitive", () => {
    const plan = planOf(command, ["loom/primitives/loom.page.ts", "loom/primitives/registry.ts"])
    const registry = contentsOf(plan, "loom/primitives/registry.ts")

    expect(registry).toContain(`import { loomPage } from "./loom.page.js"`)
    expect(registry).toContain(`import { commerceProductCard } from "./commerce.product-card.js"`)
    expect(registry).toContain("commerceProductCard,")
    expect(registry).toContain("loomPage,")
  })

  it("refuses a type that is already declared rather than overwriting its definition", () => {
    expect(errorOf(command, ["loom/primitives/commerce.product-card.ts"])).toEqual({
      code: "already-registered",
      type: "commerce.product-card",
    })
  })
})

describe("existingPrimitives", () => {
  it("recovers a dotted type exactly, which a slug could not", () => {
    expect(existingPrimitives(["loom/primitives/commerce.product-card.ts"])).toEqual([
      { type: "commerce.product-card", module: "commerce.product-card.ts", exportName: "commerceProductCard" },
    ])
  })

  it("skips the generated modules, so the registry never imports itself", () => {
    expect(
      existingPrimitives(["loom/primitives/registry.ts", "loom/primitives/registry.test.ts"])
    ).toEqual([])
  })

  it("skips anything that is not a primitive module", () => {
    expect(
      existingPrimitives([
        "loom/primitives/README.md",
        "loom/primitives/styles.css",
        "loom/primitives/Loom.Card.ts",
      ])
    ).toEqual([])
  })
})
