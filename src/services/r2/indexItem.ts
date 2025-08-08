import { encodeArrayBufferToBase64 } from "@/utils/base64ArrayBuffer";

export class IndexItem {
	readonly key: string;
	readonly size: number;
	readonly etag: string;
	readonly uploaded: number;
	readonly mime?: string;
	readonly ssecKeyMd5?: string;
	readonly sha256?: string;
	readonly metadata?: Record<string, string>;

	constructor(obj: R2Object) {
		this.key = obj.key;
		this.size = obj.size;
		this.etag = obj.etag;
		this.uploaded = obj.uploaded.getTime() / 1000;

		this.mime = obj.httpMetadata?.contentType;
		this.ssecKeyMd5 = obj.ssecKeyMd5;
		if (obj.checksums.sha256) {
			this.sha256 = encodeArrayBufferToBase64(obj.checksums.sha256);
		}
		this.metadata = obj.customMetadata;
	}
}
