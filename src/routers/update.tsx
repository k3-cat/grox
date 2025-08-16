import { Hono } from "hono";
import { cache } from "hono/cache";
import { FC } from "hono/jsx";
import { HttpRequestHeader, HttpStatus } from "http-enums";

import { CacheControl, H, P, SuC } from "@/definitions";
import { ConfigNotFoundErr, UnexpectedErr } from "@/errors";
import { HonoContext } from "I/honoContext";
import { Subject } from "S/update";

import { Layout } from "C/layout";

const app = new Hono<HonoContext>();

const SUBJECT_PATTERN = "/:sub{[a-z0-9-]+}";
const VERSION_PATTERN = "/:ver{[0-9]+\\.[0-9]+\\.[0-9]+(-[a-z0-9.]+)?}";

// = = = admin region = = =
app.post(`${P.ADMIN_PERFIX}/fetch${SUBJECT_PATTERN}/`, async (c) => {
	const { sub } = c.req.param();
	const subject = new Subject(c.var.kv, sub);

	const info = (await c.req.text()).split(";");
	const ver = info[0];
	const tag = info[1] ?? info[0];
	const result = await subject.fetchResources(c.var.r2, ver, tag);

	return c.json(result, HttpStatus.CREATED);
});

app.put(`${P.ADMIN_PERFIX}${SUBJECT_PATTERN}${VERSION_PATTERN}/:platfrom`, async (c) => {
	const { sub, ver, platfrom } = c.req.param();
	const subject = new Subject(c.var.kv, sub);

	const mime = c.req.header(HttpRequestHeader.CONTENT_TYPE);
	const result = await subject.uploadResource(c.var.r2, ver, platfrom, c.req.raw.body, {
		mime: mime !== "application/octet-stream" ? mime : undefined,
		sha256: c.req.header(H.SHA256_HEADER),
	});

	return c.json(result, HttpStatus.CREATED);
});

// = = = shortcuts for scripts = = =
app.get(
	`${SuC.SCRIPT_API_PATH_PREFIX}${SUBJECT_PATTERN}/ver`,
	cache({
		cacheName: "grox-u-x:ver",
		cacheControl: CacheControl.LongerTemp,
	}),
	async (c) => {
		const { sub } = c.req.param();
		const subject = new Subject(c.var.kv, sub);

		const ver = await subject.getVer();
		if (!ver) {
			throw new ConfigNotFoundErr("U-X-V", sub, "ver");
		}

		return c.text(ver);
	},
);

app.get(
	`${SuC.SCRIPT_API_PATH_PREFIX}${SUBJECT_PATTERN}/:platfrom`,
	cache({
		cacheName: "grox-u-x:dld",
		cacheControl: CacheControl.LongerTemp,
	}),
	async (c) => {
		const { sub, platfrom } = c.req.param();
		const subject = new Subject(c.var.kv, sub);

		const key = await subject.getKeyOfLatestResourceFor(platfrom);
		const ret = await c.var.r2.retrive(key, { headers: c.req.raw.headers });
		if (!ret) {
			throw new UnexpectedErr("U-X-D", `'${key}' is missing from bucket '${c.var.r2.name}'`);
		}

		if (ret.isNotModified) {
			return c.body(null, HttpStatus.NOT_MODIFIED, ret.getHeaderRecords());
		}
		return c.body(ret.obj.body, ret.getStatusCode(), ret.getHeaderRecords());
	},
);

// = = = provide github-style releases = = =

// --- S1(I): initial req, to be redirect ---
app.get(
	SUBJECT_PATTERN,
	cache({
		cacheName: "grox-u-1i",
		cacheControl: CacheControl.LongerTemp,
		cacheableStatusCodes: [HttpStatus.TEMPORARY_REDIRECT, HttpStatus.FOUND, HttpStatus.PERMANENT_REDIRECT, HttpStatus.MOVED_PERMANENTLY],
	}),
	async (c) => {
		const { sub } = c.req.param();
		const subject = new Subject(c.var.kv, sub);

		const ver = await subject.getVer();
		if (!ver) {
			throw new ConfigNotFoundErr("U-1I", sub, "ver");
		}

		return c.redirect(`/${sub}/tag/${ver}`);
	},
);

// --- S1(F): redirect done, show the file list ---
const ResourcesMenu: FC<{ sub: string; ver: string; manifest: [string, string][] }> = (props) => {
	return (
		<Layout title={`Resource Menu: ${props.sub}`}>
			<h1>{`${props.sub} (${props.ver})`}</h1>
			<div>
				{props.manifest.map(([platform, url]) => (
					<p>
						<a href={url}>{platform}</a>
					</p>
				))}
			</div>
		</Layout>
	);
};

app.get(
	`${SUBJECT_PATTERN}/tag${VERSION_PATTERN}`,
	cache({
		cacheName: "grox-u-1f",
		cacheControl: CacheControl.Immutable,
	}),
	async (c) => {
		const { sub, ver } = c.req.param();
		const subject = new Subject(c.var.kv, sub);

		const manifest = [...(await subject.getManifest())].map(([platform, name]): [string, string] => [
			platform.slice(sub.length + 3),
			`https://${c.env.PUBLIC_STATIC_DOMAIN}/${sub}/${name?.replace(SuC.VERSION_PLACEHOLDER, ver)}`,
		]);

		return c.html(<ResourcesMenu sub={sub} ver={ver} manifest={manifest} />, HttpStatus.OK);
	},
);

// --- S2: download ---
app.get(`${SUBJECT_PATTERN}/download${VERSION_PATTERN}/:name`, async (c) => {
	// sub-folder is not allowed for this service, so no escape
	const { sub, name } = c.req.param();

	return c.redirect(`https://${c.env.PUBLIC_STATIC_DOMAIN}/${sub}/${name}`, HttpStatus.MOVED_PERMANENTLY);
});

export default app;
