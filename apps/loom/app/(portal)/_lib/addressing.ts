import { auditRegistry, decorationFromAudit } from "@jam-overture/loom/sdk"

import { portalRegistry } from "./registry"

/**
 * Which of the portal's primitives leave a handle in the DOM.
 *
 * The audit calls every registered component once for each shape its props can
 * take (0075), which is why `auditRegistry` is a function a host calls rather
 * than something `createPrimitiveRegistry` does behind its back. Doing it here,
 * once at module scope, is that call made deliberately: the answer is a property
 * of the registry, so recomputing it per request would probe the same components
 * on every page view — and since 0075 that is hundreds of renders rather than
 * one per primitive, which makes the conclusion stronger than when it was
 * written.
 */
export const portalDecoration = decorationFromAudit(auditRegistry(portalRegistry))
