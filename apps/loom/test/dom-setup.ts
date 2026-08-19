import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

/**
 * One document per test.
 *
 * Testing Library unmounts automatically only when Vitest's globals are on, and
 * they are off here — an import that says where `expect` came from is worth more
 * than the two lines it costs. Without this, every render in a file accumulates
 * in the same `document.body`, and a query that should have found one node finds
 * the one a previous test left behind. That failure reads as a bug in the
 * component rather than in the harness, which is the worst kind to leave lying
 * around in the thing everything else will be tested with.
 */
afterEach(cleanup)
