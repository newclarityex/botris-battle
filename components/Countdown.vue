<script setup lang="ts">
const props = defineProps<{
    startsAt: number;
}>();

const displayTime = ref<number>(0);

onMounted(() => {
    const interval = setInterval(() => {
        const now = Date.now();
        const timeLeft = props.startsAt - now;

        displayTime.value = timeLeft;
    }, 1000);
}); 
</script>

<template>
    <div>
        <div v-if="displayTime > 0">
            Game starts in {{ Math.floor(displayTime / 1000) }} seconds
        </div>
        <div v-else>Game has started</div>
    </div>
</template>