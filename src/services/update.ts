import * as Sentry from "@sentry/cloudflare";

import { SuC } from "@/definitions";
import { ConfigNotFoundErr } from "@/errors";
import { hexToArrayBuffer } from "@/utils/hexArrayBuffer";

import { KV } from "./kv";
import { R2 } from "./r2";

const MIME_MAP = new Map<string | undefined, string>([
	["7z", "application/x-7z-compressed"],
	["apk", "application/vnd.android.package-archive"],
	["dmg", "application/x-apple-diskimage"],
	["exe", "application/vnd.microsoft.portable-executable"],
	["msi", "application/x-ms-installer"],
	["zip", "application/zip"],
]);

const TEMP_TTL = 3600;
const ALMOST_IMMUTABLE_TTL = 86400;

function detectMimeFromName(name: string) {
	return MIME_MAP.get(name.split(".").pop()) ?? "application/octet-stream";
}

export class Subject {
	readonly kv: KV;
	readonly sub: string;
	private readonly verKey: string;
	private readonly manifestPrefix: string;

	constructor(kv: KV, sub: string) {
		this.kv = kv;
		this.sub = sub;
		this.verKey = `${this.sub}:ver`;
		this.manifestPrefix = `${this.sub}:m:`;
	}

	async getVer() {
		return await this.kv.get(this.verKey, TEMP_TTL);
	}

	async setVer(ver: string) {
		return await this.kv.set(this.verKey, ver);
	}

	async getManifest() {
		const index = await this.kv.list(this.manifestPrefix);
		return await this.kv.getKeys(
			index.keys.map((item) => item.name),
			ALMOST_IMMUTABLE_TTL,
		);
	}

	async getManifestItemFor(platfrom: string) {
		return await this.kv.get(`${this.manifestPrefix}${platfrom}`, ALMOST_IMMUTABLE_TTL);
	}

	async getKeyOfLatestResourceFor(platfrom: string) {
		const ver = await this.getVer();
		const name = await this.getManifestItemFor(platfrom);
		if (!ver) {
			throw new ConfigNotFoundErr("SU-LRK", this.sub, "ver");
		}
		if (!name) {
			throw new ConfigNotFoundErr("SU-LRK", this.sub, `platfrom: ${platfrom}`);
		}

		return `${this.sub}/${name.replace(SuC.VERSION_PLACEHOLDER, ver)}`;
	}

	async fetchResources(r2: R2, ver: string, tag: string) {
		const endpoint = await this.kv.get(`${this.sub}:endpoint`, ALMOST_IMMUTABLE_TTL);
		if (!endpoint) {
			throw new ConfigNotFoundErr("SU-FR", this.sub, "endpoint");
		}
		const manifest = await this.getManifest();
		const result = await Promise.all(
			manifest.entries().map(async ([platfrom, nameTemplate]) => {
				const name = nameTemplate?.replace(SuC.VERSION_PLACEHOLDER, ver);
				if (!name) {
					Sentry.logger.error("missing manifest");
					return `!!! missing manifest item for '${platfrom}' !!!`;
				}
				const key = `${this.sub}/${name}`;
				const url = `${endpoint}/${tag}/${name}`;
				const fetchRes = await fetch(url, { redirect: "follow" });
				const uploadRet = await r2.upload(key, fetchRes.body, {
					httpMetadata: { contentType: detectMimeFromName(name) },
				});

				return uploadRet!;
			}),
		);

		await this.setVer(ver);

		return result;
	}

	async uploadResource(r2: R2, ver: string, platfrom: string, data: ReadableStream | null, options?: { mime?: string; sha256?: string }) {
		const name = (await this.getManifestItemFor(platfrom))?.replace(SuC.VERSION_PLACEHOLDER, ver);
		if (!name) {
			throw new ConfigNotFoundErr("SU-UR", this.sub, `platfrom: ${platfrom}`);
		}
		const key = `${this.sub}/${name}`;
		const ret = await r2.upload(key, data, {
			httpMetadata: { contentType: options?.mime ?? detectMimeFromName(name) },
			sha256: options?.sha256 ? hexToArrayBuffer(options.sha256) : undefined,
		});

		return ret!;
	}
}
