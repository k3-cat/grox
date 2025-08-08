import { Responsible } from "I/responsible";

export class HeadRet implements Responsible {
	readonly headers: Headers;

	constructor(headers: Headers) {
		this.headers = headers;
	}

	toResponse(): Response {
		return new Response(null, { headers: this.headers, status: 200 });
	}
}
