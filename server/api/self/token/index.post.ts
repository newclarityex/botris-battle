import { z } from 'zod';
import { checkAuth } from '~/server/utils/auth';

const CreateTokenSchema = z.object({
    name: z.string(),
});


export default defineEventHandler(async (event) => {
	const profile = await checkAuth(event.context.user);
	if (!profile) {
		throw createError({
			statusCode: 401,
			message: "Unauthorized",
		});
	}

    const body = await readBody(event);
    const data = CreateTokenSchema.parse(body);

    const token = await prisma.apiToken.create({
        data: {
            profileId: profile.id,
            name: data.name,
        }
    });

    return {
        token: token.token,
    };
});