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

    const body = await readValidatedBody(event, body => CreateTokenSchema.safeParse(body));
	if (!body.success) {
		throw createError({
			statusCode: 400,
			statusMessage: "Doesn't match schema."
		});
	};
	const data = body.data;

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