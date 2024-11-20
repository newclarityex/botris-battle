import { z } from "zod";
import { rooms } from "~/server/utils/rooms";
import { checkAuth } from "~/server/utils/auth";

const EditGameSchema = z.object({
	roomId: z.string(),
	private: z.boolean(),
	ft: z.number().min(1).max(999),
	pps: z.number().gt(0).max(30),
	initialMultiplier: z.number().gte(0).max(20),
	finalMultiplier: z.number().gte(0).max(20),
	startMargin: z.number().gte(0),
	endMargin: z.number().gte(0),
});

export default defineEventHandler(async (event) => {
	const profile = await checkAuth(event.context.user);
	if (!profile) {
		throw createError({
			statusCode: 401,
			message: "Unauthorized",
		});
	}

	const body = await readValidatedBody(event, body => EditGameSchema.safeParse(body));
	if (!body.success) {
		throw createError({
			statusCode: 400,
			statusMessage: "Doesn't match schema."
		});
	};
	const data = body.data;

	const room = rooms.get(data.roomId);

	if (!room) {
		throw createError({
			statusCode: 404,
			statusMessage: "Room not found."
		});
	};

    if (room.host.id !== profile.id) {
        throw createError({
            statusCode: 401,
            statusMessage: "You aren't the host for this room."
        });
    };

	room.settings = data;

	sendRoom(data.roomId, {
		type: "settings_changed",
		payload: { roomData: getPublicRoomData(room) },
	});

	return { success: true };
});
