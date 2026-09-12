import { createThemeRegistry } from "@loom/runtime"
import { createStarterPrimitiveRegistry } from "@loom/runtime/primitives"
import { renderLoomTree } from "@loom/runtime/react"
import { renderToStaticMarkup } from "react-dom/server"

import { buildPage } from "./page.mjs"

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

export const renderPage = () => {
  const tree = buildPage()
  const output = renderLoomTree(tree, {
    resolver: registry.value,
    validator: registry.value,
    themes: createThemeRegistry(),
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
</style>
</head>
<body>${body}</body>
</html>`

  return { document, diagnostics: output.diagnostics, nodeCount: count(tree.root) }
}

const count = (node) =>
  node.kind === "text" ? 1 : 1 + node.children.reduce((total, child) => total + count(child), 0)
