<script setup lang="ts">
const props = defineProps<{
    modelValue: boolean;
}>()

const emit = defineEmits<{
    (event: 'update:modelValue', value: boolean): void;
    (event: 'tokenCreated'): void;
}>();

const tokenName = ref('');

async function createToken(event: Event) {
    event.preventDefault()

    const form = event.target as HTMLFormElement;
    if (!form.checkValidity()) return;

    const { token } = await $fetch('/api/token', {
        method: 'POST',
        body: {
            name: tokenName.value
        },
    });

    alert(`Token created: ${token}`);

    emit('tokenCreated');
    emit('update:modelValue', false);
}
</script>

<template>
    <UModal @update:model-value="newValue => emit('update:modelValue', newValue)" :model-value="modelValue">
        <div class="p-4">
            <h1>Create Room</h1>
            <form @submit.prevent="createToken">
                <div class="flex flex-col">
                    <label for="room-id">Token Name:</label>
                    <input type="text" id="room-id" class="bg-black/40" placeholder="Test" required v-model="tokenName">
                </div>
                <button>Submit</button>
            </form>
        </div>
    </UModal>
</template>