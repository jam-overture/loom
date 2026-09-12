import { mkdirSync, writeFileSync } from "node:fs"

import { renderPage } from "./render.mjs"

const { document, diagnostics, nodeCount } = renderPage()

mkdirSync("out", { recursive: true })
writeFileSync("out/index.html", document)

process.stdout.write(`out/index.html — ${nodeCount} nodes, ${diagnostics.length} diagnostic(s)\n`)
for (const diagnostic of diagnostics) process.stdout.write(`  ! ${JSON.stringify(diagnostic)}\n`)
