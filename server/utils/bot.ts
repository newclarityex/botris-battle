import type { Prisma } from "@prisma/client";
import { AvatarSchema, generateEmptyAvatar } from "~/utils/avatar";
import type { PublicBot } from "~/utils/general";

type BotWithDevelopers = Prisma.BotGetPayload<{
    include: { developers: true },
}>;

export function toPublicBot(bot: BotWithDevelopers) {
    const parsed: PublicBot = {
        id: bot.id,
        name: bot.name,
        avatar: AvatarSchema.safeParse(bot.avatar).data ?? generateEmptyAvatar(),
        team: bot.team,
        language: bot.language,
        eval: bot.eval,
        movegen: bot.movegen,
        search: bot.search,
        developers: bot.developers.map(dev => ({ id: dev.id, displayName: dev.displayName })),
    };

    return parsed;
};