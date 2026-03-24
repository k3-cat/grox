import * as z from "zod/mini";

export const EnvRecord = z.object({
	ver: z.int(),
	format: z.string(),
	records: z.record(z.string(), z.object({ t: z.string(), v: z.string() })),
});
