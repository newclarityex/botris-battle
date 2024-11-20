<script setup lang="ts">
const emit = defineEmits<{
    (e: 'close'): void
    (e: 'botCreated'): void
}>();

const registerData = ref({
    name: "",
    team: "",
    avatar: generateRandomAvatar(),
    language: "",
    eval: "",
    movegen: "",
    search: "",
});

const submitting = ref(false);

async function handleRegister(event: Event) {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    if (!form.checkValidity()) return;

    submitting.value = true;

    const res = await $fetch("/api/bot", {
        method: "POST",
        body: registerData.value,
    }).catch(e => {
        submitting.value = false;
        return null;
    });

    if (res) {
        emit('botCreated');
        emit('close');
    };
}

const moreInfo = ref(false);
</script>

<template>
    <ModalWrapper>
        <form @submit="handleRegister" class="text-white flex flex-col items-center py-6 px-12 gap-6"
            :class="{ 'pointer-events-none': submitting, 'opacity-50': submitting }">
            <h1 class="text-2xl text-primary p-0">New Bot</h1>
            <div class="w-full flex flex-col gap-4">
                <input type="text" id="name" v-model="registerData.name" class="bg-black/40 p-1 text-lg text-center"
                    placeholder="Bot Name*" aria-label="Bot Name*" required :maxlength="32" />
                <input type="text" id="team" v-model="registerData.team"
                    class="bg-black/40 p-1 text-lg text-center" placeholder="Team Name" :maxlength="32" />

                <template v-if="moreInfo">
                    <input type="text" id="creator" v-model="registerData.language"
                        class="bg-black/40 p-1 text-lg text-center" placeholder="Programming Language" :maxlength="32" />
                    <input type="text" id="eval" v-model="registerData.eval"
                        class="bg-black/40 p-1 text-lg text-center" placeholder="Eval" :maxlength="32" />
                    <input type="text" id="movegen" v-model="registerData.movegen"
                        class="bg-black/40 p-1 text-lg text-center" placeholder="Movegen" :maxlength="32" />
                    <input type="text" id="search" v-model="registerData.search"
                        class="bg-black/40 p-1 text-lg text-center" placeholder="Search" :maxlength="32" />
                </template>

                <button class="text-btn" @click="moreInfo = true" v-if="!moreInfo" type="button">More Info</button>
                <button class="text-btn" @click="moreInfo = false" v-if="moreInfo" type="button">Less Info</button>

                <AvatarEditor v-model="registerData.avatar" />
            </div>
            <div class="flex gap-8">
                <button class="text-btn" type="button" @click="emit('close')">Cancel</button>
                <button class="text-btn" type="submit">Submit</button>
            </div>
        </form>
    </ModalWrapper>
</template>