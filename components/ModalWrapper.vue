<script setup lang="ts">
const emit = defineEmits<{
    (event: 'close'): void;
}>()
</script>
<template>
    <Teleport to="#modals">
        <div class="w-full h-full bg-black/25 flex justify-center items-center" @click="emit('close')">
            <div class="bg-background pointer-events-auto">
                <slot />
            </div>
        </div>
    </Teleport>
</template>