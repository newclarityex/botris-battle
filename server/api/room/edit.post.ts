import { z } from "zod";
import { rooms } from "~/server/utils/rooms";
import { checkAuth } from "~/server/utils/auth";

const EditGameSchema = z.object({
	roomId: z.string(),
	private: z.boolean(),
	ft: z.number().min(1).max(99),
	ppsCap: z.number().gt(0).max(30),
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
	const data = EditGameSchema.parse(body);

	const room = rooms.get(data.roomId);

    if (!room) {
        throw createError({
            statusCode: 404,
            statusMessage: "Room not found."
        });
    };

	room.ppsCap = data.ppsCap;
	room.ft = data.ft;
	room.private = data.private;

	sendRoom(data.roomId, {
		type: "settings_changed",
		payload: { roomData: getPublicRoomData(room) },
	});

    return { success: true };
});
