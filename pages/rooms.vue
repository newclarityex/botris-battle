<script setup lang="ts">
const { status } = useAuth()
const { data: rooms, refresh } = useFetch('/api/rooms');

const createRoomModal = ref(false);
</script>

<template>
    <TheCreateRoomModal v-model="createRoomModal" />
    <div class="flex justify-center">
        <div class="flex flex-col items-center gap-2">
            <h1>Public Rooms</h1>
            <div class="flex flex-col gap-2">
                <div class="px-4 flex w-full">
                    <div class="w-40 text-xl text-subheader">Room ID</div>
                    <div class="w-64 text-xl text-subheader">Host</div>
                </div>
                <ul class="list-none p-0 flex flex-col gap-2">
                    <li v-if="rooms?.length === 0" class="text-white/50">
                        <div class="w-full text-center italic text-lg">No Public Rooms</div>
                    </li>
                    <li v-for="room in rooms" class="bg-white/20 p-4 flex">
                        <div class="w-40">{{ room.id }}</div>
                        <div class="w-64">{{ room.host.bot }}</div>
                        <div>
                            <NuxtLink :to="`/room/${room.id}`" class="underline">Spectate</NuxtLink>
                        </div>
                    </li>
                </ul>
            </div>
            <button v-if="status === 'authenticated'" @click="createRoomModal = true"
                class="my-4 border-white border-2 p-2">
                Create Room
            </button>
        </div>
    </div>
</template>