const {Sequence} = require('../src/sequences');

function replacer(key, value) {
    if(value instanceof Map) {
      return {
        dataType: 'Map',
        value: Array.from(value.entries()), // or with spread: value: [...value]
      };
    } else {
      return value;
    }
  }
  function reviver(key, value) {
    if(typeof value === 'object' && value !== null) {
      if (value.dataType === 'Map') {
        return new Map(value.value);
      }
    }
    return value;
  }

let params = {
    name: 'Welcome', // Sequence name, also used for Dialogflow context name.
    activity: 'greeting each other', // Activity description, used in course correction.
    authRequired: false,
    breakIntents: [ // Intents that break from the core flow before attempting sequence navigation.
        { action: 'welcome.ask.wellbeing', trigger: '1' }
    ],
    createCtx: (sequence) => { // Initialize Dialogflow context parameters.
        let context = createBaseCtx (sequence.name, DEF_CTX_LIFESPAN);
        context.parameters = {
            saidFirstWelcome: '0',
            saidIntro: '0',
            askedWellbeing: '0',
            confirmedWellbeing: '0',
            confirmedWellbeingPositive: '0',
            confirmedWellbeingNegative: '0'
        };
        return context;
    },
    createCase: (agent, ctxSessionProps) => { // Create a case.
        let newCase = {
            subject: 'Failed to identify navigate conversation.',
            description: 'Something went wrong.',
            note: 'Case created.'
        };
        return newCase;
    },
    navigate: (agent, ctxSessionProps) => { // Navigate the sequence forward.
        let context = getOrCreateCtx(agent, CTX_WELCOME);

        if (context.parameters.saidFirstWelcome === '0') {
            if (context.parameters.saidIntro === '0') {
                let greetingEvent = returnFollowupEvent(agent, ctxSessionProps, 'SayIntro', ctxSessionProps.parameters.lastFulfillmentText);
                return;
            }

            if (context.parameters.askedWellbeing === '0') {
                let askWellbeingEvent = returnFollowupEvent(agent, ctxSessionProps, 'AskWellbeing', ctxSessionProps.parameters.lastFulfillmentText);
                return;
            }

            setContextParam(agent, context, 'saidFirstWelcome', '1');
        }

        if (context.parameters.confirmedWellbeing === '1') {
            popCompletedSequence (agent, ctxSessionProps, CTX_WELCOME);
            let askReasonForContactEvent = returnFollowupEvent(agent, ctxSessionProps, 'AskReasonForContact');
            return;
        }

        // Updated to reward the sequence stack to handle post-first-time greetings once ready.
        setFulfillmentText(agent, ctxSessionProps, context);
        console.log('action: '+agent.action+', lastFulfillmentText: '+ctxSessionProps.parameters.lastFulfillmentText);
        agent.add(ctxSessionProps.parameters.lastFulfillmentText);
        return;
    }
};

let sequence = new Sequence(params);

console.log(sequence);

console.log('Name: '+sequence.name);

sequence.name = 'New Welcome';

console.log('Name: '+sequence.name);
