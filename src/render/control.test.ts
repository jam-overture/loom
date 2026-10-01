import { describe, expect, it } from "vitest"

import { BEHAVIOR_NAMES } from "./behavior.js"
import {
  CONTROL_CLASS,
  CONTROL_DISPLAY_PROPERTY,
  controlClass,
  controlDisplay,
  controlDisplayProperty,
} from "./control.js"

/**
 * The class and the custom property a primitive writes against, asserted as the
 * literal strings a stylesheet author types.
 *
 * That is the whole reason this file is separate from the seam's own suite. What
 * the controls do is checked where they are; what they are *called* is a contract
 * with somebody else's CSS file, and renaming one silently breaks a page rather
 * than a build.
 */
describe("the class and the display property a control carries", () => {
  it("gives every behavior in the vocabulary a class of its own", () => {
    expect(BEHAVIOR_NAMES.map((name) => controlClass(name))).toEqual([
      "loom-control loom-control-copy",
      "loom-control loom-control-disclose",
      "loom-control loom-control-adjust",
      "loom-control loom-control-present",
      "loom-control loom-control-dismiss",
    ])
  })

  it("carries the shared class first, so one rule reaches every control", () => {
    expect(BEHAVIOR_NAMES.every((name) => controlClass(name).startsWith(`${CONTROL_CLASS} `))).toBe(
      true
    )
  })

  it("names one property per behavior and one for the group", () => {
    expect(BEHAVIOR_NAMES.map((name) => controlDisplayProperty(name))).toEqual([
      "--loom-copy-display",
      "--loom-disclose-display",
      "--loom-adjust-display",
      "--loom-present-display",
      "--loom-dismiss-display",
    ])
    expect(CONTROL_DISPLAY_PROPERTY).toBe("--loom-control-display")
  })

  /**
   * The order is the whole of the design: the specific name wins over the group
   * name, the group name wins over what the control set for itself, and a
   * primitive that says nothing gets the resting value unchanged. A nesting the
   * other way round would make the group property unoverridable, which is the
   * bug this shape exists to avoid.
   */
  it("resolves the specific name first, then the group, then the control's own", () => {
    expect(controlDisplay("disclose", "inline-flex")).toBe(
      "var(--loom-disclose-display, var(--loom-control-display, inline-flex))"
    )
  })

  it("keeps the resting value a primitive that overrides nothing still gets", () => {
    expect(controlDisplay("adjust", "inline-block")).toContain(", inline-block))")
  })
})
