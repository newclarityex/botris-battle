<script setup lang="ts">
definePageMeta({ middleware: "auth" });
const { data: tokens, refresh } = useFetch('/api/tokens');

const createTokenModal = ref(false);

async function removeToken(token: string) {
    await $fetch(`/api/token`, {
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
            <table class="text-white text-lg p-0">
                <tbody>
                    <tr v-for="token in tokens">
                        <td>{{ token.name }}</td>
                        <td>{{ token.token }}</td>
                        <td>
                            <button @click="removeToken(token.token)"> Remove </button>
                        </td>
                    </tr>
                </tbody>
            </table>
            <button @click="
                createTokenModal = true;
            "> Create Token </button>
        </div>
    </div>
</template>