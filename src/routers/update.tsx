import { Hono } from "hono";
import { FC } from "hono/jsx";
import { cache } from "hono/cache";

import { HonoContext } from "I/honoContext";
import { ObjectNotFoundErr } from "@/errors";
import { Layout } from "C/layout";
import { CacheControl } from "@/definitions";

const app = new Hono<HonoContext>();

app.get(
	"*",
	cache({
		cacheName: "grox-update-get",
		cacheControl: CacheControl.Immutable,
	}),
);

// --- S1: initial req, to be redirect ---
app.get("/:sub", async (c) => {
	const { sub } = c.req.param();
	const ver = await c.var.kv.get(`${sub}:ver`);
	if (!ver) {
		throw new ObjectNotFoundErr("U-1-I", `kv:'${c.var.kv.name}'`, `subject:'${sub}'`);
	}

	return c.redirect(`/${sub}/tag/${ver}`);
});

// --- S1: redirect done, show the file list ---
const FilesMenu: FC<{ sub: string; ver: string; manifest: string[][] }> = (props) => {
	return (
		<Layout title={`Res Menu: ${props.sub}`}>
			<h1>{`${props.sub} (${props.ver})`}</h1>
			<div>
				{props.manifest.map((item) => (
					<p>
						<a href={`/${props.sub}/download/${props.ver}/${item[1]}`}>{item[0]}</a>
					</p>
				))}
			</div>
		</Layout>
	);
};

app.get("/:sub/tag/:ver", async (c) => {
	const { sub, ver } = c.req.param();
	const manifest = (await c.var.kv.get(`${sub}:manifest`))! // missing manifest is not expected
		.replaceAll("%{ver}%", ver)
		.split("\n")
		.map((line) => line.split(":"));

	return c.html(<FilesMenu sub={sub} ver={ver} manifest={manifest} />, 200);
});

// --- SD: download ---
app.get("/:sub/download/:ver/:name", async (c) => {
	const { sub, name } = c.req.param();
	const key = `${sub}/${name}`;
	const ret = await c.var.r2.get(key, c.req.raw.headers);
	if (!ret) {
		throw new ObjectNotFoundErr("U-D", `r2:'${c.var.r2.name}'`, `file:'${key}'`);
	}

	return ret.toResponse();
});

export default app;
