import { OAuthApp } from "octokit";

export function getGithubApp() {
    const runtimeConfig = useRuntimeConfig();
    const app = new OAuthApp({
        clientId: runtimeConfig.github.clientId,
        clientSecret: runtimeConfig.github.clientSecret,
        defaultScopes: ["repo"],
    });

    return app;
}