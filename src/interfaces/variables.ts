import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";

import { KV } from "S/kv";
import { R2 } from "@/services/r2";

export type Gql = ApolloClient<NormalizedCacheObject>;

export interface Variables {
	readonly r2: R2;
	readonly kv: KV;
	readonly gql: Gql;
}
