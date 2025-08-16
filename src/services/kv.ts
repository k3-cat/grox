export class KV {
	readonly name: string;
	private readonly ns: KVNamespace;

	constructor(name: string, ns: KVNamespace) {
		this.name = name;
		this.ns = ns;
	}

	async get(key: string, cacheTtl?: number) {
		return await this.ns.get(key, { cacheTtl });
	}

	async getKeys(keys: string[], cacheTtl?: number) {
		return await this.ns.get(keys, { cacheTtl });
	}

	async set(key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream, ttl?: number) {
		return await this.ns.put(key, value, {
			expirationTtl: ttl,
		});
	}

	async list(prefix: string, cursor?: string) {
		return await this.ns.list({
			prefix,
			cursor,
		});
	}

	async delete(key: string) {
		return await this.ns.delete(key);
	}
}
