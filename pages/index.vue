<script setup lang="ts">
import { generateAvatar } from '~/utils/avatar';

const { signIn } = useAuth()

const avatar = ref(generateAvatar())
</script>

<template>
    <div class="flex flex-col items-center">
        <AvatarEditor v-model="avatar" />
        <main class="flex flex-col items-center">
            <h1 class="text-3xl text-primary py-2">
                Botris 2024
            </h1>
            <h2 class="text-xl text-primary py-2">
                Held by <NuxtLink href="https://www.twitch.tv/puzzlekingdom" class="underline">
                    PuzzleKingdom</NuxtLink>
            </h2>
            <p class="text-xl text-content py-2 px-4 max-w-2xl indent-8">
                Botris 2024 is a hackathon where teams of programmers compete to create the
                best block-stacking AI in 6 months.
            </p>
            <img src="/images/thumbnail.png" alt="Example Board" class="w-56 py-8" />
            <button class="text-2xl text-primary underline py-6" @click="signIn('github')">Click Here to
                Participate</button>
        </main>
    </div>
</template>