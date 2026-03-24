import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HttpStatus } from "http-enums";

import { LogicalError } from "../errors";
import { cfztAuth } from "../middlewares/cfzt-auth";
import { EnvRecord } from "../schemas/env-record";
import { HonoCtx } from "../schemas/hono-ctx";

const CIP_ENV_PREFIX = "cip-env";

const app = new Hono<HonoCtx>();

// auth
app.use(cfztAuth());

// retrive
app.get("/:key{.+}", async (c) => {
	const { key } = c.req.param();

	const ret = await c.env.KV_GROX.get(`${CIP_ENV_PREFIX}:${key}`);
	if (!ret) {
		throw new LogicalError(HttpStatus.NOT_FOUND, {
			grox: "e:r",
			msg: `'${key}' is not existed in bucket`,
		});
	}

	return c.json(ret);
});

// upload
app.put("/:key{.+}", zValidator("json", EnvRecord), async (c) => {
	const { key } = c.req.param();
	const data = c.req.valid("json");

	await c.env.KV_GROX.put(`${CIP_ENV_PREFIX}:${key}`, JSON.stringify(data));

	return c.text(key, HttpStatus.CREATED);
});

app.delete("/:key{.+}", async (c) => {
	const { key } = c.req.param();

	await c.env.KV_GROX.delete(`${CIP_ENV_PREFIX}:${key}`);

	return c.text(key, HttpStatus.OK);
});

export default app;
