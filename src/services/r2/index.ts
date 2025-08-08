import { H } from "@/definitions";
import { decodeBase64ToArrayBuffer, encodeArrayBufferToBase64 } from "@/utils/base64ArrayBuffer";

import { GetRet } from "./getRet";
import { HeadRet } from "./headRet";
import { IndexItem } from "./indexItem";
import { TreeRet } from "./treeRet";

function setCommonHeaders(object: R2Object, headers: Headers) {
	object.writeHttpMetadata(headers);
	headers.set(H.CONTENT_LENGTH, object.size.toString());
	headers.set(H.LAST_MODIFIED, object.uploaded.toUTCString());
	headers.set("etag", object.httpEtag);
	headers.set(
		H.CONTENT_DIGEST,
		`sha-256=:${encodeArrayBufferToBase64(object.checksums.sha256)}:,md5=:${encodeArrayBufferToBase64(object.checksums.md5)}:`,
	);
}

export class R2 {
	readonly name: string;
	readonly bucket: R2Bucket;

	constructor(name: string, bucket: R2Bucket) {
		this.name = name;
		this.bucket = bucket;
	}

	// -- head --
	async head(key: string): Promise<HeadRet | null> {
		const object = await this.bucket.head(key);
		if (object === null) {
			return null;
		}

		const headers = new Headers();
		setCommonHeaders(object, headers);
		if (object.ssecKeyMd5) {
			headers.set("ssec-key-md5", object.ssecKeyMd5);
		}

		return new HeadRet(headers);
	}

	// -- tree --
	async tree(key: string, delimiter?: string, cursor?: string): Promise<TreeRet> {
		const ret = await this.bucket.list({
			prefix: key,
			delimiter,
			cursor,
			include: ["customMetadata", "httpMetadata"],
		});

		const headers = new Headers();
		headers.set(H.CONTENT_TYPE, "application/json; charset=UTF-8");
		if (ret.truncated) {
			headers.set("cf-is-truncated", "true");
			headers.set("cf-next-continuation-token", ret.cursor);
		}

		return new TreeRet(ret, headers);
	}

	// -- retrive --
	async get(key: string, headers?: Headers): Promise<GetRet | null> {
		const object = await this.bucket.get(key, {
			onlyIf: headers,
			range: headers,
			ssecKey: headers?.get(H.SSEC_KEY) ?? undefined,
		});
		if (object === null) {
			return null;
		}

		const resHeaders = new Headers();
		setCommonHeaders(object, resHeaders);

		return new GetRet(object, resHeaders);
	}

	// -- upload --
	async upload(key: string, data: ReadableStream | string, headers?: Headers): Promise<IndexItem> {
		const result = await this.bucket.put(key, data, {
			httpMetadata: headers,
			ssecKey: headers?.get(H.SSEC_KEY) ?? undefined,
		});

		return new IndexItem(result);
	}

	async initMultipartUpload(key: string, headers?: Headers): Promise<string> {
		const task = await this.bucket.createMultipartUpload(key, {
			httpMetadata: headers,
			ssecKey: headers?.get(H.SSEC_KEY) ?? undefined,
		});

		return task.uploadId;
	}

	async uploadPart(key: string, upId: string, partNum: number, data: ReadableStream): Promise<R2UploadedPart> {
		const task = this.bucket.resumeMultipartUpload(key, upId);
		const result = await task.uploadPart(partNum, data);

		return result;
	}

	async finalizeMultipartUpload(key: string, upId: string, parts: R2UploadedPart[]): Promise<Response> {
		const task = this.bucket.resumeMultipartUpload(key, upId);
		const result = await task.complete(parts);

		return new Response(`{"key":"${result.key}","etag":"${result.etag}"}`, { status: 200 });
	}

	// -- metadata --
	async setMetadata(key: string, headers: Headers): Promise<IndexItem> {
		let sha256;
		const hashEntries = headers!.get(H.CONTENT_DIGEST)?.toLowerCase().split(",");
		if (!hashEntries) {
			sha256 = undefined;
		} else {
			for (let i = 0; i < hashEntries.length; i++) {
				if (!hashEntries[i].startsWith("sha-256")) {
					continue;
				}
				sha256 = decodeBase64ToArrayBuffer(hashEntries[i].split(":")[1]);
			}
		}

		const result = await this.bucket.put(key, null, { sha256 });

		return new IndexItem(result);
	}

	// -- delete --
	async delete(key: string | string[]): Promise<string> {
		this.bucket.delete(key);
		if (key instanceof Array) {
			return key.join("\n");
		}

		return key;
	}
}
