<script setup lang="ts">
const props = defineProps<{
    modelValue: boolean;
}>()

const emit = defineEmits<{
    (event: 'update:modelValue', value: boolean): void;
}>();

const roomData = ref({
    roomId: '',
    ft: 3,
    maxPlayers: 2,
    public: false,
});

async function createRoom(event: Event) {
    event.preventDefault()

    const form = event.target as HTMLFormElement;
    if (!form.checkValidity()) return;

    const room = await $fetch('/api/room/create', {
        method: 'POST',
        body: roomData.value,
    });

    emit('update:modelValue', false);

    navigateTo(`/room/${room.roomId}`);
}
</script>

<template>
    <UModal @update:model-value="newValue => emit('update:modelValue', newValue)" :model-value="modelValue">
        <div class="p-4">
            <h1>Create Room</h1>
            <form @submit.prevent="createRoom">
                <div class="flex flex-col">
                    <label for="room-id">Room Id:</label>
                    <input type="text" id="room-id" class="bg-black/40" placeholder="ColdClear" required
                        v-model="roomData.roomId">
                </div>
                <!-- ft -->
                <div class="flex flex-col">
                    <label for="room-ft">Room FT:</label>
                    <input type="number" id="room-ft" class="bg-black/40" required v-model="roomData.ft">
                </div>
                <!-- max-players -->
                <div class="flex flex-col">
                    <label for="room-max-players">Max Players:</label>
                    <input type="number" id="room-max-players" class="bg-black/40" required v-model="roomData.maxPlayers">
                </div>
                <!-- public -->
                <div class="flex flex-col">
                    <label for="room-public">Room Public:</label>
                    <input type="checkbox" id="room-public" class="bg-black/40" v-model="roomData.public">
                </div>
                <button>Submit</button>
            </form>
        </div>
    </UModal>
</template>