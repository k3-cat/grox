import { CodegenConfig } from "@graphql-codegen/cli";

import "./.dev.vars";

import { env } from "process";

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
	generates: {
		"./src/__generated__/": {
			preset: "client",
			plugins: [],
			presetConfig: {
				gqlTagName: "gql",
			},
		},
		"./types/gql.d.ts": {
			plugins: ["typescript", "typescript-operations"],
		},
	},
};

export default config;
