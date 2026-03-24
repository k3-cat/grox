import { Buffer } from "node:buffer";

export class R2Metadata {
	readonly key: string;
	readonly size: number;
	readonly etag: string;
	readonly uploadAt: number;
	readonly mime?: string;
	readonly ssecKeyMd5?: string;
	readonly sha256?: string;
	readonly customItems?: Record<string, string>;

	constructor(obj: R2Object) {
		this.key = obj.key;
		this.size = obj.size;
		this.etag = obj.etag;
		this.uploadAt = obj.uploaded.getTime() / 1000;

		this.mime = obj.httpMetadata?.contentType;
		this.ssecKeyMd5 = obj.ssecKeyMd5;
		this.sha256 = obj.checksums.sha256 ? Buffer.from(obj.checksums.sha256).toString("hex") : undefined;
		this.customItems = obj.customMetadata;
	}
}
