import { ContentfulStatusCode } from "hono/utils/http-status";

export abstract class Responsible {
	abstract getHeaders(): Headers;
	abstract getStatusCode(): ContentfulStatusCode;

	getHeaderRecords(): Record<string, string> {
		return Object.fromEntries(this.getHeaders().entries());
	}
}
