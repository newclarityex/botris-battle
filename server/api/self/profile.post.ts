import { z } from 'zod';
import { prisma } from '@/server/utils/prisma';

const ProfileSchema = z.object({
    displayName: z.string().min(1).max(32),
});

export default defineEventHandler(async (event) => {
    if (event.context.user === null) {
        throw createError({
            statusCode: 401,
            message: 'You must be signed in to create your profile.'
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

    const newProfile = await prisma.profile.create({
        data: {
            id: event.context.user.id,
            displayName: data.displayName,
        }
    });

    return newProfile;
});