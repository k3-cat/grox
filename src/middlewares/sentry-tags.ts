import * as Sentry from "@sentry/cloudflare";
import { createMiddleware } from "hono/factory";

import { HonoCtx } from "../schemas/hono-ctx";

export const sentryTags = createMiddleware<HonoCtx>(async (c, next) => {
	const cf = c.req.raw.cf;
	if (cf) {
		Sentry.setTags({
			"ray": c.req.header("Cf-Ray"),
			"network.colo": cf.colo as string,
			"network.city": cf.city as string,
			"network.asn": cf.asn as number,
			"network.asOrganization": cf.asOrganization as string,
		});

		const cfzt = c.var.cfztJwt;
		Sentry.setUser({
			id: cfzt?.common_name ?? cfzt?.sub,
			ip_address: c.req.header("X-Real-Ip"),
			email: cfzt?.email,
		});
	}

	await next();
});
