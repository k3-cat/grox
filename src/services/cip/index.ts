import * as Sentry from "@sentry/cloudflare";
import { Context } from "hono";

import { HonoCtx } from "../../schemas/hono-ctx";
import { getGqlClient } from "../gql";
import { r2_delete, r2_retrive, r2_tree, r2_upload } from "../r2";
import { checkUpdates } from "./check-updates";
import { CipModuleRet } from "./cip-module-ret";
import { retriveCipModule } from "./retrive-cip-module";

const CIP_MODS_R2_PREFIX = "__cip_mods__";

export async function serveCipModule(c: Context<HonoCtx>, moduleName: string): Promise<CipModuleRet> {
	const gql = getGqlClient();

	const hasUpdate = await checkUpdates(c, gql);
	if (hasUpdate) {
		Sentry.logger.debug("S:c-sm - cmc");
		const cachedModsIndex = await r2_tree(c.env.R2_CUBE, CIP_MODS_R2_PREFIX);
		await r2_delete(
			c.env.R2_CUBE,
			cachedModsIndex.index.map((index) => index.key),
		);
	}

	let result: CipModuleRet;
	const key = `${CIP_MODS_R2_PREFIX}/${moduleName}`;
	const getRet = await r2_retrive(c.env.R2_CUBE, key);
	if (getRet) {
		const content = await getRet.getText();
		result = new CipModuleRet(getRet.getMetadata(), content!);
	} else {
		Sentry.logger.debug("S:c-sm - file is missing, lazy load and save it to r2");
		const content = await retriveCipModule(gql, moduleName);
		const index = await r2_upload(c.env.R2_CUBE, key, content);
		result = new CipModuleRet(index!, content);
	}

	return result;
}
