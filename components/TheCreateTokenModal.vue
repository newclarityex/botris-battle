<script setup lang="ts">
const props = defineProps<{
    modelValue: boolean;
}>()

const emit = defineEmits<{
    (event: 'close'): void;
    (event: 'tokenCreated'): void;
}>();

const tokenName = ref('');

async function createToken(event: Event) {
    const form = event.target as HTMLFormElement;
    if (!form.checkValidity()) return;

    const { token } = await $fetch('/api/self/token', {
        method: 'POST',
        body: {
            name: tokenName.value
        },
    });

    alert(`Token created: ${token}`);

    emit('tokenCreated');
    emit('close');
}
</script>

<template>
    <ModalWrapper @close="emit('close')">
        <div class="p-4">
            <form @submit.prevent="createToken">
                <div class="flex flex-col items-center gap-2">
                    <input type="text" id="token-label" class="bg-black/40 text-center px-1" placeholder="Label" required v-model="tokenName">
                    <button class="text-secondary">Create</button>
                </div>
            </form>
        </div>
    </ModalWrapper>
</template>