import * as Sentry from "@sentry/cloudflare";

import { H } from "@/definitions";
import { digestMessage } from "@/utils/digestMessage";

import { GetRet } from "./getRet";
import { Metadata } from "./metadata";
import { TreeRet } from "./treeRet";

export class R2 {
	readonly name: string;
	private readonly bucket: R2Bucket;

	constructor(name: string, bucket: R2Bucket) {
		this.name = name;
		this.bucket = bucket;
	}

	// -- tree --
	async tree(key: string, delimiter?: string, cursor?: string): Promise<TreeRet> {
		const ret = await this.bucket.list({
			prefix: key,
			delimiter,
			cursor,
			include: ["customMetadata", "httpMetadata"],
		});

		return new TreeRet(ret);
	}

	// -- retrive --
	async retrive(key: string, options?: { headers?: Headers; conditions?: R2Conditional; range?: R2Range }): Promise<GetRet | null> {
		const object = await this.bucket.get(key, {
			onlyIf: options?.conditions ?? options?.headers,
			range: options?.range ?? options?.headers,
			ssecKey: options?.headers?.get(H.SSEC_KEY) ?? undefined,
		});

		if (object === null) {
			return null;
		}
		return new GetRet(object);
	}

	// -- upload --
	async upload(
		key: string,
		data: ReadableStream | string | null,
		options?: { headers?: Headers; conditions?: R2Conditional; httpMetadata?: R2HTTPMetadata; sha256?: ArrayBuffer },
	): Promise<Metadata | null> {
		let sha256 = options?.sha256;
		let theData = data;
		if (!sha256) {
			if (data instanceof ReadableStream) {
				Sentry.logger.debug("SR2 - calculate sha256 for stream");
				const dataCopies = data.tee();
				const digestStream = new crypto.DigestStream("SHA-256");
				dataCopies[1].pipeTo(digestStream);
				sha256 = await digestStream.digest;
				theData = dataCopies[0];
			}
			// string
			else if (typeof data === "string") {
				Sentry.logger.debug("SR2 - calculate sha256 for string");
				sha256 = await digestMessage(data);
			}
		}

		const result = await this.bucket.put(key, theData, {
			onlyIf: options?.conditions ?? options?.headers,
			httpMetadata: options?.httpMetadata ?? options?.headers,
			ssecKey: options?.headers?.get(H.SSEC_KEY) ?? undefined,
			sha256,
		});

		if (result === null) {
			return null;
		}
		return new Metadata(result);
	}

	async initMultipartUpload(
		key: string,
		options?: { headers?: Headers; httpMetadata?: R2HTTPMetadata; sha256?: ArrayBuffer },
	): Promise<string> {
		const task = await this.bucket.createMultipartUpload(key, {
			httpMetadata: options?.httpMetadata ?? options?.headers,
			ssecKey: options?.headers?.get(H.SSEC_KEY) ?? undefined,
		});

		return task.uploadId;
	}

	async uploadPart(
		key: string,
		upId: string,
		partNum: number,
		data: ReadableStream,
		options?: { headers?: Headers },
	): Promise<R2UploadedPart> {
		const task = this.bucket.resumeMultipartUpload(key, upId);
		const result = await task.uploadPart(partNum, data, {
			ssecKey: options?.headers?.get(H.SSEC_KEY) ?? undefined,
		});

		return result;
	}

	async finalizeMultipartUpload(key: string, upId: string, parts: R2UploadedPart[]): Promise<Metadata> {
		const task = this.bucket.resumeMultipartUpload(key, upId);
		const result = await task.complete(parts);

		return new Metadata(result);
	}

	// -- delete --
	async delete(key: string | string[]): Promise<string> {
		await this.bucket.delete(key);

		if (key instanceof Array) {
			return key.join("\n");
		}
		return key;
	}
}
