import * as Sentry from "@sentry/cloudflare";
import { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { HttpRequestHeader, HttpResponseHeader, HttpStatus } from "http-enums";

import { RangeNotSatisfiableErr } from "@/errors";
import { newSlicedStream } from "@/utils/slicedStream";
import { HonoContext } from "I/honoContext";

const RANGE_PATTERN = new RegExp("^bytes=([0-9]+)?-([0-9]+)?$", "mi");

function fixHeaders(c: Context<HonoContext, string>, start: number, end: number, newLength: number, length: number) {
	c.res.headers.delete(HttpResponseHeader.TRANSFER_ENCODING);
	c.header(HttpResponseHeader.CONTENT_LENGTH, newLength.toString());
	c.header(HttpResponseHeader.CONTENT_RANGE, `bytes ${start}-${end}/${length}`);
}

export const rangeable = createMiddleware<HonoContext>(async (c, next) => {
	const range = c.req.header(HttpRequestHeader.RANGE);

	await next();

	const resContentSize = c.res.headers.get(HttpResponseHeader.CONTENT_LENGTH);
	if (!range || !resContentSize || c.res.status !== HttpStatus.OK || c.res.headers.get(HttpResponseHeader.ACCEPT_RANGES) !== "bytes") {
		return;
	}

	const match = RANGE_PATTERN.exec(range);
	if (!match) {
		throw new RangeNotSatisfiableErr("MR-1", range);
	}

	const [_, startAt, endAt] = match;
	const size = parseInt(resContentSize);
	const start = startAt ? parseInt(startAt) : size - parseInt(endAt ?? "1");
	const end = startAt && endAt ? Math.min(size - 1, parseInt(endAt)) : size - 1;
	if (start >= end) {
		throw new RangeNotSatisfiableErr("MR-2", range, size);
	}

	const length = end - start + 1;
	if (length === size) {
		Sentry.logger.debug(Sentry.logger.fmt`MR - full length reached (${size}), fix headers only`);
		fixHeaders(c, start, end, size, size);
		return;
	}

	Sentry.logger.debug(Sentry.logger.fmt`MR - slice response (${start}-${end}/${size})`);
	const slicedStream = newSlicedStream(start, end);
	const fixedlengthStream = new FixedLengthStream(length);
	const res = c.res.clone();
	c.res = undefined;
	c.res = new Response(res.body!.pipeThrough(slicedStream).pipeThrough(fixedlengthStream), {
		status: HttpStatus.PARTIAL_CONTENT,
		headers: res.headers,
	});
	fixHeaders(c, start, end, length, size);
});
