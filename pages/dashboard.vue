<script setup lang="ts">
definePageMeta({ middleware: "auth" });
const { data: tokens, refresh } = useFetch('/api/self/tokens');

const createTokenModal = ref(false);

async function removeToken(token: string) {
    await $fetch(`/api/self/token`, {
        method: 'DELETE',
        body: {
            token,
        },
    });

    await refresh();
}
</script>

<template>
    <TheCreateTokenModal v-model="createTokenModal" @token-created="refresh()" />
    <div class="flex justify-center">
        <div>
            <h1>Dashboard</h1>
            <h2>API Keys</h2>
            <ul class="list-none p-0 flex flex-col gap-2">
                <li v-for="token in tokens" class="bg-white/20 p-4 flex">
                    <div class="w-40">{{ token.name }}</div>
                    <div class="w-96">{{ token.token }}</div>
                    <div>
                        <button @click="removeToken(token.token)"> Remove </button>
                    </div>
                </li>
            </ul>
            <div class="w-full flex justify-center">
                <button @click="createTokenModal = true" class="my-4 border-white border-2 p-2">
                    Create Token
                </button>
            </div>
        </div>
    </div>
</template>