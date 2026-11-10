export const ELEMENT_TEMPLATES = [
    {
        $schema:
            "https://unpkg.com/@camunda/element-templates-json-schema/resources/schema.json",
        name: "Email Task",
        id: "io.camunda.examples.EmailTask",
        description: "Sends an email.",
        appliesTo: ["bpmn:ServiceTask"],
        category: {
            id: "communication",
            name: "Communication",
        },
        properties: [
            {
                type: "Hidden",
                value: "${mailDelegate}",
                editable: false,
                binding: {
                    type: "property",
                    name: "camunda:delegateExpression",
                },
            },
            {
                label: "Hostname",
                description: "The host name of the email server (SMTP)",
                type: "String",
                binding: {
                    type: "camunda:inputParameter",
                    name: "HOST_NAME",
                },
                constraints: {
                    notEmpty: true,
                },
            },
            {
                label: "Recipient",
                description: "The TO field",
                type: "String",
                binding: {
                    type: "camunda:inputParameter",
                    name: "recipient",
                },
                constraints: {
                    notEmpty: true,
                },
            },
            {
                label: "Subject",
                type: "String",
                binding: {
                    type: "camunda:inputParameter",
                    name: "subject",
                },
            },
            {
                label: "Body",
                type: "Text",
                binding: {
                    type: "camunda:inputParameter",
                    name: "message",
                },
            },
        ],
    },
];
