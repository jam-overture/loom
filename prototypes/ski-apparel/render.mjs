import { createThemeRegistry } from "@loom/runtime"
import { createStarterPrimitiveRegistry } from "@loom/runtime/primitives"
import { renderLoomTree } from "@loom/runtime/react"
import { renderToStaticMarkup } from "react-dom/server"

import { buildPage } from "./page.mjs"
import { legendOf } from "./legend.mjs"
import { SIDEBAR_MARKUP, SIDEBAR_STYLES } from "./sidebar.mjs"

/**
 * The page, as one HTML document.
 *
 * `renderLoomTree` is total: it never throws, and anything it could not honour
 * comes back as a diagnostic rather than a blank screen. So the diagnostics are
 * printed on every render — a prototype that silently dropped a band would be
 * worse than useless for the question this exists to answer.
 */

const registry = createStarterPrimitiveRegistry()

if (!registry.ok) throw new Error(`registry: ${JSON.stringify(registry.error)}`)

export const renderPage = ({ rail = false, tree = buildPage() } = {}) => {
  const output = renderLoomTree(tree, {
    resolver: registry.value,
    validator: registry.value,
    themes: createThemeRegistry(),
    /**
     * Node ids on the markup only when the rail is on. `?rail=off` is the page a
     * visitor would get, and a published page carries no ids unless asked.
     */
    addressed: rail,
  })

  const body = renderToStaticMarkup(output.element)

  const document = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Coldsmith — the 26/27 kit report</title>
<style>
  html, body { margin: 0; padding: 0; }
  body { background: var(--loom-bg-canvas, #111827); }
${rail ? SIDEBAR_STYLES : ""}
</style>
</head>
<body>
<div class="loom-page-host">${body}</div>
${rail ? SIDEBAR_MARKUP : ""}
${rail ? `<script type="application/json" id="loom-legend">${safeJson(legendOf(tree))}</script>` : ""}
${rail ? `<script src="/rail.js"></script>` : ""}
</body>
</html>`

  return { document, diagnostics: output.diagnostics, nodeCount: count(tree.root) }
}

/** JSON inside a script element, with nothing in it that could close the element. */
const safeJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c")

const count = (node) =>
  node.kind === "text" ? 1 : 1 + node.children.reduce((total, child) => total + count(child), 0)
