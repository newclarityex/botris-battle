<script setup lang="ts">
const { signIn, signOut, session, status, cookies, getProviders } = useAuth()
</script>

<template>
    <div>
        <div>
            <button @click="signIn('github')">
                JS Sign In
            </button>
            <button @click="signOut()">
                Sign Out
            </button>
        </div>
        <div>
            <pre>{{ status }}</pre>
            <pre>{{ session?.user }}</pre>
            <pre>{{ cookies }}</pre>
        </div>
    </div>
</template>