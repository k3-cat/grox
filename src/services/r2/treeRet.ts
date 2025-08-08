import { Responsible } from "I/responsible";

import { IndexItem } from "./indexItem";

export class TreeRet implements Responsible {
	readonly headers: Headers;
	readonly isTruncated: boolean;
	readonly index: IndexItem[];

	constructor(ret: R2Objects, headers: Headers) {
		this.index = new Array(ret.objects.length);
		for (let i = 0; i < this.index.length; i++) {
			this.index[i] = new IndexItem(ret.objects[i]);
		}
		this.headers = headers;
		this.isTruncated = ret.truncated;
	}

	toResponse(): Response {
		return new Response(JSON.stringify(this.index), {
			headers: this.headers,
			status: this.isTruncated ? 206 : 200,
		});
	}
}
