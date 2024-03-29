<script setup lang="ts">
const authStore = useAuthStore();

const registerData = ref({
    name: "",
    creator: "",
});

const avatar = ref(generateAvatar());

async function handleRegister(event: Event) {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    if (!form.checkValidity()) return;

    const profile = await $fetch("/api/self/profile", {
        method: "POST",
        body: {
            ...registerData.value,
            avatar: avatar.value,
        },
    });

    await authStore.tryAuthenticate();
}
</script>

<template>
    <ModalWrapper>
        <form @submit="handleRegister" class="text-white flex flex-col items-center">
            <div class="flex">
                <label for="name">Bot Name:</label>
                <input type="text" id="name" v-model="registerData.name" class="bg-black/40" placeholder="ColdClear"
                    required />
            </div>
            <div class="flex">
                <label for="creator">Creator/Team Name:</label>
                <input type="text" id="creator" v-model="registerData.creator" class="bg-black/40" placeholder="MinusKelvin"
                    required />
            </div>
            <AvatarEditor v-model="avatar" />
            <button>Submit</button>
        </form>
    </ModalWrapper>
</template>