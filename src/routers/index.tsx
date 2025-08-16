import { Hono } from "hono";
import { HttpStatus } from "http-enums";

import { P, S } from "@/definitions";
import { binding } from "@/middlewares/binding";
import { cfztAuth } from "@/middlewares/cfztAuth";
import { conditionalResponse } from "@/middlewares/conditionalResponse";
import { rangeable } from "@/middlewares/rangeable";
import { sentryTags } from "@/middlewares/sentryTags";
import { HonoContext } from "I/honoContext";

import BackupRouter from "./backup";
import CubeRouter from "./cube";
import StaticsRouter from "./statics";
import UpdateRouter from "./update";

const PATH_REGEX = new RegExp(`https?:/(/[a-z0-9]+)[^/]*(${P.STATIC_ASSETS_PERFIX})?(.*)$`, "gi");

export const app = new Hono<HonoContext>({
	getPath: (req) => req.url.replace(PATH_REGEX, "\$2\$1\$3").toLowerCase(),
});

app.use(`/*${P.ADMIN_PERFIX}/*`, cfztAuth());
app.use(sentryTags);
app.get("*", rangeable);
app.get("*", conditionalResponse);

app.route(P.STATIC_ASSETS_PERFIX, StaticsRouter);

// = = = = =
app.use(binding);

app.route(`/${S.Update}`, UpdateRouter);
app.route(`/${S.Cube}`, CubeRouter);
app.route(`/${S.Backup}`, BackupRouter);

// = = = = =
app.get("*", async (c) => {
	return c.text(`[grox] Cannot route this path: '${c.req.path}' (ray: ${c.req.header("Cf-Ray")})`, HttpStatus.NOT_FOUND);
});
