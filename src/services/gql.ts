import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client/core";

export function getGqlClient() {
	return new ApolloClient({
		link: new HttpLink({
			uri: "https://api.github.com/graphql",
			headers: {
				Authorization: "Bearer " + process.env.GITHUB_PAT,
			},
		}),
		clientAwareness: { name: "grox" },
		cache: new InMemoryCache(),
	});
}
