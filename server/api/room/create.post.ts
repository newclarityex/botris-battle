import { z } from "zod";
import { createRoomKey, rooms } from "~/server/utils/rooms";
import { checkAuth } from "~/server/utils/auth";
import { customAlphabet, nanoid } from "nanoid";
import { numbers, lowercase } from "nanoid-dictionary";
import type { Block } from "~/utils/game";

const genRoomId = customAlphabet(numbers + lowercase, 8);

const CreateGameSchema = z.object({
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

	const body = await readValidatedBody(event, body => CreateGameSchema.safeParse(body));
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

	const match = {
		id: roomId,
		createdAt: Date.now(),
		host: {
			userId: profile.id,
			creator: profile.creator,
			bot: profile.name,
			avatar: profile.avatar as Block[][],
		},
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

	rooms.set(roomId, match);

	await prisma.roomKey.create({
		data: {
			key: createRoomKey(),
			roomId,
			singleUse: false,
		},
	});

	return {
		roomId,
	};
});
