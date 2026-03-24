import { Buffer } from "node:buffer";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cache } from "hono/cache";
import { HttpStatus } from "http-enums";
import * as z from "zod/mini";

import { H, R2C } from "../definitions";
import { LogicalError } from "../errors";
import { cfztAuth } from "../middlewares/cfzt-auth";
import { conditionalResponse } from "../middlewares/conditional-response";
import { rangeable } from "../middlewares/rangeable";
import { HonoCtx } from "../schemas/hono-ctx";
import { InitMupReqSchema, PartIndexSchema } from "../schemas/r2-mp";
import {
	r2_delete,
	r2_finalizeMultipartUpload,
	r2_initMultipartUpload,
	r2_retrive,
	r2_tree,
	r2_upload,
	r2_uploadPart,
} from "../services/r2";

const app = new Hono<HonoCtx>();

// auth
app.use(cfztAuth());

// dir & metadata
app.options("/:prefix{.+}", async (c) => {
	const { prefix } = c.req.param();

	const ret = await r2_tree(c.env.R2_BACKUP, prefix, c.req.query(R2C.DELIMITER_QUERY), c.req.query(R2C.CURSOR_QUERY));
	if (!ret) {
		throw new LogicalError(HttpStatus.NOT_FOUND, {
			grox: "p:t",
			msg: `'${prefix}' is not existed in bucket`,
		});
	}

	return c.json(ret.index, ret.getStatusCode(), ret.getHeaderRecords());
});

// retrive
app.get("/*", rangeable);
app.get("/*", conditionalResponse);

app.get(
	"/:key{.+}",
	cache({
		cacheName: "grox-bak",
		cacheControl: "public, max-age=86400",
		cacheableStatusCodes: [HttpStatus.FOUND, HttpStatus.TEMPORARY_REDIRECT, HttpStatus.OK, HttpStatus.NOT_FOUND],
	}),
	async (c) => {
		const { key } = c.req.param();

		const ret = await r2_retrive(c.env.R2_BACKUP, key, { headers: c.req.raw.headers });
		if (!ret) {
			throw new LogicalError(HttpStatus.NOT_FOUND, {
				grox: "p:r",
				msg: `'${key}' is not existed in bucket`,
			});
		}

		if (!ret.body) {
			return c.body(null, HttpStatus.NOT_MODIFIED, ret.getHeaderRecords());
		}
		return c.body(ret.body, ret.getStatusCode(), ret.getHeaderRecords());
	},
);

// upload
const BAK_MPUID_PREFIX = "bak-mpuId";

app.post(`/\\*mpu/init`, zValidator("json", InitMupReqSchema), async (c) => {
	const data = c.req.valid("json");

	const ret = await r2_initMultipartUpload(c.env.R2_BACKUP, data.key, {
		headers: c.req.raw.headers,
		sha256: Buffer.from(data.sha256, "hex").buffer,
	});
	c.env.KV_GROX.put(`${BAK_MPUID_PREFIX}:${ret}`, data.key, { expirationTtl: 7 * 86400 - 3600 });

	return c.text(ret, HttpStatus.CREATED);
});

app.put("/\\*mpu/:id/:partNum{[0-9]+}", async (c) => {
	const { id, partNum } = c.req.param();

	const key = await c.env.KV_GROX.get(`${BAK_MPUID_PREFIX}:${id}`, { cacheTtl: 600 });
	if (!key) {
		throw new LogicalError(HttpStatus.NOT_FOUND, {
			grox: "b:up",
			msg: `upload '${id}' cannot be found`,
		});
	}

	const ret = await r2_uploadPart(c.env.R2_BACKUP, key, id, +partNum, c.req.raw.body!, {
		headers: c.req.raw.headers,
	});

	return c.json(ret, HttpStatus.ACCEPTED);
});

app.post("/\\*mpu/:id", zValidator("json", PartIndexSchema), async (c) => {
	const { id } = c.req.param();
	const parts = c.req.valid("json");

	const key = await c.env.KV_GROX.get(`${BAK_MPUID_PREFIX}:${id}`);
	if (!key) {
		throw new LogicalError(HttpStatus.NOT_FOUND, {
			grox: "b:fm",
			msg: `upload '${id}' cannot be found`,
		});
	}

	const ret = await r2_finalizeMultipartUpload(c.env.R2_BACKUP, key, id, parts);
	await c.env.KV_GROX.delete(`${BAK_MPUID_PREFIX}:${id}`);

	return c.json(ret, HttpStatus.OK);
});

app.put("/:key{.+}", async (c) => {
	const { key } = c.req.param();
	const sha256 = c.req.header(H.SHA256_HEADER);

	const ret = await r2_upload(c.env.R2_BACKUP, key, c.req.raw.body, {
		headers: c.req.raw.headers,
		sha256: sha256 ? Buffer.from(sha256, "hex").buffer : undefined,
	});
	if (!ret) {
		throw new LogicalError(HttpStatus.PRECONDITION_FAILED, {
			grox: "b:u",
			msg: `preconditions from req header cannot be satisfied for key '${key}'`,
		});
	}

	return c.json(ret, HttpStatus.CREATED);
});

// delete
app.post("/\\*batch-del", zValidator("json", z.array(z.string())), async (c) => {
	const data = c.req.valid("json");

	const ret = await r2_delete(c.env.R2_BACKUP, data);

	return c.text(ret, HttpStatus.OK);
});

app.delete("/:key{.+}", async (c) => {
	const { key } = c.req.param();

	const ret = await r2_delete(c.env.R2_BACKUP, key);

	return c.text(ret, HttpStatus.OK);
});

export default app;
