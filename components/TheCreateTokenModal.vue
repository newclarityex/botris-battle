<script setup lang="ts">
const emit = defineEmits<{
    (event: 'close'): void;
    (event: 'tokenCreated'): void;
}>();

const props = defineProps<{
    botId: string;
}>();

const tokenName = ref('');

async function createToken(event: Event) {
    const form = event.target as HTMLFormElement;
    if (!form.checkValidity()) return;

    const { token } = await $fetch(`/api/bot/${props.botId}/token`, {
        method: 'POST',
        body: {
            name: tokenName.value
        },
    });

    prompt("Copy Token:", token);

    emit('tokenCreated');
    emit('close');
}
</script>

<template>
    <ModalWrapper @close="emit('close')">
        <div class="p-4">
            <form @submit.prevent="createToken">
                <div class="flex flex-col items-center gap-4">
                    <input type="text" id="token-label" class="bg-black/40 text-center px-1 text-xl" placeholder="Label"
                        required v-model="tokenName">
                    <div class="flex gap-8">
                        <button class="text-btn" type="button" @click="emit('close')">Cancel</button>
                        <button class="text-btn">Create</button>
                    </div>
                </div>
            </form>
        </div>
    </ModalWrapper>
</template>