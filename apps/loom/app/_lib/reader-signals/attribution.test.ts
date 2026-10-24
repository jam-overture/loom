import { describe, expect, it } from "vitest"

import { err, ok } from "@jam-overture/loom"
import { applicationIdSchema, projectIdSchema, type Application } from "@jam-overture/loom/store"

import { attributeDelivery, type Senders } from "./attribution"
import { mintIngestKey, type IngestKey } from "./keys"

const SHOP_KEY = mintIngestKey()

const shop = (over: Partial<Application> = {}): Application => ({
  applicationId: applicationIdSchema.parse("app_shop"),
  projectId: projectIdSchema.parse("prj_shop"),
  name: "shop",
  createdAt: "2026-10-19T00:00:00.000Z",
  ...over,
})

/** A deployment that issued one key, to the application given. */
const sendersFor = (application: Application): Senders => ({
  applicationWithKey: (key: IngestKey) =>
    Promise.resolve(ok(key === SHOP_KEY ? application : null)),
})

const delivery = (query: string, headers: Record<string, string> = {}): Request =>
  new Request(`https://loom.test/api/reader-signals${query}`, {
    method: "POST",
    headers,
    body: "[]",
  })

const keyed = (headers: Record<string, string> = {}): Request =>
  delivery(`?key=${SHOP_KEY}`, headers)

describe("whose readers a delivery is", () => {
  describe("with no key", () => {
    /**
     * This deployment's own pages carry their project's key like any
     * customer's, so a keyless delivery from the origin it posts to is refused
     * like every other one (0298 clause 4).
     */
    it("refuses one from this deployment's own pages", async () => {
      const filed = await attributeDelivery(
        delivery("", { origin: "https://loom.test" }),
        sendersFor(shop())
      )

      expect(filed).toEqual(err({ code: "no-key" }))
    })

    it("refuses one from any other site", async () => {
      const filed = await attributeDelivery(
        delivery("", { origin: "https://shop.example.com" }),
        sendersFor(shop())
      )

      expect(filed).toEqual(err({ code: "no-key" }))
    })

    /** `curl`, a server, anything that is not a browser. */
    it("refuses one that names no origin", async () => {
      expect(await attributeDelivery(delivery(""), sendersFor(shop()))).toEqual(
        err({ code: "no-key" })
      )
    })

    /** What a sandboxed frame sends, which is no host rather than a host called null. */
    it("refuses one whose origin is the literal null", async () => {
      expect(await attributeDelivery(delivery("", { origin: "null" }), sendersFor(shop()))).toEqual(
        err({ code: "no-key" })
      )
    })

    /** An empty `?key=` is a key that was given and is wrong, not a key that was left off. */
    it("does not read an empty key as no key", async () => {
      expect(
        await attributeDelivery(
          delivery("?key=", { origin: "https://loom.test" }),
          sendersFor(shop())
        )
      ).toEqual(err({ code: "unknown-key" }))
    })
  })

  describe("with a key", () => {
    it("files the delivery under the application the key names", async () => {
      expect(await attributeDelivery(keyed(), sendersFor(shop()))).toEqual(ok(shop().applicationId))
    })

    /**
     * The mixing this exists to prevent, at its sharpest: a keyed delivery from
     * this deployment's own pages is still the key's, never the deployment's.
     */
    it("files under the key's application even from this deployment's own pages", async () => {
      expect(
        await attributeDelivery(keyed({ origin: "https://loom.test" }), sendersFor(shop()))
      ).toEqual(ok(shop().applicationId))
    })

    it("refuses a key this deployment never issued", async () => {
      const filed = await attributeDelivery(delivery(`?key=${mintIngestKey()}`), sendersFor(shop()))

      expect(filed).toEqual(err({ code: "unknown-key" }))
    })

    it("refuses something that is not a key, without asking the store", async () => {
      let asked = 0
      const counting: Senders = {
        applicationWithKey: () => {
          asked += 1
          return Promise.resolve(ok(null))
        },
      }

      expect(await attributeDelivery(delivery("?key=prj_shop"), counting)).toEqual(
        err({ code: "unknown-key" })
      )
      expect(asked).toBe(0)
    })

    it("refuses a key whose project was closed", async () => {
      const closed = shop({ closedAt: "2026-10-19T12:00:00.000Z" })

      expect(await attributeDelivery(keyed(), sendersFor(closed))).toEqual(
        err({ code: "closed", application: closed.applicationId })
      )
    })

    it("says the store could not answer, rather than that the key was wrong", async () => {
      const down: Senders = {
        applicationWithKey: () => Promise.resolve(err({ detail: "no database" })),
      }

      expect(await attributeDelivery(keyed(), down)).toEqual(
        err({ code: "unavailable", detail: "no database" })
      )
    })
  })

  describe("where it came from", () => {
    const hosted = shop({ host: "shop.example.com" })

    it("takes a delivery from the site the project names", async () => {
      expect(
        await attributeDelivery(keyed({ origin: "https://shop.example.com" }), sendersFor(hosted))
      ).toEqual(ok(hosted.applicationId))
    })

    /** A copied snippet, or a staging site still carrying production's key. */
    it("refuses one from another site carrying the project's key", async () => {
      expect(
        await attributeDelivery(keyed({ origin: "https://copied.example.org" }), sendersFor(hosted))
      ).toEqual(
        err({
          code: "wrong-origin",
          origin: "https://copied.example.org",
          application: hosted.applicationId,
        })
      )
    })

    /** Close enough is how a staging site files into production. */
    it("refuses a subdomain of the site the project names", async () => {
      expect(
        await attributeDelivery(
          keyed({ origin: "https://staging.shop.example.com" }),
          sendersFor(hosted)
        )
      ).toEqual(
        err({
          code: "wrong-origin",
          origin: "https://staging.shop.example.com",
          application: hosted.applicationId,
        })
      )
    })

    it("refuses another port on the same host", async () => {
      expect(
        await attributeDelivery(
          keyed({ origin: "https://shop.example.com:8443" }),
          sendersFor(hosted)
        )
      ).toEqual(
        err({
          code: "wrong-origin",
          origin: "https://shop.example.com:8443",
          application: hosted.applicationId,
        })
      )
    })

    it("holds a project that names a port to that port", async () => {
      const local = shop({ host: "localhost:3000" })

      expect(
        await attributeDelivery(keyed({ origin: "http://localhost:3000" }), sendersFor(local))
      ).toEqual(ok(local.applicationId))
    })

    it("refuses a delivery that names no origin once the project names its site", async () => {
      expect(await attributeDelivery(keyed(), sendersFor(hosted))).toEqual(
        err({ code: "wrong-origin", origin: null, application: hosted.applicationId })
      )
    })

    /**
     * A project registered without a host has said nothing an origin could be
     * held against, and a key tried from a terminal before there is a page to
     * paste it into is the first thing anybody does with one.
     */
    it("takes a delivery from anywhere for a project that names no site", async () => {
      expect(await attributeDelivery(keyed(), sendersFor(shop()))).toEqual(ok(shop().applicationId))
      expect(
        await attributeDelivery(keyed({ origin: "https://anywhere.example" }), sendersFor(shop()))
      ).toEqual(ok(shop().applicationId))
    })
  })
})
