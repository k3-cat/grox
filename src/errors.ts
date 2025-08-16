import { HTTPException } from "hono/http-exception";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { HttpStatus } from "http-enums";

import { ScC } from "./definitions";

export class RayableErr extends HTTPException {
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

// = = = = =
export class ExpectedErr extends RayableErr {}

// 400
export class BadRequestErr extends ExpectedErr {
	constructor(stage: string, msg: string) {
		super(HttpStatus.BAD_REQUEST, stage, msg);
	}
}
export class UnknownUploadIdErr extends BadRequestErr {
	constructor(stage: string, upId: string) {
		super(stage, `unknown upload id '${upId}'`);
	}
}
export class MissingPartIndexesErr extends BadRequestErr {
	constructor(stage: string) {
		super(stage, `missing index for uploaded parts`);
	}
}

// 401
export class UnauthorizedErr extends ExpectedErr {
	constructor(stage: string, msg: string) {
		super(HttpStatus.UNAUTHORIZED, stage, msg);
	}
}

// 404
export class NotFoundErr extends ExpectedErr {
	constructor(stage: string, msg: string) {
		super(HttpStatus.NOT_FOUND, stage, msg);
	}
}
export class ObjectNotFoundErr extends NotFoundErr {
	constructor(stage: string, bucket: string, key: string) {
		const msg = `object '${key}' cannot be found in bucket '${bucket}'`;
		super(stage, msg);
	}
}
export class ConfigNotFoundErr extends NotFoundErr {
	constructor(stage: string, subject: string, key: string) {
		super(stage, `config '${key}' cannot be found for subject '${subject}'`);
	}
}
export class ModuleContentNotFoundErr extends NotFoundErr {
	constructor(stage: string, path: string) {
		super(stage, `module '${path}' cannot be found in repo '${ScC.K3_AT_GITHUB}/${ScC.REPO_NAME}'`);
	}
}

// 412
export class ConditionFailedErr extends ExpectedErr {
	constructor(stage: string, bucket: string, key: string) {
		const msg = `prerequisites failed when update object '${key}' in bucket '${bucket}'`;
		super(HttpStatus.PRECONDITION_FAILED, stage, msg);
	}
}

// 416
export class RangeNotSatisfiableErr extends ExpectedErr {
	constructor(stage: string, range: string | null, length?: number) {
		const msg = `range '${range}' is not satisfiable` + (length ? ` (content length: ${length})` : "");
		super(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE, stage, msg);
	}
}

// 428
export class MeaninglessPrerequisitesErr extends ExpectedErr {
	constructor(stage: string) {
		const msg = `meaningless prerequisites`;
		super(HttpStatus.PRECONDITION_REQUIRED, stage, msg);
	}
}

// = = = = =
export class UnexpectedErr extends RayableErr {
	constructor(stage: string, msg: string) {
		super(HttpStatus.INTERNAL_SERVER_ERROR, stage, msg);
	}
}
