<script setup lang="ts">
import '~/assets/css/markdown.css'
const route = useRoute();
</script>

<template>
    <div class="flex justify-center">
        <main class="px-8 w-[1240px]">
            <ContentDoc path="/docs" />
        </main>
    </div>
</template>