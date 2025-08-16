import * as Sentry from "@sentry/cloudflare";
import { createMiddleware } from "hono/factory";
import * as jose from "jose";
import { JOSEError } from "jose/errors";

import { P } from "@/definitions";
import { UnauthorizedErr } from "@/errors";
import { CloudflareZeroTrustPayload } from "@/interfaces/variables";
import { HonoContext } from "I/honoContext";

const ISS = `https://${P.TEAM_NAME}.cloudflareaccess.com`;
const JWK_ENDPOINT = `${ISS}/cdn-cgi/access/certs`;

export const cfztAuth = () => {
	const JWKS = jose.createRemoteJWKSet(new URL(JWK_ENDPOINT));

	return createMiddleware<HonoContext>(async (c, next) => {
		const token = c.req.header("Cf-Access-Jwt-Assertion");
		if (!token) {
			throw new UnauthorizedErr("MZTA", "mssing token");
		}

		const cacheKey = token.slice(token.length - 128);
		if (!(await c.env.KV_AUTH.get(cacheKey, { cacheTtl: 3600 }))) {
			Sentry.logger.debug("MZTA - cache not found, verify jwt");
			try {
				const jwt = await jose.jwtVerify<CloudflareZeroTrustPayload>(token, JWKS, { issuer: ISS });
				c.set("cfztPayload", jwt.payload);
			} catch (err) {
				if (!(err instanceof JOSEError)) {
					throw err;
				}
				Sentry.logger.error(Sentry.logger.fmt`MZTA - jwt verify error: ${err.code}; ${err.message}`);
				throw new UnauthorizedErr("MZTA", "invalid token");
			}

			await c.env.KV_AUTH.put(cacheKey, new Date().toISOString(), { expiration: c.var.cfztPayload!.exp });
		}
		// cached
		else {
			c.set("cfztPayload", jose.decodeJwt<CloudflareZeroTrustPayload>(token));
		}

		await next();
	});
};
