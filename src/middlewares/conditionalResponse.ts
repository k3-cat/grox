import * as Sentry from "@sentry/cloudflare";
import { createMiddleware } from "hono/factory";
import { HttpRequestHeader, HttpResponseHeader, HttpStatus } from "http-enums";

import { MeaninglessPrerequisitesErr } from "@/errors";
import { HonoContext } from "@/interfaces/honoContext";

const RETAINED_304_HEADERS = [
	HttpResponseHeader.CACHE_CONTROL,
	HttpResponseHeader.CONTENT_LOCATION,
	HttpResponseHeader.DATE,
	HttpResponseHeader.ETAG,
	HttpResponseHeader.LAST_MODIFIED,
	HttpResponseHeader.EXPIRES,
	HttpResponseHeader.VARY,
];

const stripWeak = (tag: string) => tag.replace(/^W\//, "");
const etagMatches = (etag: string, ifHeader: string) => ifHeader.split(/,\s*/).some((t) => stripWeak(t) === stripWeak(etag));

class Condiction {
	readonly ifMatch: string | null;
	readonly ifNoneMatch: string | null;
	readonly ifModifiedSince: string | null;
	readonly ifUnmodifiedSince: string | null;

	constructor(headers: Headers) {
		this.ifMatch = headers.get(HttpRequestHeader.IF_MATCH);
		this.ifNoneMatch = headers.get(HttpRequestHeader.IF_NONE_MATCH);
		this.ifModifiedSince = headers.get(HttpRequestHeader.IF_MODIFIED_SINCE);
		this.ifUnmodifiedSince = headers.get(HttpRequestHeader.IF_UNMODIFIED_SINCE);

		if (this.ifMatch && this.ifNoneMatch) {
			throw new MeaninglessPrerequisitesErr("MCR");
		}
	}

	meetAllConditions(headers: Headers) {
		const etag = headers.get(HttpResponseHeader.ETAG);
		if (etag) {
			if (this.ifMatch && !etagMatches(etag, this.ifMatch)) {
				return false;
			}
			if (this.ifNoneMatch && etagMatches(etag, this.ifNoneMatch)) {
				return false;
			}
		}

		const lastModified = headers.get(HttpResponseHeader.LAST_MODIFIED);
		if (lastModified) {
			const modifiedAt = Date.parse(lastModified);
			if (this.ifModifiedSince && modifiedAt < Date.parse(this.ifModifiedSince)) {
				return false;
			}
			if (this.ifUnmodifiedSince && Date.parse(this.ifUnmodifiedSince) < modifiedAt) {
				return false;
			}
		}

		return true;
	}
}

const DESIRED_STATUS_CODES = new Set([HttpStatus.OK, HttpStatus.NOT_MODIFIED]);

export const conditionalResponse = createMiddleware<HonoContext>(async (c, next) => {
	const condition = new Condiction(c.req.raw.headers);

	await next();

	if (!DESIRED_STATUS_CODES.has(c.res.status) || condition.meetAllConditions(c.res.headers)) {
		return;
	}

	Sentry.logger.debug(Sentry.logger.fmt`MCR - trim upstream ${c.res.status} into new 304`);
	const headers = new Headers(
		RETAINED_304_HEADERS.entries()
			.map(([_, name]) => [name, c.res.headers.get(name)])
			.filter((item): item is [string, string] => item[1] !== null),
	);
	c.res = undefined;
	c.res = new Response(null, {
		status: HttpStatus.NOT_MODIFIED,
		headers,
	});
});
