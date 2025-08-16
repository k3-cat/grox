import * as Sentry from "@sentry/cloudflare";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { HttpResponseHeader, HttpStatus } from "http-enums";

import { H } from "@/definitions";
import { UnexpectedErr } from "@/errors";
import { encodeArrayBufferToBase64 } from "@/utils/base64ArrayBuffer";
import { Responsible } from "I/responsible";

export class GetRet implements Responsible {
	readonly isPartial: boolean;
	readonly isNotModified: boolean;
	readonly offset: number;
	readonly length: number;
	readonly obj: R2ObjectBody;

	constructor(obj: R2ObjectBody) {
		this.obj = obj;
		this.isNotModified = !obj.body;

		const size = obj.size;
		const range = obj.range;
		if (!range) {
			this.offset = 0;
			this.length = size;
			this.isPartial = false;
		} else {
			if ("suffix" in range) {
				this.offset = size - range.suffix;
				this.length = range.suffix;
			} else if (range.length !== undefined) {
				this.offset = range.offset ?? 0;
				this.length = range.length;
			} else if (range.offset !== undefined) {
				this.offset = range.offset;
				this.length = range.length ?? size - range.offset;
			} else {
				throw new UnexpectedErr("GetRet", "unexpected 'r2range' format: " + JSON.stringify(obj.range));
			}
			this.isPartial = !(this.length === size);
		}
	}

	getHeaders(): Headers {
		const headers = new Headers();
		this.obj.writeHttpMetadata(headers);
		headers.set(HttpResponseHeader.ACCEPT_RANGES, "bytes");
		headers.set(HttpResponseHeader.CONTENT_LENGTH, this.obj.size.toString());
		headers.set(HttpResponseHeader.CONTENT_DISPOSITION, `attachment; filename=${this.obj.key.split("/").pop()}`);
		headers.set(HttpResponseHeader.LAST_MODIFIED, this.obj.uploaded.toUTCString());
		headers.set(HttpResponseHeader.ETAG, this.obj.httpEtag);
		const digest = Object.entries(this.obj.checksums)
			.filter((item): item is [string, ArrayBuffer] => item[1] instanceof ArrayBuffer)
			.map(([key, value]) => `${key}=:${encodeArrayBufferToBase64(value)}:`);
		headers.set(H.CONTENT_DIGEST, digest.join(","));
		if (this.isPartial) {
			Sentry.logger.debug(Sentry.logger.fmt`SR2-GR - partial content (${this.offset}+${this.length}/${this.obj.size})`);
			headers.set(HttpResponseHeader.CONTENT_RANGE, `bytes ${this.offset}-${this.offset + this.length - 1}/${this.obj.size}`);
		}

		return headers;
	}

	getHeaderRecords(): Record<string, string> {
		return Object.fromEntries(this.getHeaders().entries());
	}

	getStatusCode(): ContentfulStatusCode {
		return this.isPartial ? HttpStatus.PARTIAL_CONTENT : HttpStatus.OK;
	}
}
