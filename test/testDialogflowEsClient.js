'use strict';

const {DialogFlowEsClient,Sequence,SequenceManager,Intent,IntentManager,ContextManager} = require('codingforconvos');

// Initialize sequence and intent maps.
const sequenceManager = new SequenceManager();
const intentManager = new IntentManager();
const contextManager = new ContextManager(sequenceManager);

async function getSessionPropsContext(agent, sessionId, request={}) {
    return;
}

let dialogflowEsClient = new DialogFlowEsClient(
    sequenceManager, 
    intentManager, 
    contextManager, 
    getSessionPropsContext
);