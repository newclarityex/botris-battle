<script setup lang="ts">
const { status } = useAuth()
const { data: rooms, refresh } = useFetch('/api/rooms');

const createRoomModal = ref(false);
</script>

<template>
    <TheCreateRoomModal v-model="createRoomModal" />
    <div>
        <ul>
            <li v-for="room in rooms">
                <div>{{ room.id }}</div>
                <div>{{ room.host.bot }}</div>
            </li>
        </ul>
        <button v-if="status === 'authenticated'" @click="
            createRoomModal = true;
        "> Create Room </button>
    </div>
</template>