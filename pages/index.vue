
<template>
    <div class="flex flex-col items-center">
        <main class="flex flex-col items-center">
            <h1 class="text-3xl text-primary py-2">
                Botris Battle
            </h1>
            <h2 class="text-xl text-primary py-2">
                <NuxtLink href="https://www.twitch.tv/puzzlekingdom" class="text-secondary">
                    PuzzleKingdom
                </NuxtLink> & <NuxtLink href="https://twitter.com/newclarityex" class="text-secondary">
                    NukeExplosions
                </NuxtLink>
            </h2>
            <p class="text-xl text-content py-2 px-4 max-w-2xl indent-8">
                Botris 2024 is a hackathon where teams of programmers compete to create the
                best block-stacking AI in 6 months.
            </p>
            <img src="/images/botris_preview.png" alt="Example Board" class="w-56 py-8 glow-shadow" />
            <NuxtLink to="https://discord.gg/47AhNAs25M" class="text-2xl text-primary py-6 underline">
                Register for Botris Battle 2024
            </NuxtLink>
            <!-- <button class="text-2xl text-primary underline py-6" @click="signIn('github')">Click Here to
                Participate</button> -->
        </main>
    </div>
</template>

<style scoped>
.glow-shadow {
    filter: drop-shadow(0px 0px 16px rgba(100, 200, 100, 0.3));
}
</style>