<script setup lang="ts">
const authStore = useAuthStore();

const registerData = ref({
    displayName: "",
});

async function handleRegister(event: Event) {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    if (!form.checkValidity()) return;

    await $fetch("/api/self/profile", {
        method: "POST",
        body: registerData.value,
    });

    await authStore.tryAuthenticate();
}
</script>

<template>
    <ModalWrapper>
        <form @submit="handleRegister" class="text-white flex flex-col items-center py-6 px-12 gap-6">
            <h1 class="text-2xl text-primary p-0">Register Profile</h1>
            <div class="flex">
                <input type="text" id="display_name" v-model="registerData.displayName" class="bg-black/40 p-1 text-lg text-center"
                    placeholder="Display Name" aria-label="Display Name" required />
            </div>
            <div class="flex gap-8">
                <button class="text-btn" type="button" @click="authStore.logout()">Sign Out</button>
                <button class="text-btn">Submit</button>
            </div>
        </form>
    </ModalWrapper>
</template>