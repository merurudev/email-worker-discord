import { convert } from 'html-to-text';
import PostalMime from 'postal-mime';

export default {
	async email(message, env: Env, ctx) {
		const BLACK_LIST = ['newsletter@abema.tv', 'no-reply@newsletter.abema.tv'];

		const email = await new PostalMime().parse(message.raw);

		for (const black of BLACK_LIST) {
			if (email.from.address.endsWith(black)) return;
		}

		const content: string | undefined = email.html ? convert(email.html, { wordwrap: 130 }) : email.text;
		console.log(`content: ` + content);

		const formData = new FormData();

		formData.append(
			'payload_json',
			JSON.stringify({
				username: message.to.toLowerCase().replace('discord', 'dis#ord'),
				content: `\`from: ${email.from.name} (${email.from.address})\`
${email.subject || '件名なし'}

<t:${Date.parse(email.date) / 1000}:R>`,
				allowed_mentions: {
					parse: [],
				},
			})
		);

		if (content !== undefined) {
			formData.append('file1', new Blob([content], { type: 'text/plain' }), 'body.txt');
		}

		email.attachments.forEach((attachment, index) => formData.append('file' + (index + 1), new Blob([attachment.content], { type: attachment.mimeType }), attachment.filename));

		ctx.waitUntil(
			(async () => {
				const res = await fetch(env.DISCORD_WEBHOOK, {
					method: 'POST',
					headers: {
						Accept: '*/*',
					},
					body: formData,
				});

				console.log(res.status);
				console.log(await res.text());
			})()
		);

		//await message.forward("temp@gmail.com");
	},
} satisfies ExportedHandler;
