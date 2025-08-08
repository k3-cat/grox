export namespace D {
	export const STATIC_ASSETS_PERFIX = "/static";
	export const STYLE_CSS_PATH = "/style.css";
	export const FAVICON_PATH = "/favicon.ico";
	export const GENERAL_KEY_PATH = "/:key{[^/].*}";
}

export const enum S {
	Update = "u",
	Cube = "c",
	Backup = "bak",
}

export namespace H {
	// standard
	export const CONTENT_DIGEST = "content-digest";
	export const CONTENT_LENGTH = "content-length";
	export const CONTENT_RANGE = "content-range";
	export const CONTENT_TYPE = "content-type";
	export const LAST_MODIFIED = "last-modified";
	// custom
	export const SSEC_KEY = "x-ssec-key";
}

export namespace R2Const {
	export const DELIMITER_QUERY = "delimiter";
	export const CURSOR_QUERY = "cursor";
}

export namespace CubeConst {
	export const K3_AT_GITHUB = "k3-cat";
	export const REPO_NAME = "cube";
	export const MODULE_URL_PREFIX = ":";
	export const CIP_NAME = "cip.py";
	export const CUBE_HOSTNAME_PLACEHOLDER = "%{CUBE_HOSTNAME}%";
}

export namespace CacheControl {
	export const Immutable = "public, max-age=2629746, immutable";
	export const Temp = "max-age=180";
	export const No = "no-store";
}
