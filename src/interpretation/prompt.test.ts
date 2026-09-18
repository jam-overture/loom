import { describe, expect, it } from "vitest"

import type { PrimitiveCatalogue } from "../catalogue.js"
import { deltaIdSchema, nodeIdSchema, sequentialIdFactory, type NodeId } from "../ids.js"
import { createStarterPrimitiveRegistry, STARTER_PRIMITIVES } from "../primitives/index.js"
import { catalogueOf } from "../sdk/catalogue.js"
import { createPrimitiveRegistry } from "../sdk/registry.js"
import { selectPrimitives } from "../sdk/selection.js"
import { THEME_PROP_KEY } from "../render/theme.js"
import { createThemeRegistry } from "../theme/registry.js"
import type { RepairRequest } from "../runtime/interpreter.js"
import { testRegistry } from "../testing/definitions.js"
import { buildIntent, buildProposal } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import { buildElement, buildText } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"

import {
  buildRepairMessage,
  buildUserMessage,
  hashPrompt,
  measureCatalogue,
  measurePrompt,
  measureRepairPrompt,
  INTERPRETER_SYSTEM_PROMPT,
} from "./prompt.js"

const intentFor = (utterance: string, scopeNodeId?: NodeId) => {
  const { tree } = sampleTree()
  const base = buildIntent(sequentialIdFactory("i"), {
    treeId: tree.treeId,
    baseRevision: tree.revision,
    utterance,
  })

  return scopeNodeId ? { ...base, scopeNodeId } : base
}

describe("buildUserMessage", () => {
  it("carries the outline, the origin, and the utterance", () => {
    const { tree } = sampleTree()
    const message = buildUserMessage(intentFor("add a footer note"), tree)

    expect(message).toContain("n_7 element loom.page")
    expect(message).toContain("Request (user-instruction): add a footer note")
  })

  it("names the scope only when the intent has one", () => {
    const { tree, ids } = sampleTree()

    expect(buildUserMessage(intentFor("make this quieter", ids.card), tree)).toContain(
      `Confine the change to the subtree rooted at ${ids.card}`
    )
    expect(buildUserMessage(intentFor("make this quieter"), tree)).not.toContain("Confine the change")
  })
})

describe("the catalogue block", () => {
  const catalogue = catalogueOf(testRegistry())

  it("is absent when the host wired no catalogue", () => {
    const message = buildUserMessage(intentFor("add a footer note"), sampleTree().tree)

    expect(message).not.toContain("registered")
    expect(message.startsWith("Current tree:")).toBe(true)
  })

  it("leads the message, ahead of the tree and the request", () => {
    const message = buildUserMessage(intentFor("add a footer note"), sampleTree().tree, catalogue)

    expect(message.indexOf("Primitives this deployment has registered")).toBeLessThan(
      message.indexOf("Current tree:")
    )
    expect(message).toContain("- loom.card — A bounded block of related content. props: elevation?, variant")
  })

  it("tells the model that a type outside the list will not render", () => {
    const message = buildUserMessage(intentFor("add a buy button"), sampleTree().tree, catalogue)

    expect(message).toContain("Insert only primitives from that list")
  })

  /** An empty registry is not a list of nothing; it is nothing to say. */
  it("is absent for an empty catalogue rather than an empty heading", () => {
    const message = buildUserMessage(intentFor("add a footer note"), sampleTree().tree, [])

    expect(message.startsWith("Current tree:")).toBe(true)
  })

  it("reaches a repair, so a revision is bound by the same list", () => {
    const { tree } = sampleTree()
    const intent = intentFor("delete the card")

    const request: RepairRequest = {
      intent,
      refused: buildProposal(sequentialIdFactory("r"), {
        intentId: intent.intentId,
        delta: {
          deltaId: deltaIdSchema.parse("d_r1"),
          treeId: tree.treeId,
          baseRevision: tree.revision,
          operations: [{ op: "remove", nodeId: nodeIdSchema.parse("n_4") }],
        },
      }),
      disposition: {
        kind: "rejected",
        reason: { code: "stakes-at-refusal-floor", detail: "destroys a protected primitive" },
        stakes: "critical",
        reversible: true,
        confidence: 0.9,
        policyId: "default",
      },
    }

    expect(buildRepairMessage(request, tree, catalogue)).toContain("Primitives this deployment has registered")
  })
})

