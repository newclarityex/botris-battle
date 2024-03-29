import { z } from "zod";
import { rooms } from "~/server/utils/rooms";
import { checkAuth } from "~/server/utils/auth";

const EditGameSchema = z.object({
	roomId: z.string(),
	private: z.boolean(),
	ft: z.number().min(1).max(99),
	initialPps: z.number().gt(0).max(30),
	finalPps: z.number().gt(0).max(30),
	startMargin: z.number().gt(0),
	endMargin: z.number().gt(0),
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

	room.initialPps = data.initialPps;
	room.finalPps = data.finalPps;
	room.startMargin = data.startMargin * 1000;
	room.endMargin = data.endMargin * 1000;
	room.ft = data.ft;
	room.private = data.private;

	sendRoom(data.roomId, {
		type: "settings_changed",
		payload: { roomData: getPublicRoomData(room) },
	});

    return { success: true };
});
