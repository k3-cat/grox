import { CfztJwtPayload } from "./cfzt-jwt-payload";

export interface HonoVars {
	readonly cfztJwt?: CfztJwtPayload;
}

export type HonoCtx = {
	Bindings: Cloudflare.Env;
	Variables: HonoVars;
};
