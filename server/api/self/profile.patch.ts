import { z } from 'zod';
import { prisma } from '@/server/utils/prisma';

const ProfileSchema = z.object({
    displayName: z.string().min(1).max(32),
});

export default defineEventHandler(async (event) => {
	const profile = await checkAuth(event.context.user);
	if (!profile) {
		throw createError({
			statusCode: 401,
			message: "Unauthorized",
		});
	}

    const body = await readValidatedBody(event, body => ProfileSchema.safeParse(body));
	if (!body.success) {
		throw createError({
			statusCode: 400,
			statusMessage: "Doesn't match schema."
		});
	};
	const data = body.data;

    const newProfile = await prisma.profile.update({
        where: {
            id: profile.id
        },
        data: {
            displayName: data.displayName,
        }
    });

    return newProfile;
});