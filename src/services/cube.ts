import { Responsible } from "I/responsible";
import { Gql } from "I/variables";
import { FileContentQuery, FileContentQueryVariables, LastCommitOidQuery, LastCommitOidQueryVariables } from "@/../types/gql";
import { CubeConst } from "@/definitions";
import { ObjectNotFoundErr } from "@/errors";

import { FILE_CONTENT_GQL, LAST_COMMIT_OID_GQL } from "./github";
import { KV } from "./kv";
import { R2 } from "./r2";

class ModuleRet implements Responsible {
	readonly headers: Headers;
	readonly content: string;

	constructor(headers: Headers, content: string) {
		this.headers = headers;
		this.content = content;
	}

	toResponse(): Response {
		return new Response(this.content, {
			headers: this.headers,
			status: 200,
		});
	}
}

const CUBE_MODS_R2_PREFIX = "__cube_mods__";
const COMMIT_ID_KEY = "cube:commit-oid";
const CHECKED_AT_KEY = "cube:checked-at";
const CACHE_INTERVIAL = 3600 * 4; // 4 hrs

async function checkUpdates(kv: KV, gql: Gql): Promise<boolean> {
	// if new enough, skip entire check
	const checked_at = await kv.get(CHECKED_AT_KEY);
	if (checked_at && Date.now() < Date.parse(checked_at) + CACHE_INTERVIAL) {
		return false;
	}

	// do the actual check
	const commitOidRes = await gql.query<LastCommitOidQuery, LastCommitOidQueryVariables>({
		query: LAST_COMMIT_OID_GQL,
		variables: { owner: CubeConst.K3_AT_GITHUB, repo: CubeConst.REPO_NAME },
	});
	if (commitOidRes.errors) {
		throw new Error(`Errors occurs when fetch latest commit id:\n${JSON.stringify(commitOidRes.errors)}`);
	}
	const branch = commitOidRes.data.repository?.defaultBranchRef;
	if (branch?.target?.__typename !== "Commit") {
		throw new Error(`Bad response when fetch latest commit id (typename: ${branch?.target?.__typename}).`);
	}

	// update the timestamp anyway
	await kv.put(CHECKED_AT_KEY, new Date().toISOString());

	// check (and update) if the recorded version matches the current one
	const recordedCommitId = await kv.get(COMMIT_ID_KEY);
	if (!recordedCommitId || recordedCommitId !== branch.target.oid) {
		await kv.put(COMMIT_ID_KEY, branch.target.oid);
		return true;
	}

	return false;
}

async function clearModuleCache(r2: R2) {
	const cachedModsIndex = await r2.tree(CUBE_MODS_R2_PREFIX);
	await r2.delete(cachedModsIndex.index.map((index) => index.key));
}

async function retriveModule(gql: Gql, moduleName: string): Promise<string | null> {
	const modContentRes = await gql.query<FileContentQuery, FileContentQueryVariables>({
		query: FILE_CONTENT_GQL,
		variables: {
			owner: CubeConst.K3_AT_GITHUB,
			repo: CubeConst.REPO_NAME,
			path: `HEAD:src/${moduleName}.py`,
		},
	});
	if (modContentRes.errors) {
		throw new Error(`Errors occurs when fetch module (${moduleName}) from github repo:\n${JSON.stringify(modContentRes.errors)}`);
	}
	const fileObj = modContentRes.data.repository?.object;
	if (!fileObj) {
		// specified file not exist
		return null;
	}
	if (fileObj.__typename !== "Blob") {
		throw new Error(`Bad response when fetch module (${moduleName}) from github repo (typename: ${fileObj.__typename}).`);
	}

	return fileObj.text ?? "--- [grox] upstream is null ---";
}

export async function serveModule(kv: KV, r2: R2, gql: Gql, host: string, moduleName: string): Promise<ModuleRet> {
	const hasUpdate = await checkUpdates(kv, gql);
	if (hasUpdate) {
		clearModuleCache(r2);
	}

	const key = `${CUBE_MODS_R2_PREFIX}/${moduleName}`;
	let res = await r2.get(key);
	// file is missing, lazy load it
	if (!res) {
		const rmRet = await retriveModule(gql, moduleName);
		if (!rmRet) {
			throw new ObjectNotFoundErr("CS-SM", `repo:'${CubeConst.K3_AT_GITHUB}/${CubeConst.REPO_NAME}'`, `path:'src/${moduleName}.py'`);
		}
		// save to cache
		await r2.upload(key, rmRet);
		res = (await r2.get(key))!;
	}

	let content = await res.object.text();
	content = content.replace(CubeConst.CUBE_HOSTNAME_PLACEHOLDER, host);
	return new ModuleRet(res.headers, content);
}
