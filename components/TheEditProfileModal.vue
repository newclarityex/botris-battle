<script setup lang="ts">
const authStore = useAuthStore();

const registerData = ref({
    name: authStore.profile?.name ?? "",
    creator: authStore.profile?.creator ?? "",
});

async function handleRegister(event: Event) {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    if (!form.checkValidity()) return;

    await $fetch("/api/self/profile", {
        method: "PATCH",
        body: registerData.value,
    });

    await authStore.tryAuthenticate();
}
</script>

<template>
    <ModalWrapper>
        <form @submit="handleRegister" class="text-white flex flex-col items-center py-6 px-12 gap-4">
            <h1 class="text-2xl text-primary p-0">Update Profile</h1>
            <div class="flex">
                <input type="text" id="name" v-model="registerData.name" class="bg-black/40 p-1 text-lg text-center"
                    placeholder="Bot Name" aria-label="Bot Name" required />
            </div>
            <div class="flex">
                <input type="text" id="creator" v-model="registerData.creator"
                    class="bg-black/40 p-1 text-lg text-center" placeholder="Creator/Team Name" required />
            </div>
            <!-- <AvatarEditor v-model="avatar" /> -->
            <div class="flex gap-8">
                <button class="text-btn" type="button" @click="authStore.logout()">Sign Out</button>
                <button class="text-btn">Submit</button>
            </div>
        </form>
    </ModalWrapper>
</template>