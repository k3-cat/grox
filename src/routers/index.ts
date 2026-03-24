import { Hono } from "hono";
import { HttpResponseHeader, HttpStatus } from "http-enums";

import { LogicalError } from "../errors";
import { sentryTags } from "../middlewares/sentry-tags";
import { HonoCtx } from "../schemas/hono-ctx";
import bakRoute from "./bak";
import cipRoute from "./cip";
import cubeRoute from "./cube";
import envRoute from "./env";
import pkiRoute from "./pki";

const app = new Hono<HonoCtx>();

app.use("/*", sentryTags);

app.route("/bak", bakRoute);
app.route("/cip", cipRoute);
app.route("/cube", cubeRoute);
app.route("/env", envRoute);
app.route("/pki", pkiRoute);

app.get("*", async (c) => {
	c.header(HttpResponseHeader.CACHE_CONTROL, "public, max-age=864000, immutable");
	throw new LogicalError(HttpStatus.NOT_FOUND, { grox: "r:*", path: c.req.path });
});

export default app;
