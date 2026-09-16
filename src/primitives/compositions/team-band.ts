import type { IdFactory } from "../../ids.js"
import { buildElement, buildSlot, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * Who is behind it: four people, their roles, and a line each.
 *
 * A landing page for anything sold on judgement — an agency, a studio, a
 * consultancy, a small tool with opinions — answers *who are you* somewhere, and
 * the original nine could not. `testimonials` says who likes the product;
 * nothing said who makes it.
 *
 * ## No photographs, and this is the same wall `heroBand` documents
 *
 * `loom.person` takes an optional `photo`, and a team band is the one place a
 * missing image is most felt. It ships without one for the reason the hero
 * ships without media: `mediaUrlSchema` refuses `data:` deliberately, and a
 * same-origin path would name a file this library cannot put in a host's
 * `public/`. The alternative — four portraits on someone else's domain — ships
 * live third-party requests inside a tree a page might publish before anybody
 * re-reads it.
 *
 * `loom.person` draws a monogram from the name when there is no photo, so the
 * band is complete rather than gappy, and dropping four real portraits in is
 * four `configure` operations against nodes that already exist.
 *
 * ## Why the bios are one sentence and name a thing done
 *
 * A starting composition is read as a template even when it is not meant as
 * one, so the placeholder prose is the part most likely to survive into a real
 * page. Four bios of the form *"used to do X"* are a shape somebody can replace
 * a word at a time; four of the form *"passionate about excellence"* are a shape
 * somebody has to delete. The same reasoning `metricsBand` gives for not
 * shipping a number that needs defending.
 */
const PEOPLE = [
  {
    name: "Ada Okonkwo",
    role: "Founder",
    bio: "Built the first version of this while waiting on a review that never came.",
  },
  {
    name: "Tomas Lind",
    role: "Engineering",
    bio: "Spent six years on build systems and has opinions about all of them.",
  },
  {
    name: "Priya Raman",
    role: "Design",
    bio: "Draws the thing before anybody argues about it, which ends most arguments.",
  },
  {
    name: "Joel Mbeki",
    role: "Support",
    bio: "Answers in under an hour and writes the fix up so nobody asks twice.",
  },
] as const

export const teamBand: Composition = {
  id: "team",
  part: "team",
  label: "Team",
  promise: "Four people in a grid, each with a role and a line about them.",
  rationale:
    "A team band is a loom.person-grid holding a loom.person per person, under a loom.section with its own heading. Each person is a node, so one can be added, removed or rewritten without disturbing the others.",
  uses: ["loom.section", "loom.heading", "loom.prose", "loom.person-grid", "loom.person"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide", eyebrow: "Who is behind it", anchor: "team" },
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, {
            type: "loom.heading",
            props: { level: 2, balance: true },
            children: [buildText(ids, "Four people, and you can reach all of them")],
          }),
        ]),
        buildElement(ids, {
          type: "loom.prose",
          props: { measured: true, tone: "muted" },
          children: [buildText(ids, "No account managers and no queue. The people who build it are the people who answer.")],
        }),
        buildElement(ids, {
          type: "loom.person-grid",
          props: { columns: "four" },
          children: PEOPLE.map((person) =>
            buildElement(ids, {
              type: "loom.person",
              props: { name: person.name, role: person.role, bio: person.bio },
            })
          ),
        }),
      ],
    }),
}
