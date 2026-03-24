import { Hono } from "hono";
import { cache } from "hono/cache";
import { HttpStatus } from "http-enums";

import { LogicalError } from "../errors";
import { cfztAuth } from "../middlewares/cfzt-auth";
import { conditionalResponse } from "../middlewares/conditional-response";
import { HonoCtx } from "../schemas/hono-ctx";
import { r2_retrive } from "../services/r2";

const app = new Hono<HonoCtx>();

// retrive crl
app.get(
	"/:key{.+\\.crl}",
	cache({
		cacheName: "grox-pki",
		cacheControl: "public, max-age=3600",
		cacheableStatusCodes: [HttpStatus.FOUND, HttpStatus.TEMPORARY_REDIRECT, HttpStatus.OK, HttpStatus.NOT_FOUND],
	}),
	async (c) => {
		const { key } = c.req.param();

		throw new LogicalError(HttpStatus.INTERNAL_SERVER_ERROR, {
			grox: "p:m",
			msg: "not implimented",
		});
	},
);

// retrive static
app.get("/*.{key,toml}", cfztAuth());
app.get("/*", conditionalResponse);

app.get(
	"/:key{.+\\.(?:crt|key|toml)}",
	cache({
		cacheName: "grox-pki",
		cacheControl: "public, max-age=86400",
		cacheableStatusCodes: [HttpStatus.FOUND, HttpStatus.TEMPORARY_REDIRECT, HttpStatus.OK, HttpStatus.NOT_FOUND],
	}),
	async (c) => {
		const { key } = c.req.param();

		const ret = await r2_retrive(c.env.R2_CUBE, `pki/${key}`, { headers: c.req.raw.headers });
		if (!ret) {
			throw new LogicalError(HttpStatus.NOT_FOUND, {
				grox: "p:rs",
				msg: `'${key}' is not existed in bucket`,
			});
		}

		if (!ret.body) {
			return c.body(null, HttpStatus.NOT_MODIFIED, ret.getHeaderRecords());
		}
		return c.body(ret.body, ret.getStatusCode(), ret.getHeaderRecords());
	},
);

// modify
app.put(cfztAuth());

app.put("/:key{.+\\.(?:crt|key|toml)}", async (c) => {
	throw new LogicalError(HttpStatus.INTERNAL_SERVER_ERROR, {
		grox: "p:m",
		msg: "not implimented",
	});
});

export default app;
