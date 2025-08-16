export namespace P {
	export const STATIC_ASSETS_PERFIX = "/static";
	export const ADMIN_PERFIX = "/admin";
	export const STYLE_CSS_PATH = "/style.css";
	export const FAVICON_PATH = "/favicon.ico";
	export const PATH_SPLITTER = ":";
	export const SLASH = "/";
	export const TEAM_NAME = "3c6";
}

export const enum S {
	Update = "u",
	Cube = "c",
	Backup = "bak",
}

export namespace H {
	// standard
	export const CONTENT_DIGEST = "content-digest";
	// custom
	export const SHA256_HEADER = "x-sha256";
	export const SSEC_KEY = "x-ssec-key";
	export const SSEC_KEY_MD5 = "x-ssec-key-md5";
	export const CF_IS_TRUNCATED = "cf-is-truncated";
	export const CF_NEXT_CONTINUATION_TOKEN = "cf-next-continuation-token";
}

export namespace R2C {
	export const DELIMITER_QUERY = "delimiter";
	export const CURSOR_QUERY = "cursor";
}

export namespace SuC {
	export const VERSION_PLACEHOLDER = "%{ver}%";
	export const SCRIPT_API_PATH_PREFIX = "/@";
}

export namespace ScC {
	export const K3_AT_GITHUB = "k3-cat";
	export const REPO_NAME = "cube";
	export const MODULE_URL_PREFIX = "/@";
	export const CIP_NAME = "cip.py";
	export const CUBE_HOSTNAME_PLACEHOLDER = "%{CUBE_HOSTNAME}%";
}

export namespace CacheControl {
	export const Immutable = "public, max-age=2629746, immutable";
	export const LongerTemp = "public, max-age=21600";
	export const Temp = "public, max-age=180";
	export const No = "no-store";
}
