import { prisma } from '@/server/utils/prisma';
import { toPublicBot } from '~/server/utils/bot';

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const inviteCode = query.inviteCode;

	if (typeof inviteCode !== 'string') {
		throw createError({
			statusCode: 400,
			statusMessage: "Invalid inviteCode."
		});
	};

    const invite = await prisma.botInvite.findFirst({
        where: {
            key: inviteCode,
        },
        include: {
            Bot: {
                include: {
                    developers: true,
                },
            },
        },
    });

    if (invite === null) {
        throw createError({
            statusCode: 404,
            statusMessage: "Invalid inviteCode.",
        });
    };

    return toPublicBot(invite.Bot);
});