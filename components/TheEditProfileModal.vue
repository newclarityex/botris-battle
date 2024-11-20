<script setup lang="ts">
const emit = defineEmits<{
    (e: 'close'): void
}>();
const authStore = useAuthStore();

const updatedData = ref({
    displayName: authStore.profile?.displayName ?? "",
});

async function handleRegister(event: Event) {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    if (!form.checkValidity()) return;

    await $fetch("/api/self/profile", {
        method: "PATCH",
        body: updatedData.value,
    });

    await authStore.tryAuthenticate();
    emit('close')
}
</script>

<template>
    <ModalWrapper>
        <form @submit="handleRegister" class="text-white flex flex-col items-center py-6 px-12 gap-4">
            <h1 class="text-2xl text-primary p-0">Update Display Name</h1>
            <div class="flex">
                <input type="text" id="display-name" v-model="updatedData.displayName" class="bg-black/40 p-1 text-lg text-center"
                    placeholder="Display Name" aria-label="Display Name" required />
            </div>
            <div class="flex gap-8">
                <button class="text-btn" type="button" @click="emit('close')">Close</button>
                <button class="text-btn">Submit</button>
            </div>
        </form>
    </ModalWrapper>
</template>