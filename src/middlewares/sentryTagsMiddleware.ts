import * as Sentry from "@sentry/cloudflare";
import { createMiddleware } from "hono/factory";

import { HonoContext } from "@/interfaces/honoContext";

export const sentryTagsMiddleware = createMiddleware<HonoContext>(async (c, next) => {
	Sentry.setTag("ray", c.req.header("Cf-Ray"));
	Sentry.setUser({
		ip_address: c.req.header("X-Real-Ip"),
	});
	await next();
});
