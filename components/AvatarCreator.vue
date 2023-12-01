<script setup lang="ts">
const PIECES = ['I', 'O', 'L', 'J', 'S', 'Z', 'T', null];
function generateLine() {
    const line = [];
    for (let i = 0; i < 10; i++) {
        line.push(PIECES[Math.floor(Math.random() * PIECES.length)])
    }
    return line;
}

function generateAvatar() {
    const avatar = [];
    for (let i = 0; i < 10; i++) {
        avatar.push(generateLine())
    }
    return avatar;
}

const board = ref(generateAvatar());
</script>

<template>
    <div>

    </div>
</template>