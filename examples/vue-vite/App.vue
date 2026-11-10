<script setup lang="ts">
import { ref } from "vue";

import BpmnModeler from "./BpmnModeler.vue";
import { START_EVENT_BPMN } from "./diagrams";

const xml = ref(START_EVENT_BPMN);
</script>

<template>
    <BpmnModeler v-model:xml="xml" />
</template>
