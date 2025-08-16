import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import { createMiddleware } from "hono/factory";

import { S } from "@/definitions";
import { HonoContext } from "I/honoContext";
import { KV } from "S/kv";
import { R2 } from "S/r2";

const enum R2Enum {
	Cube = "R2_CUBE",
	Static = "R2_STATIC",
	Backup = "R2_BACKUP",
}

const enum KvEnum {
	Auth = "KV_AUTH",
	Update = "KV_UPDATE",
	Cube = "KV_CUBE",
}

const R2Map = {
	[S.Update]: R2Enum.Static,
	[S.Cube]: R2Enum.Cube,
	[S.Backup]: R2Enum.Backup,
};

const KvMap = {
	[S.Update]: KvEnum.Update,
	[S.Cube]: KvEnum.Cube,
	[S.Backup]: KvEnum.Cube,
};

export const binding = createMiddleware<HonoContext>(async (c, next) => {
	const service = new URL(c.req.url).host.split(".")[0].toLowerCase() as S;
	const r2Sel = R2Map[service];
	const kvSel = KvMap[service];

	c.set("r2", new R2(r2Sel.slice(3), c.env[r2Sel]));
	c.set("kv", new KV(kvSel.slice(3), c.env[kvSel]));
	c.set(
		"gql",
		new ApolloClient({
			uri: "https://api.github.com/graphql",
			headers: {
				Authorization: "Bearer " + c.env.GITHUB_PAT,
			},
			cache: new InMemoryCache(),
		}),
	);

	await next();
});
