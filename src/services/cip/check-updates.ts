import { ApolloClient } from "@apollo/client";
import * as Sentry from "@sentry/cloudflare";
import { Context } from "hono";
import { HttpStatus } from "http-enums";

import { LastCommitOidQuery, LastCommitOidQueryVariables } from "../../../types/graphql";
import { LogicalError } from "../../errors";
import { HonoCtx } from "../../schemas/hono-ctx";
import { LAST_COMMIT_OID_GQL } from "../github-gql";

const COMMIT_ID_KEY = "cip:commit-oid";
const CHECKED_AT_KEY = "cip:checked-at";
const CACHE_INTERVIAL = 3600 * 4; // 4 hrs

export async function checkUpdates(c: Context<HonoCtx>, gql: ApolloClient): Promise<boolean> {
	// if new enough, skip entire check
	const checked = await c.env.KV_GROX.get(CHECKED_AT_KEY, { cacheTtl: 1800 });
	if (checked) {
		return false;
	}

	// do the actual check
	Sentry.logger.debug("S:c - check update");
	const repoInfo = process.env.CIP_REPO.split("/");
	const commitOidRes = await gql.query<LastCommitOidQuery, LastCommitOidQueryVariables>({
		query: LAST_COMMIT_OID_GQL,
		variables: { owner: repoInfo[0], repo: repoInfo[1] },
	});
	if (!commitOidRes.data) {
		throw new LogicalError(HttpStatus.INTERNAL_SERVER_ERROR, {
			grox: "S:c-cu",
			msg: `errors occurs when fetching latest commit id`,
			err: commitOidRes.error,
		});
	}
	const branch = commitOidRes.data.repository?.defaultBranchRef;
	if (branch?.target?.__typename !== "Commit") {
		throw new LogicalError(HttpStatus.INTERNAL_SERVER_ERROR, {
			grox: "S:c-cu",
			msg: `invalid typename '${branch?.target?.__typename}'`,
		});
	}

	// update the timestamp anyway
	await c.env.KV_GROX.put(CHECKED_AT_KEY, new Date().toISOString(), { expirationTtl: CACHE_INTERVIAL });

	// check (and update) if the recorded version matches the current one
	const recordedCommitId = await c.env.KV_GROX.get(COMMIT_ID_KEY);
	if (!recordedCommitId || recordedCommitId !== branch.target.oid) {
		Sentry.logger.debug(Sentry.logger.fmt`S:c - updated to commit: '${branch.target.oid}'`);
		await c.env.KV_GROX.put(COMMIT_ID_KEY, branch.target.oid as string);

		return true;
	}

	return false;
}
