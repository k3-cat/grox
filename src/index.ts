import * as Sentry from "@sentry/cloudflare";
import { HttpStatus } from "http-enums";
import * as z from "zod/mini";

import { LogicalError } from "./errors";
import app from "./routers";

export default Sentry.withSentry(
	(env: Cloudflare.Env) => ({
		dsn: env.SENTRY_DSN,

		sendDefaultPii: true,
		enableLogs: true,
		tracesSampleRate: 1,

		integrations: [Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] })],
	}),
	app,
);

app.onError((err, c) => {
	const ray = c.req.header("Cf-Ray");

	if (err instanceof z.core.$ZodError) {
		Sentry.logger.error("e:* - zod validation failed", { err });
		err = new LogicalError(HttpStatus.INTERNAL_SERVER_ERROR, {
			grox: "e:*",
			msg: "invalid record",
			err: z.flattenError(err),
		});
	}

	if (err instanceof LogicalError) {
		const payload = err.payload;
		payload.ray = ray;
		if (!payload.msg) {
			payload.msg = HttpStatus[err.resInit.status];
		}

		return c.json(payload, err.resInit);
	}

	Sentry.captureException(err);
	return c.json(
		{
			ray: ray,
			grox: "e:*",
			msg: "unhandled error",
			err: err.message,
		},
		HttpStatus.INTERNAL_SERVER_ERROR,
	);
});
