/**
 * The prototype's own layout, which deliberately does not use the portal's.
 *
 * `(portal)/layout.tsx` mounts the 56px hover rail and the current top bar on
 * everything beneath it. This tree is a proposal for replacing both, so it
 * renders its own chrome and the parent's is suppressed by the parent, not
 * worked around here — see the note in `(portal)/layout.tsx`.
 */
const PreviewLayout = ({ children }: { children: React.ReactNode }) => <>{children}</>

export default PreviewLayout
