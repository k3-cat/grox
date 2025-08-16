import { Hono } from "hono";
import { cache } from "hono/cache";

import { CacheControl, P } from "@/definitions";
import { HonoContext } from "I/honoContext";

const app = new Hono<HonoContext>();

app.use(
	"*",
	cache({
		cacheName: "grox-s",
		cacheControl: CacheControl.Immutable,
		cacheableStatusCodes: [200, 404],
	}),
);

app.get(`/:service${P.STYLE_CSS_PATH}`, async (c) => {
	const url = new URL(c.req.url);
	url.pathname = P.STYLE_CSS_PATH;
	return await c.env.ASSETS.fetch(url);
});

app.get(`*`, async (c) => {
	const url = new URL(c.req.url);
	url.pathname = c.req.path.slice(P.STATIC_ASSETS_PERFIX.length);
	return await c.env.ASSETS.fetch(url);
});

export default app;
