import { ResponseHeader } from "hono/utils/headers";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { BaseMime } from "hono/utils/mime";

type ResponseHeadersInit =
	| [string, string][]
	| Record<"Content-Type", BaseMime>
	| Record<ResponseHeader, string>
	| Record<string, string>
	| Headers;

interface LogicalErrorPayload {
	grox: string;
	msg?: string;
	[key: string]: any;
}

export class LogicalError extends Error {
	payload: LogicalErrorPayload;
	resInit: {
		status: ContentfulStatusCode;
		headers?: ResponseHeadersInit;
	};

	constructor(status: ContentfulStatusCode, payload: LogicalErrorPayload, headers?: ResponseHeadersInit) {
		super();
		this.payload = payload;
		this.resInit = { status, headers };
	}
}
