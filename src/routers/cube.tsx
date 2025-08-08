import { Hono } from "hono";
import { validator } from "hono/validator";

import { HonoContext } from "I/honoContext";
import { serveModule } from "S/cube";
import { CubeConst, D, R2Const } from "@/definitions";
import { MissingPartIndexesErr, ObjectNotFoundErr, UnknownUploadIdErr } from "@/errors";
import { PartIndexesBodySchema } from "@/services/r2/partIndex";

const app = new Hono<HonoContext>();

// --- cip ---
app.get("/", async (c) => {
	const url = new URL(c.req.url);
	const ret = await serveModule(c.var.kv, c.var.r2, c.var.gql, url.host, CubeConst.CIP_NAME);

	return ret.toResponse();
});

// --- modules ---
app.get(`/${CubeConst.MODULE_URL_PREFIX}/:moduleName{[a-z][a-z0-9_/]+}`, async (c) => {
	const url = new URL(c.req.url);
	const { moduleName } = c.req.param();
	const ret = await serveModule(c.var.kv, c.var.r2, c.var.gql, url.host, moduleName);

	return ret.toResponse();
});

// --- multipart upload ---
app.post("/mp", async (c) => {
	const key = await (await c.req.blob()).text();
	const ret = await c.var.r2.initMultipartUpload(key);
	c.var.kv.put(ret, key);

	return c.text(ret, 200);
});

app.put("/mp/:upId/:part{[0-9]+}", async (c) => {
	const { upId, part } = c.req.param();
	const partNum = parseInt(part);
	const key = await c.var.kv.get(upId);
	if (!key) {
		throw new UnknownUploadIdErr("C-MP-P", upId);
	}
	const ret = await c.var.r2.uploadPart(key, upId, partNum, c.req.raw.body!);

	return c.json(ret, 200);
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
			throw new UnknownUploadIdErr("C-MP-F", upId);
		}
		const parts = c.req.valid("json");
		if (!parts) {
			throw new MissingPartIndexesErr("C-MP-FV");
		}
		const ret = await c.var.r2.finalizeMultipartUpload(key, upId, parts);

		return c.json(ret, 200);
	},
);

// regular tree, get, & put; must be the last, since they can catch everything
app.options(D.GENERAL_KEY_PATH, async (c) => {
	const { key } = c.req.param();
	const ret = await c.var.r2.tree(key, c.req.query(R2Const.DELIMITER_QUERY), c.req.query(R2Const.CURSOR_QUERY));
	if (!ret) {
		throw new ObjectNotFoundErr("C-TC", `r2:'${c.var.r2.name}'`, `prefix:'${key}'`);
	}

	return ret.toResponse();
});

app.get(D.GENERAL_KEY_PATH, async (c) => {
	const { key } = c.req.param();
	const ret = await c.var.r2.get(key, c.req.raw.headers);
	if (!ret) {
		throw new ObjectNotFoundErr("C-GC", `r2:'${c.var.r2.name}'`, `file:'${key}'`);
	}

	return ret.toResponse();
});

app.put(D.GENERAL_KEY_PATH, async (c) => {
	const { key } = c.req.param();
	const ret = await c.var.r2.get(key, c.req.raw.headers);
	if (!ret) {
		throw new ObjectNotFoundErr("C-PC", `r2:'${c.var.r2.name}'`, `file:'${key}'`);
	}

	return ret.toResponse();
});

export default app;
