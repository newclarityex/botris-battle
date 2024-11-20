<script setup lang="ts">
import type { PublicBot } from '~/utils/general';

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'botUpdated'): void
}>();

const props = defineProps<{
    id: string,
    initialData: PublicBot,
}>();

const updatedData = ref({
    name: props.initialData.name,
    team: props.initialData.team,
    avatar: structuredClone(toRaw(props.initialData.avatar)),
    language: props.initialData.language ?? "",
    eval: props.initialData.eval ?? "",
    movegen: props.initialData.movegen ?? "",
    search: props.initialData.search ?? "",
});

const submitting = ref(false);

async function handleUpdate(event: Event) {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    if (!form.checkValidity()) return;

    submitting.value = true;

    const res = await $fetch(`/api/bot/${props.id}`, {
        method: "PATCH",
        body: updatedData.value,
    }).catch(e => {
        submitting.value = false;
        return null;
    });

    if (res) {
        emit('botUpdated');
        emit('close');
    };
}

const moreInfo = ref(false);
</script>

<template>
    <ModalWrapper>
        <form @submit="handleUpdate" class="text-white flex flex-col items-center py-6 px-12 gap-6"
            :class="{ 'pointer-events-none': submitting, 'opacity-50': submitting }">
            <h1 class="text-2xl text-primary p-0">Edit Bot</h1>
            <div class="w-full flex flex-col gap-4">
                <input type="text" id="name" v-model="updatedData.name" class="bg-black/40 p-1 text-lg text-center"
                    placeholder="Bot Name*" aria-label="Bot Name*" required :maxlength="32" />
                <input type="text" id="team" v-model="updatedData.team"
                    class="bg-black/40 p-1 text-lg text-center" placeholder="Team Name" :maxlength="32" />

                <template v-if="moreInfo">
                    <input type="text" id="language" v-model="updatedData.language"
                        class="bg-black/40 p-1 text-lg text-center" placeholder="Programming Language"
                        :maxlength="32" />
                    <input type="text" id="eval" v-model="updatedData.eval" class="bg-black/40 p-1 text-lg text-center"
                        placeholder="Eval" :maxlength="32" />
                    <input type="text" id="movegen" v-model="updatedData.movegen"
                        class="bg-black/40 p-1 text-lg text-center" placeholder="Movegen" :maxlength="32" />
                    <input type="text" id="search" v-model="updatedData.search"
                        class="bg-black/40 p-1 text-lg text-center" placeholder="Search" :maxlength="32" />
                </template>

                <button class="text-btn" @click="moreInfo = true" v-if="!moreInfo" type="button">More Info</button>
                <button class="text-btn" @click="moreInfo = false" v-if="moreInfo" type="button">Less Info</button>

                <AvatarEditor v-model="updatedData.avatar" />
            </div>
            <div class="flex gap-8">
                <button class="text-btn" type="button" @click="emit('close')">Cancel</button>
                <button class="text-btn" type="submit">Submit</button>
            </div>
        </form>
    </ModalWrapper>
</template>