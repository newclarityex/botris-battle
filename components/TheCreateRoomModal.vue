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
    ppsCap: 3,
});

const disableCreate = ref(false);
async function createRoom(event: Event) {
    event.preventDefault()

    const form = event.target as HTMLFormElement;
    if (!form.checkValidity()) return;

    disableCreate.value = true;

    console.log("CREATING ROOM")
    const room = await $fetch('/api/room/create', {
        method: 'POST',
        body: roomData.value,
    });
    console.log("CREATED ROOM, NAVIGATING TO", `/room/${room.roomId}`)

    navigateTo(`/room/${room.roomId}`);

    console.log("EMITTING")
    emit('update:modelValue', false);
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
                <div class="flex flex-col">
                    <label for="room-ft">Room FT:</label>
                    <input type="number" id="room-ft" class="bg-black/40" required v-model="roomData.ft">
                </div>
                <div class="flex flex-col">
                    <label for="room-max-players">Max Players:</label>
                    <input type="number" id="room-max-players" class="bg-black/40" required v-model="roomData.maxPlayers">
                </div>
                <div class="flex flex-col">
                    <label for="room-public">Room Public:</label>
                    <input type="checkbox" id="room-public" class="bg-black/40" v-model="roomData.public">
                </div>
                <div class="flex flex-col">
                    <label for="pps-cap">PPS Cap:</label>
                    <input type="number" id="pps-cap" class="bg-black/40" required v-model="roomData.ppsCap">
                </div>
                <button class="disabled:opacity-50" :disabled="disableCreate">Submit</button>
            </form>
        </div>
    </UModal>
</template>