<script setup lang="ts">
const emit = defineEmits<{
    (event: 'close'): void;
}>();

const roomData = ref({
    ft: 5,
    private: false,
    pps: 2.5,
    initialMultiplier: 1,
    finalMultiplier: 10,
    startMargin: 90,
    endMargin: 600,
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
            <h2 class="text-center">Create Room</h2>
            <form @submit.prevent="createRoom" class="flex flex-col items-center gap-4">
                <div class="w-full gap-4 flex flex-row items-center justify-between">
                    <label for="room-ft">Room FT</label>
                    <input type="number" id="room-ft" class="bg-black/40 w-12 px-1" required v-model="roomData.ft">
                </div>
                <div class="w-full gap-4 flex flex-row items-center justify-between">
                    <label for="room-private">Room Private</label>
                    <input type="checkbox" id="room-private" class="bg-black/40" v-model="roomData.private">
                </div>
                <div class="w-full gap-4 flex flex-row items-center justify-between">
                    <label for="pps">PPS (max: 30)</label>
                    <input type="number" id="pps" class="bg-black/40 w-16 px-1" required v-model="roomData.pps"
                        step="0.01">
                </div>
                <div class="w-full gap-4 flex flex-row items-center justify-between">
                    <label for="initial-multiplier">Initial Multiplier (0x - 20x)</label>
                    <input type="number" id="initial-multiplier" class="bg-black/40 w-16 px-1" required
                        v-model="roomData.initialMultiplier" step="0.01">
                </div>
                <div class="w-full gap-4 flex flex-row items-center justify-between">
                    <label for="final-multiplier">Final Multiplier (0x - 20x)</label>
                    <input type="number" id="final-multiplier" class="bg-black/40 w-16 px-1" required
                        v-model="roomData.finalMultiplier" step="0.01">
                </div>
                <div class="w-full gap-4 flex flex-row items-center justify-between">
                    <label for="start-margin">Start Margin (secs)</label>
                    <input type="number" id="start-margin" class="bg-black/40 w-16 px-1" required
                        v-model="roomData.startMargin">
                </div>
                <div class="w-full gap-4 flex flex-row items-center justify-between">
                    <label for="end-margin">End Margin (secs)</label>
                    <input type="number" id="end-margin" class="bg-black/40 w-16 px-1" required
                        v-model="roomData.endMargin">
                </div>
                <button class="text-btn" :disabled="disableCreate" type="submit">Submit</button>
            </form>
        </div>
    </ModalWrapper>
</template>