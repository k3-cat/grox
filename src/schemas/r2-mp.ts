import * as z from "zod/mini";

export const InitMupReqSchema = z.object({
	key: z.string(),
	sha256: z.hash("sha256"),
});

export const UploadedPartSchema: z.ZodMiniType<R2UploadedPart> = z.object({
	partNumber: z.int(),
	etag: z.string(),
});

export const PartIndexSchema: z.ZodMiniType<R2UploadedPart[]> = z.array(UploadedPartSchema);
