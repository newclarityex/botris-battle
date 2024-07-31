
<template>
    <div class="flex flex-col items-center">
        <main class="flex flex-col items-center">
            <img src="/images/logo_gradient.svg" alt="Botris Logo" class="w-64 p-8">
            <h1 class="text-3xl text-primary py-2">
                Botris Battle
            </h1>
            <h2 class="text-xl text-primary py-2">
                <NuxtLink href="https://twitter.com/newclarityex" class="text-secondary">
                    NukeExplosions
                </NuxtLink> & 
                <NuxtLink href="https://www.twitch.tv/puzzlekingdom" class="text-secondary">
                    PuzzleKingdom
                </NuxtLink>
            </h2>
            <p class="text-xl text-content py-2 px-4 max-w-2xl indent-8">
                Botris 2024 is a hackathon where teams of programmers compete to create the
                best block-stacking AI in 6 months.
            </p>
            <div class="py-6">
                <h2 class="text-3xl text-primary py-8 underline text-center">Registration</h2>
                <ol class="max-w-2xl list-decimal">
                    <li>
                        Register on <a class="text-secondary" target="_blank" href="https://challonge.com/botrisbattle">challonge</a>.
                    </li>
                    <li>
                        Register on this website to test your bots.
                    </li>
                    <li>
                        Join the <a class="text-secondary" target="_blank" href="https://discord.gg/NUSgpfT5eH">Nuketris discord</a>
                    </li>
                </ol>
            </div>
            <div class="py-6">
                <h2 class="text-2xl text-primary py-2 text-center">Rules</h2>
                <ol class="max-w-2xl list-decimal">
                    <li>
                        Matches will be done FT5 in a single elimination bracket.
                    </li>
                    <li>
                        Maximum of 4 players per team.
                    </li>
                    <li>
                        Matches will be played at 2.5pps initially, then scaling to 5pps from 1:30 - 2:30.
                    </li>
                    <li>
                        You may use any public code that you have the rights to use.
                    </li>
                    <li>
                        If you heavily borrow from an existing bot that you did not write you must credit the original author(s).
                    </li>
                    <li>
                        You must be in the Nuketris discord <a class="text-secondary" target="_blank" href="https://discord.gg/NUSgpfT5eH">here</a> and registered on Challonge <a class="text-secondary" href="https://challonge.com/botrisbattle" target="_blank">here</a> to participate. 
                    </li>
                    <li>
                        You must not be banned from PuzzleKingdom events.
                    </li>
                    <li>
                        Do not put hate speech or NSFW in your bot/team name.
                    </li>
                </ol>
            </div>
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