import * as Sentry from "@sentry/cloudflare";
import { createMiddleware } from "hono/factory";

import { HonoContext } from "I/honoContext";

export const sentryTags = createMiddleware<HonoContext>(async (c, next) => {
	const cf = c.req.raw.cf;
	if (cf) {
		Sentry.setTags({
			"ray": c.req.header("Cf-Ray"),
			"network.colo": cf.colo as string,
			"network.asn": cf.asn as number,
			"network.asOrganization": cf.asOrganization as string,
		});
		const cfzt = c.var.cfztPayload;
		Sentry.setUser({
			id: cfzt?.common_name ?? cfzt?.sub,
			ip_address: c.req.header("X-Real-Ip"),
			email: cfzt?.email,
			geo: {
				country_code: cf.country as string,
				region: cf.region as string,
				city: cf.city as string,
			},
		});
	}

	await next();
});
