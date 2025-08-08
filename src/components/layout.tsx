import { D } from "@/definitions";
import type { FC } from "hono/jsx";

export const Layout: FC = (props) => {
	return (
		<html>
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<link rel="icon" href={D.STATIC_ASSETS_PERFIX + D.FAVICON_PATH} type="image/x-icon" />
				<title>{props.title}</title>
				<link rel="stylesheet" href={D.STATIC_ASSETS_PERFIX + D.STYLE_CSS_PATH} />
			</head>
			<body>{props.children}</body>
		</html>
	);
};
