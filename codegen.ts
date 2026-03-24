import { env } from "process";
import { CodegenConfig } from "@graphql-codegen/cli";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

type Env = {
	GITHUB_PAT: string;
};

const config: CodegenConfig = {
	schema: {
		"https://api.github.com/graphql": {
			headers: {
				"User-Agent": "grox",
				"Authorization": "Bearer " + (env as Env).GITHUB_PAT,
			},
		},
	},
	// this assumes that all your source files are in a top-level `src/` directory - you might need to adjust this to your file structure
	documents: ["src/**/*.{ts,tsx}"],
	ignoreNoDocuments: true,
	generates: {
		"./types/graphql.ts": {
			plugins: ["typescript", "typescript-operations"],
			config: {
				avoidOptionals: {
					// Use `null` for nullable fields instead of optionals
					field: true,
					// Allow nullable input fields to remain unspecified
					inputValue: false,
				},
				// Use `unknown` instead of `any` for unconfigured scalars
				defaultScalarType: "unknown",
				// Apollo Client always includes `__typename` fields
				nonOptionalTypename: true,
				// Apollo Client doesn't add the `__typename` field to root types so
				// don't generate a type for the `__typename` for root operation types.
				skipTypeNameForRoot: true,
			},
		},
	},
};

export default config;
