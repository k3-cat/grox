import * as Sentry from "@sentry/cloudflare";

import { FileContentQuery, FileContentQueryVariables, LastCommitOidQuery, LastCommitOidQueryVariables } from "@/../types/gql";
import { ScC } from "@/definitions";
import { ModuleContentNotFoundErr, UnexpectedErr } from "@/errors";
import { Gql } from "I/variables";

import { FILE_CONTENT_GQL, LAST_COMMIT_OID_GQL } from "../github";
import { KV } from "../kv";
import { R2 } from "../r2";
import { Metadata } from "../r2/metadata";
import { ModuleRet } from "./moduleRet";

const CUBE_MODS_R2_PREFIX = "__cube_mods__";
const COMMIT_ID_KEY = "cube:commit-oid";
const CHECKED_AT_KEY = "cube:checked-at";
const CACHE_INTERVIAL = 3600 * 4; // 4 hrs

async function checkUpdates(kv: KV, gql: Gql): Promise<boolean> {
	// if new enough, skip entire check
	const checked = await kv.get(CHECKED_AT_KEY, 1800);
	if (checked) {
		return false;
	}

	// do the actual check
	Sentry.logger.debug("SC - check update");
	const commitOidRes = await gql.query<LastCommitOidQuery, LastCommitOidQueryVariables>({
		query: LAST_COMMIT_OID_GQL,
		variables: { owner: ScC.K3_AT_GITHUB, repo: ScC.REPO_NAME },
	});
	if (commitOidRes.errors) {
		throw new UnexpectedErr("CS-CU", `errors occurs when fetching latest commit id:\n${JSON.stringify(commitOidRes.errors)}`);
	}
	const branch = commitOidRes.data.repository?.defaultBranchRef;
	if (branch?.target?.__typename !== "Commit") {
		throw new UnexpectedErr("CS-CU", `invalid typename '${branch?.target?.__typename}'`);
	}

	// update the timestamp anyway
	await kv.set(CHECKED_AT_KEY, new Date().toISOString(), CACHE_INTERVIAL);

	// check (and update) if the recorded version matches the current one
	const recordedCommitId = await kv.get(COMMIT_ID_KEY);
	if (!recordedCommitId || recordedCommitId !== branch.target.oid) {
		Sentry.logger.debug(Sentry.logger.fmt`SC - updated to commit: '${branch.target.oid}'`);
		await kv.set(COMMIT_ID_KEY, branch.target.oid);

		return true;
	}

	return false;
}

async function clearModuleCache(r2: R2) {
	Sentry.logger.debug("CS-CMC");
	const cachedModsIndex = await r2.tree(CUBE_MODS_R2_PREFIX);
	await r2.delete(cachedModsIndex.index.map((index) => index.key));
}

async function retriveModule(gql: Gql, moduleName: string): Promise<string> {
	const path = `HEAD:src/${moduleName}.py`;
	const modContentRes = await gql.query<FileContentQuery, FileContentQueryVariables>({
		query: FILE_CONTENT_GQL,
		variables: {
			owner: ScC.K3_AT_GITHUB,
			repo: ScC.REPO_NAME,
			path,
		},
	});
	if (modContentRes.errors) {
		throw new UnexpectedErr("CS-RM", `errors occurs when fetching module '${moduleName}':\n${JSON.stringify(modContentRes.errors)}`);
	}
	const fileObj = modContentRes.data.repository?.object;
	if (!fileObj) {
		throw new ModuleContentNotFoundErr("CS-RM", path);
	}
	if (fileObj.__typename !== "Blob") {
		throw new UnexpectedErr("CS-RM", `invalid typename '${fileObj.__typename}' when fetching module '${moduleName}'`);
	}
	if (!fileObj.text) {
		throw new UnexpectedErr("CS-RM", `the upstream of module '${moduleName}' is null`);
	}

	return fileObj.text;
}

export async function serveModule(kv: KV, r2: R2, gql: Gql, moduleName: string): Promise<ModuleRet> {
	const hasUpdate = await checkUpdates(kv, gql);
	if (hasUpdate) {
		clearModuleCache(r2);
	}

	let result: ModuleRet;
	const key = `${CUBE_MODS_R2_PREFIX}/${moduleName}`;
	const getRet = await r2.retrive(key);
	if (getRet) {
		const content = await getRet.obj.text();
		result = new ModuleRet(new Metadata(getRet.obj), content);
	} else {
		Sentry.logger.debug("CS-SM - file is missing, lazy load and save it to r2");
		const content = await retriveModule(gql, moduleName);
		const index = await r2.upload(key, content);
		result = new ModuleRet(index!, content);
	}

	return result;
}
