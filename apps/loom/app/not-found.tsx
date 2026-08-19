/**
 * The one page that belongs to no surface.
 *
 * Each of the four route groups is a root layout of its own (0067), which is
 * what keeps the portal's stylesheet off a marketing page and the documentation's
 * chrome off a lesson. A URL that matches no route is by definition outside all
 * four, so there is no layout to inherit and this file carries its own document.
 *
 * It names the front door and nothing else. Listing the four surfaces here would
 * be a fifth place that has to be kept true as they grow, and the marketing site
 * is already the page whose job is to say what is where.
 */
const NotFound = () => (
  <html lang="en">
    <body style={{ fontFamily: "system-ui, sans-serif", margin: "4rem auto", maxWidth: "32rem" }}>
      <main>
        <h1>Not found</h1>
        <p>There is nothing at this address.</p>
        <a href="/">Back to the start</a>
      </main>
    </body>
  </html>
)

export default NotFound
