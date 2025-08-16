import type { FC } from "hono/jsx";

import { P } from "@/definitions";

export const Layout: FC = (props) => {
	return (
		<html>
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<link rel="icon" href={P.STATIC_ASSETS_PERFIX + P.FAVICON_PATH} type="image/x-icon" />
				<title>{props.title}</title>
				<link rel="stylesheet" href={P.STATIC_ASSETS_PERFIX + P.STYLE_CSS_PATH} />
			</head>
			<body>{props.children}</body>
		</html>
	);
};
