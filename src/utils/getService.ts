import { S } from "@/definitions";

export function getService(url: URL) {
	return url.hostname.split(".")[0].toLowerCase() as S;
}
