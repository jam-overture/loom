import { buildElement, buildSlot, buildText, createTree, sequentialIdFactory } from "@loom/runtime"

/**
 * A page about buying ski kit, as a `LoomTree`.
 *
 * Every band is a registered primitive. There is no markup in this file and no
 * styling — a `loom.section` decides it is a section, and the theme decides what
 * that looks like. The only thing written here is *what the page says* and
 * *which band says it*, which is the whole claim the library is making.
 *
 * The theme is three registered ids on the root (0049). `midnight` is a navy
 * dark palette with a cyan accent, which is the one in the library that looks
 * like a mountain at four in the afternoon.
 */

const THEME = { palette: "midnight", fontPack: "condensed", stylePreset: "showcase" }

export const buildPage = (ids = sequentialIdFactory()) => {
  const text = (value) => buildText(ids, value)
  const el = (type, props = {}, children = []) => buildElement(ids, { type, props, children })
  const slot = (name, fallback) => buildSlot(ids, name, fallback)

  const heading = (level, value, props = {}) => el("loom.heading", { level, ...props }, [text(value)])
  const prose = (value, props = {}) => el("loom.prose", props, [text(value)])
  const feature = (title, body, props = {}) => el("loom.feature", { title, body, ...props })
  const spec = (label, value) => el("loom.spec", { label, value })
  const stat = (value, label, caption) =>
    el("loom.stat", caption === undefined ? { value, label } : { value, label, caption })
  const faq = (question, answer, props = {}) => el("loom.faq", { question, answer, ...props })

  /** A comparison cell. `role: "subject"` makes it a column head rather than a value. */
  const subject = (name, note) =>
    el("loom.comparison", note === undefined ? { role: "subject" } : { role: "subject", note }, [text(name)])
  const cell = (props, value) => el("loom.comparison", props, value === undefined ? [] : [text(value)])
  const row = (props, cells) => el("loom.comparison-row", props, cells)

  // ─── the bar across the top ────────────────────────────────────────────────

  const nav = el(
    "loom.nav",
    { position: "sticky", tone: "surface" },
    [
      slot("brand", [heading(3, "COLDSMITH")]),
      el("loom.link", { href: "/#layers" }, [text("Layers")]),
      el("loom.link", { href: "/#helmets" }, [text("Helmets")]),
      el("loom.link", { href: "/#goggles" }, [text("Goggles")]),
      slot("actions", [el("loom.action", { href: "/#fit", variant: "primary", scale: "small" }, [text("Book a fitting")])]),
    ]
  )

  // ─── the opening ───────────────────────────────────────────────────────────

  const hero = el(
    "loom.hero",
    { backdrop: "aurora", stature: "tall", eyebrow: "The 26/27 kit report", anchor: "top" },
    [
      slot("heading", [heading(1, "Everything you are told about ski kit is a spec sheet. Almost none of it is a reason.")]),
      prose(
        "Three layers or two. Koroyd or MIPS. Toric or spherical. The differences are real, most of them are small, and exactly one of them will matter to how your day actually goes. This is which.",
        { size: "lead" }
      ),
      slot("actions", [
        el("loom.action", { href: "/#layers", variant: "primary" }, [text("Start with the shell")]),
        el("loom.action", { href: "/#goggles", variant: "quiet" }, [text("Skip to lenses")]),
      ]),
    ]
  )

  // ─── what changed this season ──────────────────────────────────────────────

  const trends = el(
    "loom.section",
    { tone: "canvas", width: "wide", eyebrow: "This season" },
    [
      slot("heading", [heading(2, "Four things that actually changed")]),
      prose(
        "Not colourways. The four below alter what you would buy, and three of them push in the same direction: less fabric, worn longer.",
        { tone: "muted" }
      ),
      el("loom.feature-grid", { columns: "two", density: "loose" }, [
        feature(
          "Recycled membranes stopped being a compromise",
          "PFAS-free DWR was the story two seasons ago and it was genuinely worse — it wetted out by lunch. The 26/27 chemistry holds. There is no longer a performance argument for the old stuff, only stock clearing through outlets."
        ),
        feature(
          "The mid-layer is where the money moved",
          "Shells got commoditised. Grid fleece, active insulation and the 60g synthetic puffy are where brands are competing now, because that is the layer you actually take on and off six times a day."
        ),
        feature(
          "Insulated jackets are becoming a resort-only purchase",
          "Anyone who skins, or who skis spring, has already split the system: hard shell plus separate insulation. The all-in-one insulated jacket is now a lift-served, cold-climate product and is priced like one."
        ),
        feature(
          "Helmet brims and goggle frames are being designed together",
          "The gap between helmet and goggle — the gaper gap — used to be your problem. Anon, Smith and POC now each sell a helmet whose brim is cut for their own goggle. It works, and it quietly locks you into a brand."
        ),
      ]),
    ]
  )

  // ─── 2L vs 3L ──────────────────────────────────────────────────────────────

  const construction = el(
    "loom.section",
    { tone: "surface", width: "wide", anchor: "layers", eyebrow: "Shell construction" },
    [
      slot("heading", [heading(2, "2L, 2.5L and 3L — what the numbers count")]),
      prose(
        "The number is how many pieces are bonded together, not how warm it is. Every one of them has the same waterproof membrane in the middle. What differs is what is on the inside of it, and that decides weight, durability and how it feels when you sweat."
      ),
      el(
        "loom.comparison-table",
        { caption: "The same membrane, finished three ways", feature: "first", density: "loose" },
        [
          slot("columns", [
            row({}, [
              subject("2-layer", "face + membrane, loose liner"),
              subject("2.5-layer", "face + membrane + print"),
              subject("3-layer", "face + membrane + backer"),
            ]),
          ]),
          row({ heading: "Weight for the same waterproofing" }, [
            cell({ mark: "no" }, "Heaviest"),
            cell({ mark: "yes" }, "Lightest"),
            cell({ mark: "partial" }, "Middle"),
          ]),
          row({ heading: "Packs down small" }, [
            cell({ mark: "no" }),
            cell({ mark: "yes" }),
            cell({ mark: "partial" }),
          ]),
          row({ heading: "Survives a season of pack straps", note: "abrasion on the inside face" }, [
            cell({ mark: "partial" }, "Liner snags"),
            cell({ mark: "no" }, "Print wears off"),
            cell({ mark: "yes" }, "Bonded"),
          ]),
          row({ heading: "Comfortable against a base layer" }, [
            cell({ mark: "yes" }, "Soft liner"),
            cell({ mark: "no" }, "Clammy"),
            cell({ mark: "partial" }, "Stiffer"),
          ]),
          row({ heading: "Quiet when you move" }, [
            cell({ mark: "yes" }),
            cell({ mark: "partial" }),
            cell({ mark: "no" }, "Crinkles"),
          ]),
          row({ heading: "Usually sold insulated" }, [
            cell({ mark: "yes" }),
            cell({ mark: "no" }),
            cell({ mark: "no" }, "Shell only"),
          ]),
          row({ heading: "What you pay", note: "jacket, mid-market" }, [
            cell({ role: "value" }, "£180–£320"),
            cell({ role: "value" }, "£140–£260"),
            cell({ role: "value" }, "£380–£700"),
          ]),
        ]
      ),
      el("loom.callout", { title: "The honest version", tone: "accent" }, [
        prose(
          "If you ski fewer than fifteen days a year, lift-served, in a cold resort — buy the 2L insulated jacket and spend the difference on gloves. 3L is bought by people who generate their own heat: tourers, spring skiers, and anyone who has been wet at the top of a lift and remembers it."
        ),
      ]),
      el("loom.grid", { columns: "three", gap: "normal" }, [
        spec("Waterproofing that matters", "20k mm and up"),
        spec("Breathability that matters", "20k g/m²/24h and up"),
        spec("The number nobody prints", "Pit zip length"),
      ]),
    ]
  )

  // ─── helmets ───────────────────────────────────────────────────────────────

  const helmetCard = (brand, tech, body, badge) =>
    el("loom.card", { tone: "outline", padding: "loose" }, [
      el("loom.badge", { tone: "accent" }, [text(badge)]),
      heading(3, brand),
      prose(body, { size: "small" }),
      spec("Impact system", tech),
    ])

  const helmets = el(
    "loom.section",
    { tone: "canvas", width: "wide", anchor: "helmets", eyebrow: "Helmets" },
    [
      slot("heading", [heading(2, "Three houses, three theories of a crash")]),
      prose(
        "All three are certified to the same standards. Where they differ is what they think a bad day looks like — and rotational protection is the axis they disagree on."
      ),
      el("loom.grid", { columns: "three", gap: "loose" }, [
        helmetCard(
          "Anon",
          "MIPS / WaveCel (M4)",
          "The integration play. Magnetic Fidlock buckle you can work with a mitt on, and a brim cut for Anon goggles so the gap closes without fiddling. Buy Anon goggles or you have bought half a system.",
          "Best fit-and-forget"
        ),
        helmetCard(
          "POC",
          "MIPS Integra",
          "The Swedish safety house, and the one that behaves as though it expects you to crash. Bright shells on purpose — visibility is treated as safety equipment. Fit runs round; if your head is oval you will know within a minute.",
          "Most protective feel"
        ),
        helmetCard(
          "Smith",
          "Koroyd + MIPS",
          "Koroyd is the green straw-looking material — welded tubes that crush on impact and vent while doing nothing. The best ventilation of the three, and the goggle integration is as tight as Anon's.",
          "Best ventilation"
        ),
      ]),
      el("loom.callout", { title: "What the certification does and does not promise", tone: "neutral" }, [
        prose(
          "ASTM F2040 and EN 1077 both test a straight drop onto a flat anvil. Neither tests rotation, which is what actually concentrates injury in a real fall. MIPS, WaveCel and Koroyd all address that, none of them is required, and none of them appears on the certification label. That is why the marketing is loud about it."
        ),
      ]),
    ]
  )

  // ─── goggles ───────────────────────────────────────────────────────────────

  const goggles = el(
    "loom.section",
    { tone: "surface", width: "wide", anchor: "goggles", eyebrow: "Goggles" },
    [
      slot("heading", [heading(2, "Lens shape, and the one spec worth reading")]),
      prose(
        "Three geometries, and the price gap between them is mostly optics rather than marketing. Then one number — VLT — which matters more than all of it."
      ),
      el("loom.feature-grid", { columns: "three", density: "loose" }, [
        feature(
          "Cylindrical",
          "Curves side to side, flat top to bottom. Cheapest to make, and the flat vertical plane bends light slightly at the edges — you notice it as a faint bowing when you turn your head fast. Retro look is back in fashion, which is doing a lot of work for this category."
        ),
        feature(
          "Spherical",
          "Curves on both axes, like an eye. Least distortion, widest peripheral view, and the extra volume between lens and face holds more air, so it fogs later. Costs the most and looks the bubbliest."
        ),
        feature(
          "Toric",
          "Curved on both axes but with a gentler vertical radius — spherical optics in a flatter-looking frame. This is where most of the good goggles landed: Smith 4D MAG, Anon M4 Toric, Giro Contour."
        ),
      ]),
      el("loom.stat-grid", { columns: "four", align: "start" }, [
        stat("5–20%", "Bluebird VLT", "High glacier sun"),
        stat("20–40%", "Mixed VLT", "The one lens to own"),
        stat("40–70%", "Overcast VLT", "Flat light, trees"),
        stat("70–90%", "Night VLT", "Clear, essentially"),
      ]),
      el("loom.callout", { title: "Polarized: the one to think twice about", tone: "accent" }, [
        prose(
          "Polarization kills glare bouncing off flat surfaces, which is wonderful on water and mixed on snow. The glare it removes is partly how you read ice — a polarized lens can make a firm patch and a soft patch look the same. Plenty of good skiers avoid it for exactly that reason. Contrast-enhancing tints — ChromaPop, Prizm, Perceive, Clarity — solve the flat-light problem better and do not hide the ice."
        ),
      ]),
      el("loom.divider", { ornament: "dots", spacing: "loose" }),
      prose(
        "If you buy one lens, make it 20–40% VLT in a contrast tint. If you buy two, add a 60%+ for storm days. Do not buy the 8% mirror because it looked good in the shop; you will take it off in the trees.",
        { align: "center", size: "lead" }
      ),
    ]
  )

  // ─── questions ─────────────────────────────────────────────────────────────

  const questions = el(
    "loom.section",
    { tone: "canvas", width: "readable", anchor: "fit", eyebrow: "Before you buy" },
    [
      slot("heading", [heading(2, "The questions people actually ask")]),
      el("loom.faq-list", { columns: "one", width: "readable" }, [
        faq(
          "Is a 3L jacket warmer than a 2L?",
          "No — usually the opposite. 3L is almost always sold as an uninsulated shell. A 2L jacket often has insulation built in. The layers count construction, not warmth.",
          { open: true }
        ),
        faq(
          "Do I need a new helmet after one crash?",
          "If you hit your head, yes, even with no visible damage — EPS foam is single-use by design and crushes to absorb the impact. Koroyd and WaveCel are the same. A helmet that saved you once has spent itself."
        ),
        faq(
          "Are pants worth the same money as the jacket?",
          "Rarely. Pants see less weather and more abrasion, so durability beats breathability. A good 2L pant with reinforced cuffs outlasts a 3L pant that gets shredded by your own edges."
        ),
        faq(
          "How do I stop goggles fogging on the lift?",
          "Do not push them onto your helmet. The warm damp air rising off your head is the cause of most of it. Leave them on your face, open the vents, and never wipe the inside of the lens — that removes the anti-fog coating permanently."
        ),
        faq(
          "Is the brand-matched helmet and goggle thing real?",
          "The fit is real; the lock-in is also real. A matched pair closes the gap on your forehead properly. Mixing brands works fine if you try them on together, which nobody does when buying online."
        ),
      ]),
    ]
  )

  const footer = el(
    "loom.footer",
    { columns: "two", tone: "surface" },
    [
      slot("brand", [heading(3, "COLDSMITH"), prose("Kit advice with the marketing taken out.", { size: "small", tone: "muted" })]),
      el("loom.link-list", { label: "Guides", direction: "column" }, [
        el("loom.link", { href: "/#layers" }, [text("Shell construction")]),
        el("loom.link", { href: "/#helmets" }, [text("Helmets")]),
        el("loom.link", { href: "/#goggles" }, [text("Lenses and VLT")]),
      ]),
      slot("note", [
        prose(
          "A prototype page, built from Loom primitives. Prices are indicative and the opinions are the kind you get in a shop at four in the afternoon.",
          { size: "small", tone: "muted" }
        ),
      ]),
    ]
  )

  const root = buildElement(ids, {
    type: "loom.page",
    props: { "loom:theme": THEME, width: "full" },
    children: [nav, hero, trends, construction, helmets, goggles, questions, footer],
  })

  return createTree(root, ids)
}
