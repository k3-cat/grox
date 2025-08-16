export async function digestMessage(message: string) {
	const encoder = new TextEncoder();
	const encodedMessage = encoder.encode(message);

	const digest = await crypto.subtle.digest({ name: "SHA-256" }, encodedMessage);

	return digest;
}
