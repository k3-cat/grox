import { Hono } from "hono";
import { cache } from "hono/cache";
import { logger } from "hono/logger";

import { CacheControl, D, S } from "@/definitions";
import { HonoContext } from "@/interfaces/honoContext";
import { bindingMiddleware } from "@/middlewares/bindinfMiddleware";
import { sentryTagsMiddleware } from "@/middlewares/sentryTagsMiddleware";
import { getService } from "@/utils/getService";

import BackupRouter from "./backup";
import CubeRouter from "./cube";
import UpdateRouter from "./update";

export const app = new Hono<HonoContext>({
	getPath: (req) => {
		const url = new URL(req.url);
		if (url.pathname.startsWith(D.STATIC_ASSETS_PERFIX)) {
			return url.pathname;
		}
		if (url.pathname === D.FAVICON_PATH) {
			return D.STATIC_ASSETS_PERFIX + D.FAVICON_PATH;
		}
		const service = getService(url);
		return `${service}${url.pathname}`;
	},
});

// = = =
app.use(sentryTagsMiddleware);
app.get(
	D.STATIC_ASSETS_PERFIX,
	cache({
		cacheName: "grox-static-get",
		cacheControl: CacheControl.Immutable,
		cacheableStatusCodes: [200, 301],
	}),
);

app.get(D.STATIC_ASSETS_PERFIX + D.STYLE_CSS_PATH, async (c) => {
	const url = new URL(c.req.url);
	url.pathname = D.STYLE_CSS_PATH;
	return await c.env.ASSETS.fetch(url);
});

app.get(D.STATIC_ASSETS_PERFIX + "/*", async (c) => {
	const url = new URL(c.req.url);
	const service = getService(url);
	url.pathname = `/${service}${url.pathname.slice(D.STATIC_ASSETS_PERFIX.length)}`;
	return await c.env.ASSETS.fetch(url);
});

// = = =
app.use(logger());
app.use(bindingMiddleware);
app.get(
	"*",
	cache({
		cacheName: "grox-get",
		cacheControl: CacheControl.Temp,
		cacheableStatusCodes: [200, 301],
	}),
);
app.options(
	"*",
	cache({
		cacheName: "grox-option",
		cacheControl: CacheControl.Temp,
	}),
);

app.route(S.Update, UpdateRouter);
app.route(S.Cube, CubeRouter);
app.route(S.Backup, BackupRouter);

// = = =
app.get("*", async (c) => {
	return c.text(`[grox] Cannot route this path: "${c.req.path}" (ray: ${c.req.header("Cf-Ray")})`, 404);
});
