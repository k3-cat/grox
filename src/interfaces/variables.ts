import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";

import { KV } from "S/kv";
import { R2 } from "S/r2";

export type Gql = ApolloClient<NormalizedCacheObject>;

export type CloudflareZeroTrustPayload = {
	type: string;
	iat: number;
	exp: number;
	iss: string;
	sub: string;
	aud: string;
	device_id?: string;
	email?: string;
	common_name?: string;
};

export interface Variables {
	readonly r2: R2;
	readonly kv: KV;
	readonly gql: Gql;
	readonly cfztPayload?: CloudflareZeroTrustPayload;
}
