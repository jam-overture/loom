import { auditRegistry, decorationFromAudit } from "@loom/runtime/sdk"

import { portalRegistry } from "./registry"

/**
 * Which of the portal's primitives leave a handle in the DOM.
 *
 * The audit calls every registered component once, which is why `auditRegistry`
 * is a function a host calls rather than something `createPrimitiveRegistry` does
 * behind its back. Doing it here, once at module scope, is that call made
 * deliberately: the answer is a property of the registry, so recomputing it per
 * request would probe the same components on every page view.
 */
export const portalDecoration = decorationFromAudit(auditRegistry(portalRegistry))
