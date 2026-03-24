import { env } from "process";
import * as Sentry from "@sentry/cloudflare";
import { createMiddleware } from "hono/factory";
import { HttpStatus } from "http-enums";
import * as jose from "jose";
import { JOSEError } from "jose/errors";

import { LogicalError } from "../errors";
import { CfztJwtPayload } from "../schemas/cfzt-jwt-payload";
import { HonoCtx } from "../schemas/hono-ctx";

const ISS = `https://${env.CFZT_TEAM_NAME}.cloudflareaccess.com`;
const JWK_ENDPOINT = `${ISS}/cdn-cgi/access/certs`;

export const cfztAuth = () => {
	const JWKS = jose.createRemoteJWKSet(new URL(JWK_ENDPOINT));

	return createMiddleware<HonoCtx>(async (c, next) => {
		const token = c.req.header("Cf-Access-Jwt-Assertion");
		if (!token) {
			throw new LogicalError(HttpStatus.UNAUTHORIZED, { grox: "M:a" });
		}

		const cacheKey = token.slice(token.length - 128);
		if (!(await c.env.KV_AUTH.get(cacheKey, { cacheTtl: 3600 }))) {
			try {
				const jwt = await jose.jwtVerify<CfztJwtPayload>(token, JWKS, { issuer: ISS });
				c.set("cfztJwt", jwt.payload);
			} catch (err) {
				if (!(err instanceof JOSEError)) {
					throw err;
				}
				Sentry.logger.warn("M:a - failed to verify jwt", { err });
				throw new LogicalError(HttpStatus.UNAUTHORIZED, { grox: "M:a", msg: "invalid token" });
			}

			await c.env.KV_AUTH.put(cacheKey, new Date().toISOString(), { expiration: c.var.cfztJwt!.exp });
		}
		// cached
		else {
			c.set("cfztJwt", jose.decodeJwt<CfztJwtPayload>(token));
		}

		await next();

		return;
	});
};
