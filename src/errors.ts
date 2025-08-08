import { HTTPException } from "hono/http-exception";
import { ContentfulStatusCode } from "hono/utils/http-status";

export class BaseErr extends HTTPException {
	constructor(code: ContentfulStatusCode, stage: string, msg: string) {
		const message = `[grox,${stage}] ${msg}.`;
		super(code, { message });
	}

	setRay(ray?: string) {
		if (!ray) {
			return;
		}
		this.message += ` (ray: ${ray})`;
	}
}

export class BadRequestErr extends BaseErr {
	constructor(stage: string, msg: string) {
		super(400, stage, msg);
	}
}
export class UnknownUploadIdErr extends BadRequestErr {
	constructor(stage: string, upId: string) {
		super(stage, `unknown upload id: ${upId}`);
	}
}
export class MissingPartIndexesErr extends BadRequestErr {
	constructor(stage: string) {
		super(stage, `missing the index for uploaded parts`);
	}
}

export class ObjectNotFoundErr extends BaseErr {
	constructor(stage: string, domain: string, target: string) {
		const msg = `${target} cannot be found within ${domain}`;
		super(404, stage, msg);
	}
}
