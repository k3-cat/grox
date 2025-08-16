import { ContentfulStatusCode } from "hono/utils/http-status";
import { HttpResponseHeader, HttpStatus } from "http-enums";

import { Responsible } from "I/responsible";

import { Metadata } from "../r2/metadata";

export class ModuleRet extends Responsible {
	readonly meta: Metadata;
	readonly content: string;

	constructor(index: Metadata, content: string) {
		super();
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

	getStatusCode(): ContentfulStatusCode {
		return HttpStatus.OK;
	}
}
