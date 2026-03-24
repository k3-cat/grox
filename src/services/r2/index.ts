import * as Sentry from "@sentry/cloudflare";

import { H } from "../../definitions";
import { digestMessage } from "../../utils/digest-message";
import { R2GetRet } from "./r2-get-ret";
import { R2Metadata } from "./r2-metadata";
import { R2TreeRet } from "./r2-tree-ret";

// -- tree --
export async function r2_tree(bucket: R2Bucket, key: string, delimiter?: string, cursor?: string): Promise<R2TreeRet> {
	const ret = await bucket.list({
		prefix: key,
		delimiter,
		cursor,
		include: ["customMetadata", "httpMetadata"],
	});

	return new R2TreeRet(ret);
}

// -- retrive --
export async function r2_retrive(
	bucket: R2Bucket,
	key: string,
	options?: { headers?: Headers; conditions?: R2Conditional; range?: R2Range },
): Promise<R2GetRet | null> {
	const object = await bucket.get(key, {
		onlyIf: options?.conditions ?? options?.headers,
		range: options?.range ?? options?.headers,
		ssecKey: options?.headers?.get(H.SSEC_KEY) ?? undefined,
	});

	if (object === null) {
		return null;
	}
	return new R2GetRet(object);
}

// -- upload --
export async function r2_upload(
	bucket: R2Bucket,
	key: string,
	data: ReadableStream | string | null,
	options?: { headers?: Headers; conditions?: R2Conditional; httpMetadata?: R2HTTPMetadata; sha256?: ArrayBuffer },
): Promise<R2Metadata | null> {
	let sha256 = options?.sha256;
	let theData = data;
	if (!sha256) {
		if (data instanceof ReadableStream) {
			Sentry.logger.debug("S:r2 - calculate sha256 for stream");
			const dataCopies = data.tee();
			const digestStream = new crypto.DigestStream("SHA-256");
			dataCopies[1].pipeTo(digestStream);
			sha256 = await digestStream.digest;
			theData = dataCopies[0];
		}
		// string
		else if (typeof data === "string") {
			Sentry.logger.debug("S:r2 - calculate sha256 for string");
			sha256 = await digestMessage(data);
		}
	}

	const result = await bucket.put(key, theData, {
		onlyIf: options?.conditions ?? options?.headers,
		httpMetadata: options?.httpMetadata ?? options?.headers,
		ssecKey: options?.headers?.get(H.SSEC_KEY) ?? undefined,
		sha256,
	});

	if (result === null) {
		return null;
	}
	return new R2Metadata(result);
}

export async function r2_initMultipartUpload(
	bucket: R2Bucket,
	key: string,
	options?: { headers?: Headers; httpMetadata?: R2HTTPMetadata; sha256: ArrayBuffer },
): Promise<string> {
	const task = await bucket.createMultipartUpload(key, {
		httpMetadata: options?.httpMetadata ?? options?.headers,
		ssecKey: options?.headers?.get(H.SSEC_KEY) ?? undefined,
	});

	return task.uploadId;
}

export async function r2_uploadPart(
	bucket: R2Bucket,
	key: string,
	mpuId: string,
	partNum: number,
	data: ReadableStream,
	options?: { headers?: Headers },
): Promise<R2UploadedPart> {
	const task = bucket.resumeMultipartUpload(key, mpuId);
	const result = await task.uploadPart(partNum, data, {
		ssecKey: options?.headers?.get(H.SSEC_KEY) ?? undefined,
	});

	return result;
}

export async function r2_finalizeMultipartUpload(
	bucket: R2Bucket,
	key: string,
	mpuId: string,
	parts: R2UploadedPart[],
): Promise<R2Metadata> {
	const task = bucket.resumeMultipartUpload(key, mpuId);
	const result = await task.complete(parts);

	return new R2Metadata(result);
}

// -- delete --
export async function r2_delete(bucket: R2Bucket, key: string | string[]): Promise<string> {
	await bucket.delete(key);

	if (key instanceof Array) {
		return key.join("\n");
	}
	return key;
}
