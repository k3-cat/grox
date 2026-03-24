import * as Sentry from "@sentry/cloudflare";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { HttpStatus } from "http-enums";

import { H } from "../../definitions";
import { R2Metadata } from "./r2-metadata";

export class R2TreeRet {
	readonly cursor?: string;
	readonly index: R2Metadata[];

	constructor(ret: R2Objects) {
		this.cursor = ret.truncated ? ret.cursor : undefined;
		this.index = new Array(ret.objects.length);
		for (let i = 0; i < this.index.length; i++) {
			this.index[i] = new R2Metadata(ret.objects[i]);
		}
	}

	getHeaders(): Headers {
		const headers = new Headers();
		if (this.cursor) {
			Sentry.logger.debug("S:r2-tr - partial results");
			headers.set(H.CF_IS_TRUNCATED, "true");
			headers.set(H.CF_NEXT_CONTINUATION_TOKEN, this.cursor);
		}

		return headers;
	}

	getHeaderRecords(): Record<string, string> {
		return Object.fromEntries(this.getHeaders().entries());
	}

	getStatusCode(): ContentfulStatusCode {
		return this.cursor ? HttpStatus.PARTIAL_CONTENT : HttpStatus.OK;
	}
}
