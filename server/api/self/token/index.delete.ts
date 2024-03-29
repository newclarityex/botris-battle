import { z } from 'zod';
import { checkAuth } from '~/server/utils/auth';

const DeleteTokenSchema = z.object({
    token: z.string(),
});

export default defineEventHandler(async (event) => {
	const profile = await checkAuth(event.context.user);
	if (!profile) {
		throw createError({
			statusCode: 401,
			message: "Unauthorized",
		});
	}

    const body = await readValidatedBody(event, body => DeleteTokenSchema.safeParse(body));
	if (!body.success) {
		throw createError({
			statusCode: 400,
			statusMessage: "Doesn't match schema."
		});
	};
	const data = body.data;

    await prisma.apiToken.delete({
        where: {
            token: data.token,
        }
    });

    return {
        success: true,
    };
});