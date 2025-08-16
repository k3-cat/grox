import { z } from "zod";

export const PartIndexSchema: z.ZodType<R2UploadedPart> = z.object({
	partNumber: z.int(),
	etag: z.string(),
});

export const PartIndexesBodySchema = z.object({
	body: z.array(PartIndexSchema),
});
