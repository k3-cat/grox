import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HttpStatus } from "http-enums";
import * as z from "zod/mini";

import { H, R2C } from "../definitions";
import { LogicalError } from "../errors";
import { cfztAuth } from "../middlewares/cfzt-auth";
import { conditionalResponse } from "../middlewares/conditional-response";
import { HonoCtx } from "../schemas/hono-ctx";
import { r2_delete, r2_retrive, r2_tree, r2_upload } from "../services/r2";

const app = new Hono<HonoCtx>();

// dir & metadata
app.options("/:prefix{.+}", async (c) => {
	const { prefix } = c.req.param();

	const ret = await r2_tree(c.env.R2_BACKUP, prefix, c.req.query(R2C.DELIMITER_QUERY), c.req.query(R2C.CURSOR_QUERY));
	if (!ret) {
		throw new LogicalError(HttpStatus.NOT_FOUND, {
			grox: "c:t",
			msg: `'${prefix}' is not existed in bucket`,
		});
	}

	return c.json(ret.index, ret.getStatusCode(), ret.getHeaderRecords());
});

// retrive
app.get("/*", conditionalResponse);

app.get("/:key{.+}", async (c) => {
	const { key } = c.req.param();

	const ret = await r2_retrive(c.env.R2_BACKUP, key, { headers: c.req.raw.headers });
	if (!ret) {
		throw new LogicalError(HttpStatus.NOT_FOUND, {
			grox: "c:r",
			msg: `'${key}' is not existed in bucket`,
		});
	}

	if (!ret.body) {
		return c.body(null, HttpStatus.NOT_MODIFIED, ret.getHeaderRecords());
	}
	return c.body(ret.body, ret.getStatusCode(), ret.getHeaderRecords());
});

// auth
app.use(cfztAuth());

// upload
app.put("/:key{.+}", async (c) => {
	const { key } = c.req.param();
	const sha256 = c.req.header(H.SHA256_HEADER);

	const ret = await r2_upload(c.env.R2_CUBE, key, c.req.raw.body, {
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

	const ret = await r2_delete(c.env.R2_CUBE, data);

	return c.text(ret, HttpStatus.OK);
});

app.delete("/:key{.+}", async (c) => {
	const { key } = c.req.param();

	const ret = await r2_delete(c.env.R2_CUBE, key);

	return c.text(ret, HttpStatus.OK);
});

export default app;
