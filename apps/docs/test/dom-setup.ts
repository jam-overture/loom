import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

/**
 * One document per test. Testing Library unmounts automatically only when
 * Vitest's globals are on, and they are off here — an import that says where
 * `expect` came from is worth more than the two lines it costs.
 */
afterEach(cleanup)
