import { ContentfulStatusCode } from "hono/utils/http-status";
import { HttpResponseHeader, HttpStatus } from "http-enums";

import { R2Metadata } from "../r2/r2-metadata";

export class CipModuleRet {
	readonly meta: R2Metadata;
	readonly content: string;

	constructor(index: R2Metadata, content: string) {
		this.meta = index;
		this.content = content;
	}

	getHeaders(): Headers {
		const headers = new Headers();
		headers.set(HttpResponseHeader.CONTENT_TYPE, "text/x-python; charset=UTF-8");
		headers.set(HttpResponseHeader.LAST_MODIFIED, new Date(this.meta.uploadAt * 1000).toUTCString());
		headers.set(HttpResponseHeader.ETAG, `"${this.meta.etag}"`);

		return headers;
	}

	getHeaderRecords(): Record<string, string> {
		return Object.fromEntries(this.getHeaders().entries());
	}

	getStatusCode(): ContentfulStatusCode {
		return HttpStatus.OK;
	}
}
