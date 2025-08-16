export function hexToArrayBuffer(hexString: string) {
	if (hexString.length % 2 !== 0) {
		throw new Error("Hex string must have an even number of characters.");
	}

	const bytes = new Uint8Array(hexString.length / 2);
	for (let i = 0; i < hexString.length; i += 2) {
		const byteValue = parseInt(hexString.substr(i, 2), 16);
		bytes[i / 2] = byteValue;
	}

	return bytes.buffer;
}
