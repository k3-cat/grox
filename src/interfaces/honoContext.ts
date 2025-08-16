import { Variables } from "./variables";

export interface HonoContext {
	Bindings: Cloudflare.Env;
	Variables: Variables;
}
