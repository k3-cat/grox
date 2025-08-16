import * as Sentry from "@sentry/cloudflare";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { HttpStatus } from "http-enums";

import { H } from "@/definitions";
import { Responsible } from "I/responsible";

import { Metadata } from "./metadata";

export class TreeRet extends Responsible {
	readonly cursor?: string;
	readonly index: Metadata[];

	constructor(ret: R2Objects) {
		super();
		this.cursor = ret.truncated ? ret.cursor : undefined;
		this.index = new Array(ret.objects.length);
		for (let i = 0; i < this.index.length; i++) {
			this.index[i] = new Metadata(ret.objects[i]);
		}
	}

	getHeaders(): Headers {
		const headers = new Headers();
		if (this.cursor) {
			Sentry.logger.debug("SR2-TR - partial results");
			headers.set(H.CF_IS_TRUNCATED, "true");
			headers.set(H.CF_NEXT_CONTINUATION_TOKEN, this.cursor);
		}

		return headers;
	}

	getStatusCode(): ContentfulStatusCode {
		return this.cursor ? HttpStatus.PARTIAL_CONTENT : HttpStatus.OK;
	}
}
