<script setup lang="ts">
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";

import { BpmnModeler, isContentSavedEvent, type ModelerEvent } from "../../src";

const xml = defineModel<string>("xml", { required: true });
const emit = defineEmits<{ event: [event: ModelerEvent] }>();

const container = useTemplateRef<HTMLDivElement>("container");
let root: Root | undefined;

const onEvent = (event: ModelerEvent) => {
    if (isContentSavedEvent(event)) {
        xml.value = event.data.xml;
    }
    emit("event", event);
};

const render = () => {
    root?.render(createElement(BpmnModeler, { xml: xml.value, onEvent }));
};

onMounted(() => {
    if (container.value) {
        root = createRoot(container.value);
        render();
    }
});

watch(xml, render);

onBeforeUnmount(() => {
    root?.unmount();
});
</script>

<template>
    <div ref="container" class="bpmn-modeler" />
</template>

<style scoped>
.bpmn-modeler {
    height: 100%;
}
</style>
