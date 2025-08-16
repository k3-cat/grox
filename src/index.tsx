import * as Sentry from "@sentry/cloudflare";
import { HTTPException } from "hono/http-exception";
import { HttpStatus } from "http-enums";

import { ExpectedErr, RayableErr } from "@/errors";
import { app } from "@/routers";

export default Sentry.withSentry(
	(_env: Cloudflare.Env) => ({
		dsn: "https://c1047433f85a89397132f086c1bb357a@o1427850.ingest.us.sentry.io/4509806365442048",

		sendDefaultPii: true,
		enableLogs: true,
		tracesSampleRate: 1.0,
	}),
	app,
);

app.onError((err, c) => {
	const ray = c.req.header("Cf-Ray");
	if (err instanceof RayableErr) {
		err.setRay(ray);
	}
	if (!(err instanceof ExpectedErr)) {
		Sentry.captureException(err);
	}
	if (err instanceof HTTPException) {
		return err.getResponse();
	}

	return c.json(
		{
			ray: ray,
			error: "[grox] Unhandled error.",
			message: err.message,
		},
		HttpStatus.INTERNAL_SERVER_ERROR,
	);
});
