export class KV {
	readonly name: string;
	readonly ns: KVNamespace;

	constructor(name: string, ns: KVNamespace) {
		this.name = name;
		this.ns = ns;
	}

	async get(key: string, options?: Partial<KVNamespaceGetOptions<undefined>>) {
		return await this.ns.get(key, options);
	}

	async put(key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream, options?: KVNamespacePutOptions) {
		return await this.ns.put(key, value, options);
	}
}
