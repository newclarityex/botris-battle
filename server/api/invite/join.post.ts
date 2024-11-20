import { z } from 'zod';
import { checkAuth } from '~/server/utils/auth';

const JoinInviteSchema = z.object({
    inviteCode: z.string(),
});

export default defineEventHandler(async (event) => {
	const profile = await checkAuth(event.context.user);
	if (!profile) {
		throw createError({
			statusCode: 401,
			message: "Unauthorized",
		});
	}

    const body = await readValidatedBody(event, body => JoinInviteSchema.safeParse(body));
	if (!body.success) {
		throw createError({
			statusCode: 400,
			statusMessage: "Doesn't match schema."
		});
	};
	const data = body.data;
    
    const invite = await prisma.botInvite.findFirst({
        where: {
            key: data.inviteCode,
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

    if (invite.Bot.developers.some(dev => dev.id === profile.id)) {
        throw createError({
            statusCode: 400,
            statusMessage: "You are already a developer for this bot.",
        })
    }

    await prisma.botInvite.delete({
        where: {
            key: data.inviteCode,
        },
    });

    await prisma.bot.update({
        where: {
            id: invite.botId,
        },
        data: {
            developers: {
                connect: {
                    id: profile.id,
                },
            },
        }
    });

    return { success: true };
});