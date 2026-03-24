export function newSlicedStream(start: number, end: number) {
	let offsetStart = 0;
	return new TransformStream<Uint8Array, Uint8Array>({
		start() {},
		transform(chunk, controller) {
			if (offsetStart >= end) {
				controller.terminate();
				return;
			}

			const offsetEnd = offsetStart + chunk.byteLength;
			// skip chunks before start
			if (offsetEnd <= start) {
				return;
			}

			// prettier-ignore
			controller.enqueue(chunk.slice(
				Math.max(0, start - offsetStart),
				Math.min(chunk.byteLength, (end + 1) - offsetStart)
			));

			offsetStart = offsetEnd;
		},
		flush(_controller) {},
	});
}
