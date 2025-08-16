import { gql } from "@apollo/client/core";

export const LAST_COMMIT_OID_GQL = gql`
	query LastCommitOid($owner: String!, $repo: String!) {
		repository(owner: $owner, name: $repo) {
			defaultBranchRef {
				name
				target {
					... on Commit {
						oid
					}
				}
			}
		}
	}
`;

export const FILE_CONTENT_GQL = gql`
	query FileContent($owner: String!, $repo: String!, $path: String!) {
		repository(owner: $owner, name: $repo) {
			object(expression: $path) {
				... on Blob {
					byteSize
					text
				}
			}
		}
	}
`;