describe("the theme block", () => {
  const themes = createThemeRegistry().catalogue()
  const catalogue = catalogueOf(testRegistry())

  it("is absent when the host wired no theme registry", () => {
    const message = buildUserMessage(intentFor("make it warmer"), sampleTree().tree, catalogue)

    expect(message).not.toContain("Themes this deployment has registered")
  })

  it("lists every registered id with the sentence its author wrote", () => {
    const message = buildUserMessage(intentFor("make it warmer"), sampleTree().tree, catalogue, themes)

    for (const palette of themes.palettes) expect(message).toContain(`- ${palette.id} — ${palette.name}.`)
    for (const pack of themes.fontPacks) expect(message).toContain(`- ${pack.id} —`)
    for (const preset of themes.stylePresets) expect(message).toContain(`- ${preset.id} —`)
  })

  /**
   * The vocabulary without the instruction is decoration: every other rule in
   * the prompt tells the model to set only props a primitive declares, and the
   * theme is the one key no primitive declares.
   */
  it("says where a theme lives and that all three ids travel together", () => {
    const message = buildUserMessage(intentFor("make it warmer"), sampleTree().tree, catalogue, themes)

    expect(message).toContain(THEME_PROP_KEY)
    expect(message).toContain("Give all three every time")
    expect(message).toContain("never set a colour on a primitive")
  })

  it("shows the palette hex to nobody", () => {
    const message = buildUserMessage(intentFor("make it warmer"), sampleTree().tree, catalogue, themes)

    expect(message).not.toMatch(/#[0-9a-fA-F]{6}\b/)
  })

  it("sits between the primitives and the tree, where a cache can hold it", () => {
    const message = buildUserMessage(intentFor("make it warmer"), sampleTree().tree, catalogue, themes)

    expect(message.indexOf("Primitives this deployment has registered")).toBeLessThan(
      message.indexOf("Themes this deployment has registered")
    )
    expect(message.indexOf("Themes this deployment has registered")).toBeLessThan(
      message.indexOf("Current tree:")
    )
  })

  it("reaches a repair, so a revision may still re-theme", () => {
    const { tree } = sampleTree()
    const intent = intentFor("make it warmer")

    const request: RepairRequest = {
      intent,
      refused: buildProposal(sequentialIdFactory("r"), {
        intentId: intent.intentId,
        delta: {
          deltaId: deltaIdSchema.parse("d_r2"),
          treeId: tree.treeId,
          baseRevision: tree.revision,
          operations: [{ op: "remove", nodeId: nodeIdSchema.parse("n_4") }],
        },
      }),
      disposition: {
        kind: "rejected",
        reason: { code: "stakes-at-refusal-floor", detail: "destroys a protected primitive" },
        stakes: "critical",
        reversible: true,
        confidence: 0.9,
        policyId: "default",
      },
    }

    expect(buildRepairMessage(request, tree, catalogue, themes)).toContain(
      "Themes this deployment has registered"
    )
  })
})

describe("INTERPRETER_SYSTEM_PROMPT", () => {
  it("states the two identity rules the runtime depends on", () => {
    expect(INTERPRETER_SYSTEM_PROMPT).toContain("Never invent an id")
    expect(INTERPRETER_SYSTEM_PROMPT).toContain("Never give an id to a node you are inserting")
  })
})

describe("hashPrompt", () => {
  it("is stable for the same prompt", async () => {
    const first = await hashPrompt("system", "user")
    const second = await hashPrompt("system", "user")

    expect(first).toBe(second)
    expect(first).toMatch(/^[0-9a-f]{64}$/)
  })

  it("separates the two halves so a shifted boundary changes the hash", async () => {
    expect(await hashPrompt("ab", "c")).not.toBe(await hashPrompt("a", "bc"))
  })

  it("carries no prompt text", async () => {
    expect(await hashPrompt(INTERPRETER_SYSTEM_PROMPT, "delete everything")).not.toContain("delete")
  })
})

describe("buildRepairMessage", () => {
  const requestFor = () => {
    const { tree, ids } = sampleTree()
    const idFactory = sequentialIdFactory("p")
    const intent = buildIntent(idFactory, {
      treeId: tree.treeId,
      baseRevision: tree.revision,
      utterance: "delete the card",
    })

    const refused = buildProposal(idFactory, {
      intentId: intent.intentId,
      delta: {
        deltaId: idFactory.deltaId(),
        treeId: tree.treeId,
        baseRevision: tree.revision,
        operations: [{ op: "remove", nodeId: ids.card }],
      },
      rationale: "the card is what was named",
    })

    const request: RepairRequest = {
      intent,
      refused,
      disposition: {
        kind: "rejected",
        reason: { code: "stakes-at-refusal-floor", detail: "destroys a protected primitive" },
        stakes: "critical",
        reversible: true,
        confidence: 0.9,
        policyId: "default",
      },
    }

    return { request, tree }
  }

  it("restates the request, the refused delta, and the reason", () => {
    const { request, tree } = requestFor()
    const message = buildRepairMessage(request, tree)

    expect(message).toContain("Request (user-instruction): delete the card")
    expect(message).toContain("1. remove n_4 and its subtree")
    expect(message).toContain("stakes-at-refusal-floor: destroys a protected primitive")
    expect(message).toContain("the card is what was named")
  })

  it("still shows the tree, so a repair is proposed against what exists now", () => {
    const { request, tree } = requestFor()

    expect(buildRepairMessage(request, tree)).toContain("n_7 element loom.page")
  })

  it("offers not-understood as an answer rather than demanding a weaker change", () => {
    const { request, tree } = requestFor()

    expect(buildRepairMessage(request, tree)).toContain("not-understood")
  })
})

describe("measureRepairPrompt", () => {
  const starterCatalogue = () => {
    const registry = createStarterPrimitiveRegistry()
    if (!registry.ok) throw new Error("the starter registry did not build")

    return catalogueOf(registry.value)
  }

  const refusalOf = (tree: ReturnType<typeof sampleTree>["tree"], nodeId: NodeId, scoped: boolean) => {
    const idFactory = sequentialIdFactory("p")
    const base = buildIntent(idFactory, {
      treeId: tree.treeId,
      baseRevision: tree.revision,
      utterance: "delete the card",
    })
    const intent = scoped ? { ...base, scopeNodeId: nodeId } : base

    const request: RepairRequest = {
      intent,
      refused: buildProposal(idFactory, {
        intentId: intent.intentId,
        delta: {
          deltaId: idFactory.deltaId(),
          treeId: tree.treeId,
          baseRevision: tree.revision,
          operations: [{ op: "remove", nodeId }],
        },
        rationale: "the card is what was named",
      }),
      disposition: {
        kind: "rejected",
        reason: { code: "stakes-at-refusal-floor", detail: "destroys a protected primitive" },
        stakes: "critical",
        reversible: true,
        confidence: 0.9,
        policyId: "default",
      },
    }

    return request
  }

  /**
   * Both paths, because the measurement takes the restated proposal from
   * `measurePrompt` while the message takes it from the parts, and a scope is
   * the one thing that makes those two disagree. Held unscoped only, this
   * passes for a repair that silently drops the scope and sends the whole page.
   */
  it.each([
    ["a whole-tree", false],
    ["a scoped", true],
  ])("adds up to what %s repair actually sends", (_label, scoped) => {
    const { tree, ids } = sampleTree()
    const request = refusalOf(tree, ids.card, scoped)
    const themes = createThemeRegistry().catalogue()
    const catalogue = starterCatalogue()

    const measured = measureRepairPrompt(request, tree, catalogue, themes)
    const sent =
      INTERPRETER_SYSTEM_PROMPT.length + buildRepairMessage(request, tree, catalogue, themes).length

    expect(measured.total).toBe(sent)
    expect(
      measured.proposal.total + measured.refused + measured.objection + measured.instruction
    ).toBe(measured.total)
  })

  /**
   * The finding this was built for, stated as arithmetic: a repair is the first
   * request again, not a reference to it. If `proposal` ever stops matching what
   * the first ask measured, something started deduplicating and 0108 is stale.
   */
  it("restates the refused request whole, and says so in the same numbers", () => {
    const { tree, ids } = sampleTree()
    const request = refusalOf(tree, ids.card, false)
    const catalogue = starterCatalogue()

    const measured = measureRepairPrompt(request, tree, catalogue)

    expect(measured.proposal).toEqual(measurePrompt(request.intent, tree, catalogue))
    expect(measured.episode).toBe(measured.proposal.total + measured.total)
  })

  /**
   * What the doubling costs, and where it does not apply.
   *
   * An unscoped repair on a big page pays for the whole tree twice, so the
   * episode approaches twice the proposal as the tree grows — the three blocks a
   * repair adds are a fixed few hundred characters and stop mattering. A scoped
   * one pays for the scope twice, which is 0083's whole point surviving the
   * repair path: scoping bounds the second request as well as the first.
   */
  it("pays for the page twice unscoped, and for the scope twice when scoped", () => {
    const pageOf = (sections: number) => {
      const idFactory = sequentialIdFactory()
      const children = Array.from({ length: sections }, (_, index) =>
        buildElement(idFactory, {
          type: "loom.section",
          props: { title: `Section ${index}` },
          children: [buildText(idFactory, `Body copy for section number ${index}.`)],
        })
      )
      const root = buildElement(idFactory, { type: "loom.page", children })
      const target = children[0]
      if (target === undefined) throw new Error("a page needs at least one section")

      return { tree: createTree(root, idFactory), targetId: target.id }
    }

    const measure = (page: ReturnType<typeof pageOf>, scoped: boolean) =>
      measureRepairPrompt(
        refusalOf(page.tree, page.targetId, scoped),
        page.tree,
        starterCatalogue(),
        createThemeRegistry().catalogue()
      )

    const small = pageOf(5)
    const large = pageOf(500)

    const unscoped = measure(large, false)
    expect(unscoped.episode / unscoped.proposal.total).toBeGreaterThan(1.9)

    expect(
      measure(large, true).episode - measure(small, true).episode,
      "a scoped repair has started growing with the page, so 0083's lever no longer covers the second request"
    ).toBeLessThan(40)
  })

  /**
   * The part a repair adds is small and fixed, which is why the ratio above is
   * about the restatement rather than about the objection. A Gate detail is one
   * sentence by construction; if this ever fires, something started putting a
   * page-sized value into a reason.
   */
  it("keeps what a repair adds independent of the page it sits on", () => {
    const { tree, ids } = sampleTree()
    const measured = measureRepairPrompt(refusalOf(tree, ids.card, false), tree)

    expect(measured.refused + measured.objection + measured.instruction).toBeLessThan(1_000)
  })
})

describe("INTERPRETER_SYSTEM_PROMPT on repair", () => {
  it("forbids slicing a refused change into a smaller piece of the same thing", () => {
    expect(INTERPRETER_SYSTEM_PROMPT).toContain("one revision")
    expect(INTERPRETER_SYSTEM_PROMPT).toContain("must not be the same change split into a smaller piece")
  })
})

describe("measurePrompt", () => {
  const starterCatalogue = () => {
    const registry = createStarterPrimitiveRegistry()
    if (!registry.ok) throw new Error("the starter registry did not build")

    return catalogueOf(registry.value)
  }

  it("adds up to what is actually sent", () => {
    const { tree } = sampleTree()
    const intent = intentFor("make the body quieter")
    const themes = createThemeRegistry().catalogue()
    const catalogue = starterCatalogue()

    const measured = measurePrompt(intent, tree, catalogue, themes)
    const sent =
      INTERPRETER_SYSTEM_PROMPT.length + buildUserMessage(intent, tree, catalogue, themes).length

    expect(measured.total).toBe(sent)
    expect(
      measured.system + measured.primitives + measured.themes + measured.tree + measured.request
    ).toBe(measured.total)
  })

  it("charges nothing for a vocabulary the host did not register", () => {
    const { tree } = sampleTree()
    const measured = measurePrompt(intentFor("make the body quieter"), tree)

    expect(measured.primitives).toBe(0)
    expect(measured.themes).toBe(0)
    expect(measured.system).toBeGreaterThan(0)
    expect(measured.tree).toBeGreaterThan(0)
  })

  /**
   * A ceiling rather than an assertion of today's number, because the starter
   * library is meant to grow and a test that fails on every addition is a test
   * people learn to update without reading.
   *
   * 8000 is roughly 30% above what the 51 starter entries cost when this was
   * measured — another eighteen entries or so before it fires. The fixed prose in
   * the block is already minimal (about 800 characters, most of it the
   * instruction that makes the vocabulary usable at all), so when this does fire
   * the answer is either that the starter library has grown past what one
   * deployment should register all of, or that 0077's cut order — presets and
   * packs before palettes — applies. Raising the ceiling is the third answer and
   * wants a reason written down.
   */
  it("keeps the starter theme catalogue inside its budget", () => {
    const { tree } = sampleTree()
    const measured = measurePrompt(
      intentFor("make the body quieter"),
      tree,
      starterCatalogue(),
      createThemeRegistry().catalogue()
    )

    expect(
      measured.themes,
      "the starter theme catalogue has outgrown its prompt budget: either the starter library has grown past what one deployment should register all of, or 0077's cut order applies (presets and packs before palettes), or the ceiling moves and the reason is written down"
    ).toBeLessThan(8_000)
  })

  /**
   * The thing the block is for, held against the thing it competes with. A
   * deployment is free to register fifty themes and five primitives; Loom's own
   * starter set spending more of a model's attention on what a page can wear
   * than on what can exist is a different matter, and the moment to notice it is
   * when it happens rather than when a request gets expensive.
   */
  it("does not let the starter themes outgrow the starter primitives", () => {
    const { tree } = sampleTree()
    const measured = measurePrompt(
      intentFor("make the body quieter"),
      tree,
      starterCatalogue(),
      createThemeRegistry().catalogue()
    )

    expect(
      measured.themes,
      "the starter themes now cost a model more attention than the starter primitives, which is the moment 0077's cut order was written for"
    ).toBeLessThan(measured.primitives)
  })

  /**
   * The measurement that made this worth building, held so it stays true.
   *
   * On a large page the tree is the request — 91% of it at five hundred sections
   * — and it is the one block a cache can never hold, because it changes with
   * every revision. A scope is the only lever that bounds it, and until 0083 it
   * did not: the whole tree was rendered with a marker, so scoping a change cost
   * eleven characters *more* than not scoping it.
   */
  it("stops a scoped request from growing with the page it sits on", () => {
    const pageOf = (sections: number) => {
      const idFactory = sequentialIdFactory()
      const children = Array.from({ length: sections }, (_, index) =>
        buildElement(idFactory, {
          type: "loom.section",
          props: { title: `Section ${index}` },
          children: [buildText(idFactory, `Body copy for section number ${index}.`)],
        })
      )
      const root = buildElement(idFactory, { type: "loom.page", children })
      const target = children[0]
      if (target === undefined) throw new Error("a page needs at least one section")

      return { tree: createTree(root, idFactory), targetId: target.id }
    }

    const measure = (page: ReturnType<typeof pageOf>, scoped: boolean) => {
      const base = intentFor("soften this section")
      const intent = scoped ? { ...base, scopeNodeId: page.targetId } : base

      return measurePrompt(intent, page.tree, starterCatalogue(), createThemeRegistry().catalogue())
    }

    const small = pageOf(5)
    const large = pageOf(500)

    expect(measure(large, false).tree).toBeGreaterThan(measure(small, false).tree * 50)
    expect(
      measure(large, true).tree - measure(small, true).tree,
      "a scoped request has started growing with the page again, which is the cost 0083 exists to remove"
    ).toBeLessThan(20)
  })
})

describe("measureCatalogue", () => {
  const starterEntries = () => STARTER_PRIMITIVES

  const catalogueOfTypes = (types: readonly string[]): PrimitiveCatalogue => {
    const selected = selectPrimitives(starterEntries(), types)
    if (!selected.ok) throw new Error("expected the selection to be honoured")

    const registry = createPrimitiveRegistry(selected.value)
    if (!registry.ok) throw new Error("the sliced registry did not build")

    return catalogueOf(registry.value)
  }

  const starter = () => {
    const registry = createStarterPrimitiveRegistry()
    if (!registry.ok) throw new Error("the starter registry did not build")

    return catalogueOf(registry.value)
  }

  const listed = (cost: ReturnType<typeof measureCatalogue>) =>
    cost.byType.reduce((sum, entry) => sum + entry.characters, 0)

  it("measures the block that is actually sent", () => {
    const { tree } = sampleTree()
    const catalogue = starter()

    expect(measureCatalogue(catalogue).characters).toBe(
      measurePrompt(intentFor("make the body quieter"), tree, catalogue).primitives
    )
  })

  it("charges nothing for a vocabulary with nothing in it", () => {
    expect(measureCatalogue([])).toEqual({ entries: 0, characters: 0, perEntry: 0, byType: [] })
  })

  it("names every entry, in the catalogue's order", () => {
    const catalogue = starter()

    expect(measureCatalogue(catalogue).byType.map((entry) => entry.type)).toEqual(
      catalogue.map((primitive) => primitive.type)
    )
  })

  /**
   * The instruction around the list is the only thing the block costs beyond its
   * entries, and it is small and fixed. A block whose prose had grown into the
   * hundreds would be a cost every deployment pays whatever it registers, which
   * is the one part of this number that is this package's to answer for.
   */
  it("costs a little more than its entries, and the little is the instruction", () => {
    const cost = measureCatalogue(starter())
    const prose = cost.characters - listed(cost)

    expect(prose).toBeGreaterThan(0)
    expect(
      prose,
      "the instruction wrapped around the catalogue has grown; it is paid on every request by every deployment, whatever it registered"
    ).toBeLessThan(500)
  })

  /**
   * The ceiling that survives a library that is meant to grow.
   *
   * A ceiling on the whole block would fire on exactly the growth the starter
   * library is being grown for, and firing would mean a red build for every
   * surface — so it would be raised without being read, which is what a ceiling
   * nobody believes is worth. What must not move is the price of one entry: the
   * block grows with the library by design and with this number by accident.
   *
   * 200 is roughly 17% above the 171 characters the ninety-six starter entries
   * average. When it fires the answer is that a description has grown past the
   * one line it is meant to be, or that a primitive declares more props than a
   * model needs shown, or that the figure moves and the reason is written down.
   */
  it("keeps one registered primitive at about what one costs today", () => {
    expect(
      measureCatalogue(starter()).perEntry,
      "a catalogue entry now costs a model noticeably more than it did; the block is meant to grow with the library and not with the price of a line"
    ).toBeLessThan(200)
  })

  /**
   * The answer to the block having no ceiling, which is that the ceiling is a
   * deployment's to set and this is how it is kept: a library is a set to choose
   * from, and a host that chooses pays for what it chose.
   */
  it("charges a deployment for the slice it registered rather than the library it chose from", () => {
    const whole = measureCatalogue(starter())
    const twelve = starterEntries()
      .slice(0, 12)
      .map((entry) => entry.type)
    const slice = measureCatalogue(catalogueOfTypes(twelve))

    expect(slice.entries).toBe(12)
    expect(whole.entries).toBeGreaterThan(50)
    expect(slice.characters).toBeLessThan(whole.characters / 4)
    expect(listed(slice)).toBe(
      whole.byType
        .filter((entry) => twelve.includes(entry.type))
        .reduce((sum, entry) => sum + entry.characters, 0)
    )
  })
})
