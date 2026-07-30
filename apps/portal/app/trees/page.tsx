/**
 * A placeholder only in the sense that it has nothing to list yet: the store
 * landed hours ago but is not wired here, because that half of §5 waits on the
 * runtime package reaching main. What it must not do is pretend — an empty state
 * that reads as "no trees" when the truth is "not connected" is a lie the next
 * session would have to debug.
 */
const TreesPage = () => (
  <div className="p-8">
    <h1 className="text-2xl tracking-tight">trees</h1>
    <p className="text-ink-muted mt-2 text-sm">
      The shell is in place. Nothing reads the store yet.
    </p>
  </div>
)

export default TreesPage
