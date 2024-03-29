<script setup lang="ts">
const emit = defineEmits<{
    (event: 'close'): void;
}>()
</script>
<template>
    <Teleport to="#modals">
        <div class="w-full h-full flex justify-center items-center pointer-events-auto">
            <div class="absolute w-full h-full bg-black/25" @click="emit('close')"></div>
            <div class="bg-background z-10">
                <slot />
            </div>
        </div>
    </Teleport>
</template>