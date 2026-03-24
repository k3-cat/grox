import { Buffer } from "node:buffer";
import * as Sentry from "@sentry/cloudflare";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { HttpResponseHeader, HttpStatus } from "http-enums";

import { H } from "../../definitions";
import { LogicalError } from "../../errors";
import { R2Metadata } from "./r2-metadata";

export class R2GetRet {
	readonly isPartial: boolean;
	readonly offset: number;
	readonly length: number;
	readonly body?: ReadableStream;
	private readonly obj: R2ObjectBody | R2Object;

	constructor(obj: R2ObjectBody | R2Object) {
		this.obj = obj;
		if ("body" in obj) {
			this.body = obj.body;
		}

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
				throw new LogicalError(HttpStatus.INTERNAL_SERVER_ERROR, {
					grox: "S:r2-GetRet",
					msg: "unexpected 'r2range' format",
					r2range: obj.range,
				});
			}
			this.isPartial = !(this.length === size);
		}
	}

	getMetadata() {
		return new R2Metadata(this.obj);
	}

	async getText() {
		if ("body" in this.obj) {
			return await this.obj.text();
		}
		return undefined;
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
			.map(([key, value]) => `${key}=:${Buffer.from(value).toString("base64")}:`);
		headers.set(H.CONTENT_DIGEST, digest.join(","));
		if (this.isPartial) {
			Sentry.logger.debug(Sentry.logger.fmt`S:r2-gr - partial content (${this.offset}+${this.length}/${this.obj.size})`);
			headers.set(
				HttpResponseHeader.CONTENT_RANGE,
				`bytes ${this.offset}-${this.offset + this.length - 1}/${this.obj.size}`,
			);
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
