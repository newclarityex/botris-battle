<script setup lang="ts">
import '~/assets/css/markdown.css'
const route = useRoute();
</script>

<template>
    <div>
        <main class="px-8">
            <ContentDoc path="/docs" />
        </main>
    </div>
</template>