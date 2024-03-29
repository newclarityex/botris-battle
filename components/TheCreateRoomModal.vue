<script setup lang="ts">
const emit = defineEmits<{
    (event: 'close'): void;
}>();

const roomData = ref({
    ft: 3,
    // maxPlayers: 2,
    private: false,
    ppsCap: 3,
});

const disableCreate = ref(false);
async function createRoom(event: Event) {
    const form = event.target as HTMLFormElement;
    if (!form.checkValidity()) return;

    disableCreate.value = true;

    const room = await $fetch('/api/room/create', {
        method: 'POST',
        body: roomData.value,
    });

    navigateTo(`/room/${room.roomId}`);
}
</script>

<template>
    <ModalWrapper @close="emit('close')">
        <div class="p-4">
            <h1>Create Room</h1>
            <form @submit.prevent="createRoom">
                <div class="flex flex-col">
                    <label for="room-ft">Room FT:</label>
                    <input type="number" id="room-ft" class="bg-black/40" required v-model="roomData.ft">
                </div>
                <div class="flex flex-col">
                    <label for="room-private">Room Private:</label>
                    <input type="checkbox" id="room-private" class="bg-black/40" v-model="roomData.private">
                </div>
                <div class="flex flex-col">
                    <label for="pps-cap">PPS Cap:</label>
                    <input type="number" id="pps-cap" class="bg-black/40" required v-model="roomData.ppsCap">
                </div>
                <button class="disabled:opacity-50" :disabled="disableCreate" type="submit">Submit</button>
            </form>
        </div>
    </ModalWrapper>
</template>