
import { getServerSession, getServerToken } from "#auth"
import { getGithubApp } from "../utils/github";
import { authOptions } from "./auth/[...]";
import { prisma } from "@/server/utils/prisma";
import { Octokit } from "@octokit/core";
import { createOAuthUserAuth } from "@octokit/auth-oauth-user";

export default defineEventHandler(async (event) => {
    const session = await getServerSession(event, authOptions)
    if (!session?.user) {
        throw createError({
            statusCode: 401,
            message: 'You must be sign in to view your profile.'
        });
    }

    const account = await prisma.account.findFirstOrThrow({
        where: {
            userId: session.user.id,
            provider: 'github',
        }
    });

    if (!account.access_token) {
        throw createError({
            statusCode: 401,
            message: 'You must be sign in to view your profile.'
        });
    }

    const runtimeConfig = useRuntimeConfig();

    console.log("ALSDKJ");

    // const githubApp = getGithubApp();
    // const octokit = githubApp.octokit;


    const octokit = new Octokit({
        authStrategy: createOAuthUserAuth,
        auth: {
            clientType: 'oauth-app',
            clientId: runtimeConfig.github.clientId,
            clientSecret: runtimeConfig.github.clientSecret,
            token: account.access_token,
            scopes: ['repo'],
        },
    });

    const repos = await octokit.request(`GET /user/repos`,
        {
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

    console.log("REEEEEEEE", repos)
    // const auth = createOAuthUserAuth({
    //     clientType: 'oauth-app',
    //     clientId: runtimeConfig.github.clientId,
    //     clientSecret: runtimeConfig.github.clientSecret,
    //     token: account.access_token,
    //     scopes: ['repo'],
    // });
    // console.log("ASD", await auth());


    // const repos = await octokit.request('GET /user/repos');

    // console.log("ASDJHAS", repos)

    // return repos.data.map(repo => repo.full_name);
})