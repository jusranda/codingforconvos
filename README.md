# codingforconvos
I created this NPM library to simplify the journey to success with pro-code conversation management.  Dialogflow ES requires a pro-code solution to managing conversation runtime state effectively.  The initial goal of this project is to make life easier for creating pro-code conversations in Google Dialogflow ES for use with [Dialogflow phone gateway](https://cloud.google.com/dialogflow/es/docs/integrations/phone-gateway) and [Cisco Webex Contact Center](https://www.cisco.com/c/en_ca/products/contact-center/webex-contact-center/index.html).

```mermaid
sequenceDiagram
    participant User
    participant FacebookMessenger
    participant DialogflowES
    participant WebhookFulfillment
    User->>FacebookMessenger: Says: Hi there!
    FacebookMessenger->>DialogflowES: Detect Intent: Hi there!
    DialogflowES->>WebhookFulfillment: Fulfillment: Hi there!
    Note right of WebhookFulfillment: Update conversation state and<br/>move to the next turn!
    WebhookFulfillment-->>DialogflowES: Hello, I'm Justin!
    DialogflowES-->>FacebookMessenger: Hello, I'm Justin!
    FacebookMessenger-->>User: Hello, I'm Justin!
```