# codingforconvos
I created this NPM library to simplify the journey to success with pro-code conversation management.  Dialogflow ES requires a pro-code solution to managing conversation runtime state effectively.  The initial goal of this project is to make life easier for creating pro-code conversations in Google Dialogflow ES for use with [Dialogflow phone gateway](https://cloud.google.com/dialogflow/es/docs/integrations/phone-gateway) and [Cisco Webex Contact Center](https://www.cisco.com/c/en_ca/products/contact-center/webex-contact-center/index.html).

```mermaid
sequenceDiagram
    participant User
    participant FacebookMessenger
    participant DialogflowES
    participant WebhookFulfillment
    User->>FacebookMessenger: Says: <br/>Hi there!
    FacebookMessenger->>DialogflowES: Detect Intent: <br/>Hi there!
    DialogflowES->>WebhookFulfillment: Fulfillment: <br/>Hi there!
    Note right of WebhookFulfillment: Update conversation state and<br/>move to the next turn!
    WebhookFulfillment-->>DialogflowES: Rsp: <br/>Hello, I'm Justin!
    DialogflowES-->>FacebookMessenger: Rsp: <br/>Hello, I'm Justin!
    FacebookMessenger-->>User: Rsp: <br/>Hello, I'm Justin!
```

# Getting Started

Within the [Dialogflow ES Console](https://dialogflow.cloud.google.com), navigate to **Fulfillment**, enable the **In-line Editor**.

![dialogflow-es-nav-fulfillment](https://github.com/jusranda/codingforconvos/blob/main/docs/assets/dialogflow-es-nav-fulfillment.png)
![dialogflow-es-fulfillment-inline-editor](https://github.com/jusranda/codingforconvos/blob/main/docs/assets/dialogflow-es-fulfillment-inline-editor.png)

Paste the contents of [this template file](https://github.com/jusranda/codingforconvos/blob/main/docs/assets/inline-fulfillment.js) into the *index.js* editor window.

Add the below dependency to the *package.json* editor window.

```
  "dependencies": {
    ...
    "codingforconvos": "^0.0.126",
    ...
  }
```

Click **Deploy**.

# Documentation

The latest javascript documentation can be found [here](https://htmlpreview.github.io/?https://github.com/jusranda/codingforconvos/blob/main/docs/codingforconvos/latest/index.html).