
export default defineEventHandler(async (event) => {
	const profile = await checkAuth(event.context.user);
	if (!profile) {
		throw createError({
			statusCode: 401,
			message: "Unauthorized",
		});
	}
    
    if (!profile) {
        throw createError({
            statusCode: 404,
            message: 'User not found'
        });
    }

    return profile;
})