import { Hono } from "hono";
import { cache } from "hono/cache";
import { validator } from "hono/validator";
import { HttpStatus } from "http-enums";

import { CacheControl, H, P, R2C } from "@/definitions";
import { ConditionFailedErr, MissingPartIndexesErr, ObjectNotFoundErr, UnknownUploadIdErr } from "@/errors";
import { hexToArrayBuffer } from "@/utils/hexArrayBuffer";
import { HonoContext } from "I/honoContext";
import { PartIndexesBodySchema } from "S/r2/partIndex";

const app = new Hono<HonoContext>();

// --- multipart upload ---
app.post(`${P.ADMIN_PERFIX}/init-mp`, async (c) => {
	const key = await (await c.req.blob()).text();
	const sha256 = c.req.header(H.SHA256_HEADER);
	const ret = await c.var.r2.initMultipartUpload(key, {
		headers: c.req.raw.headers,
		sha256: sha256 ? hexToArrayBuffer(sha256) : undefined,
	});
	c.var.kv.set(ret, key, 7 * 86400 - 3600);

	return c.text(ret, HttpStatus.CREATED);
});

app.put("/mp/:upId/:part{[0-9]+}", async (c) => {
	const { upId, part } = c.req.param();
	const partNum = parseInt(part);
	const key = await c.var.kv.get(upId, 600);
	if (!key) {
		throw new UnknownUploadIdErr("BAK-MP-P", upId);
	}
	const ret = await c.var.r2.uploadPart(key, upId, partNum, c.req.raw.body!, { headers: c.req.raw.headers });

	return c.json(ret, HttpStatus.ACCEPTED);
});

app.post(
	"/mp/:upId",
	validator("json", (value, _c) => {
		const parsed = PartIndexesBodySchema.safeParse(value);
		if (!parsed.success) {
			return null;
		}
		return parsed.data.body;
	}),
	async (c) => {
		const { upId } = c.req.param();
		const key = await c.var.kv.get(upId);
		if (!key) {
			throw new UnknownUploadIdErr("BAK-MP-F", upId);
		}
		const parts = c.req.valid("json");
		if (!parts) {
			throw new MissingPartIndexesErr("BAK-MP-FV");
		}
		const ret = await c.var.r2.finalizeMultipartUpload(key, upId, parts);
		await c.var.kv.delete(upId);

		return c.json(ret, HttpStatus.OK);
	},
);

// regular tree, get, & put
app.options("/:prefix", async (c) => {
	const { prefix } = c.req.param();
	const ret = await c.var.r2.tree(
		prefix.replaceAll(P.PATH_SPLITTER, P.SLASH),
		c.req.query(R2C.DELIMITER_QUERY),
		c.req.query(R2C.CURSOR_QUERY),
	);
	if (!ret) {
		throw new ObjectNotFoundErr("BAK-T", c.var.r2.name, `prefix: ${prefix}`);
	}

	return c.json(ret.index, ret.getStatusCode(), ret.getHeaderRecords());
});

app.get(
	"/:key",
	cache({
		cacheName: "grox-bak",
		cacheControl: CacheControl.Immutable,
	}),
	async (c) => {
		const { key } = c.req.param();
		const ret = await c.var.r2.retrive(key.replaceAll(P.PATH_SPLITTER, P.SLASH), { headers: c.req.raw.headers });
		if (!ret) {
			throw new ObjectNotFoundErr("BAK-G", c.var.r2.name, key);
		}

		if (ret.isNotModified) {
			return c.body(null, HttpStatus.NOT_MODIFIED, ret.getHeaderRecords());
		}
		return c.body(ret.obj.body, ret.getStatusCode(), ret.getHeaderRecords());
	},
);

app.put(`${P.ADMIN_PERFIX}/:key`, async (c) => {
	const { key } = c.req.param();
	const sha256 = c.req.header(H.SHA256_HEADER);
	const ret = await c.var.r2.upload(key.replaceAll(P.PATH_SPLITTER, P.SLASH), c.req.raw.body, {
		headers: c.req.raw.headers,
		sha256: sha256 ? hexToArrayBuffer(sha256) : undefined,
	});
	if (!ret) {
		throw new ConditionFailedErr("BAK-P", c.var.r2.name, key);
	}

	return c.json(ret, HttpStatus.CREATED);
});

export default app;
