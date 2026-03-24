import { ApolloClient } from "@apollo/client";
import { HttpStatus } from "http-enums";

import { FileContentQuery, FileContentQueryVariables } from "../../../types/graphql";
import { LogicalError } from "../../errors";
import { FILE_CONTENT_GQL } from "../github-gql";

const CIP_MODS_SOURCE_PATH = "src/cip_mods";

export async function retriveCipModule(gql: ApolloClient, moduleName: string): Promise<string> {
	const path = `HEAD:${CIP_MODS_SOURCE_PATH}/${moduleName}.py`;
	const repoInfo = process.env.CIP_REPO.split("/");

	const modContentRes = await gql.query<FileContentQuery, FileContentQueryVariables>({
		query: FILE_CONTENT_GQL,
		variables: {
			owner: repoInfo[0],
			repo: repoInfo[1],
			path,
		},
	});
	if (!modContentRes.data) {
		throw new LogicalError(HttpStatus.INTERNAL_SERVER_ERROR, {
			grox: "S:c-rm",
			msg: `errors occurs when fetching module '${moduleName}'`,
			err: modContentRes.error,
		});
	}

	const fileObj = modContentRes.data.repository?.object;
	if (!fileObj) {
		throw new LogicalError(HttpStatus.NOT_FOUND, {
			grox: "S:c-rm",
			msg: `module '${path}' cannot be found in repo '${process.env.CIP_REPO}'`,
		});
	}
	if (fileObj.__typename !== "Blob") {
		throw new LogicalError(HttpStatus.NOT_FOUND, {
			grox: "S:c-rm",
			msg: `invalid typename '${fileObj.__typename}' when fetching module '${moduleName}'`,
		});
	}
	if (!fileObj.text) {
		throw new LogicalError(HttpStatus.NOT_FOUND, {
			grox: "S:c-rm",
			msg: `the upstream of module '${moduleName}' is null`,
		});
	}

	return fileObj.text;
}
