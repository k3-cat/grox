import { Responsible } from "I/responsible";
import { H } from "@/definitions";

export class GetRet implements Responsible {
	readonly headers: Headers;
	readonly object: R2ObjectBody;

	getContentRangeHeader(size: number, range: R2Range | undefined) {
		if (!range) {
			return null;
		}
		if ("suffix" in range) {
			return range.suffix === 0 ? null : `bytes ${size - range.suffix}-${size - 1}/${size}`;
		}
		if (range.length === undefined) {
			return range.offset === 0 ? null : `bytes ${range.offset}-${size - 1}/${size}`;
		}
		if (range.length === size) {
			return null;
		}
		const offset = range.offset ?? 0;
		return `bytes ${offset}-${offset + range.length - 1}/${size}`;
	}

	constructor(obj: R2ObjectBody, headers: Headers) {
		this.object = obj;
		this.headers = headers;
	}

	toResponse(): Response {
		if (!this.object.body) {
			return new Response(null, { headers: this.headers, status: 304 });
		}
		const contentRangeHeader = this.getContentRangeHeader(this.object.size, this.object.range);
		if (contentRangeHeader) {
			this.headers.set(H.CONTENT_RANGE, contentRangeHeader);
		}

		return new Response(this.object.body, { headers: this.headers, status: contentRangeHeader ? 206 : 200 });
	}
}
