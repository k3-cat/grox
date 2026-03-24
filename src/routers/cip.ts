import { Hono } from "hono";
import { cache } from "hono/cache";
import { HttpStatus } from "http-enums";

import { HonoCtx } from "../schemas/hono-ctx";
import { serveCipModule } from "../services/cip";

const CIP_HOSTNAME_PLACEHOLDER = "%{CIP_HOSTNAME}%";

const app = new Hono<HonoCtx>();

app.get(
	"/",
	cache({
		cacheName: "grox-cip",
		cacheControl: "public, max-age=3600",
		cacheableStatusCodes: [HttpStatus.FOUND, HttpStatus.TEMPORARY_REDIRECT, HttpStatus.OK, HttpStatus.NOT_FOUND],
	}),
	async (c) => {
		const url = new URL(c.req.url);
		const ret = await serveCipModule(c, "cip.py");
		const cipContent = ret.content.replace(CIP_HOSTNAME_PLACEHOLDER, url.host);

		return c.body(cipContent, ret.getStatusCode(), ret.getHeaderRecords());
	},
);

// --- modules ---
app.get(
	"/:moduleName{.+}",
	cache({
		cacheName: "grox-cip",
		cacheControl: "public, max-age=3600",
	}),
	async (c) => {
		const { moduleName } = c.req.param();

		const ret = await serveCipModule(c, moduleName);

		return c.body(ret.content, ret.getStatusCode(), ret.getHeaderRecords());
	},
);

export default app;
