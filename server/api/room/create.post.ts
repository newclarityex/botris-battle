import { z } from "zod";
import { createRoomKey, type RoomData, rooms } from "~/server/utils/rooms";
import { checkAuth } from "~/server/utils/auth";
import { customAlphabet, nanoid } from "nanoid";
import { numbers, lowercase } from "nanoid-dictionary";

const genRoomId = customAlphabet(numbers + lowercase, 8);

const CreateRoomSchema = z.object({
	private: z.boolean(),
	ft: z.number().min(1).max(999),
	// maxPlayers: z.number().min(2).max(4),
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

	const body = await readValidatedBody(event, body => CreateRoomSchema.safeParse(body));
	if (!body.success) {
		throw createError({
			statusCode: 400,
			statusMessage: "Doesn't match schema."
		});
	};
	const data = body.data;

	let roomId = genRoomId();
	while (rooms.has(roomId)) {
		roomId = nanoid();
	}

	const room: RoomData = {
		id: roomId,
		createdAt: Date.now(),
		host: { id: profile.id, displayName: profile.displayName },
		private: data.private,
		ft: data.ft,
		maxPlayers: 2,
		pps: data.pps,
		initialMultiplier: data.initialMultiplier,
		finalMultiplier: data.finalMultiplier,
		startMargin: data.startMargin,
		endMargin: data.endMargin,
		gameOngoing: false,
		roundOngoing: false,
		startedAt: null,
		endedAt: null,
		lastWinner: null,
		banned: new Map(),
		players: new Map(),
		spectators: new Map(),
	};

	rooms.set(roomId, room);

	await prisma.roomKey.create({
		data: {
			key: createRoomKey(),
			roomId,
			singleUse: false,
		},
	});

	const cleanupInterval = setInterval(() => {
		if (!rooms.has(roomId)) {
			clearInterval(cleanupInterval);
		};

		if (room.players.size === 0 && room.spectators.size === 0) {
			rooms.delete(roomId);
			clearInterval(cleanupInterval);
		};
	}, 60 * 1000);

	return {
		roomId,
	};
});
