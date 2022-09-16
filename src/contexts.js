/**
 * Copyright 2022 Justin Randall, Cisco Systems Inc. All Rights Reserved.
 * 
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU
 * General Public License as published by the Free Software Foundation, either version 3 of the License, or 
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without 
 * even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
 * See the GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License along with this program. If not, 
 * see <https://www.gnu.org/licenses/>.
 */

const { Sequence, SequenceManager } = require("./sequences");
const { ConnectorManager } = require("./connectors");
const { DialogFlowEsClient } = require("./clients/dialogflow-es");
const { fmtLog } = require("./common");
const { WebhookClient } = require("dialogflow-fulfillment");

const DEF_CTX_LIFESPAN = 99;

// Define Sequence Name Constants.
// FIXME: Find a better way to embed these.
const CTX_WELCOME = 'welcome';
const CTX_RFC = 'reasonforcontact';
const CTX_AUTH = 'authentication';
const CTX_PWRESET = 'passwordreset';

/**
 * Class for representing global and local contexts.
 */
class DialogContext {

    /**
     * Constructor for Context objects.
     * 
     * @example
     * const { DialogContext } = require(codingforconvos);
     * let params = { 'sessionId': 'abc123', 'dialogflowClient': dialogflowClient, ... };
     * const context = new DialogContext(params);
     * 
     * @param {Object} params The constructor parameters.
     */
    constructor(params) {
        // Validate the input parameters.
        if (params == undefined) { throw new Error('parameters object for creating DialogContext objects is missing.'); }
        if (params.sessionId == undefined) { throw new Error('sessionId is a required parameter for creating DialogContext objects.'); }
        if (params.dialogflowClient == undefined) { throw new Error('dialogflowClient is a required parameter for creating DialogContext objects.'); }
        if (params.dialogflowAgent == undefined) { throw new Error('dialogflowAgent is a required parameter for creating DialogContext objects.'); }
        if (params.contextManager == undefined) { throw new Error('contextManager is a required parameter for creating DialogContext objects.'); }
        if (params.sessionParams == undefined) { throw new Error('sessionParams is a required parameter for creating DialogContext objects.'); }
        if (params.currentSequence == undefined) { throw new Error('currentSequence is a required parameter for creating DialogContext objects.'); }
        if (params.currentContext == undefined) { throw new Error('currentContext is a required parameter for creating DialogContext objects.'); }
        if (params.connectorManager == undefined) { throw new Error('connectorManager is a required parameter for creating DialogContext objects.'); }

        /**
         * The session ID.
         * 
         * @private
         * @type {string}
         */
        this._sessionId = params.sessionId;

        /**
         * The Dialogflow ES client.
         * 
         * @private
         * @type {DialogFlowEsClient}
         */
        this._dialogflowClient = params.dialogflowClient;

        /**
         * The Dialogflow ES agent object.
         * 
         * @private
         * @type {Object}
         */
        this._dialogflowAgent = params.dialogflowAgent;

        /**
         * The context manager
         * 
         * @private
         * @type {ContextManager}
         */
        this._contextManager = params.contextManager;

        /**
         * The session properties.
         * 
         * @private
         * @type {Object}
         */
        this._sessionParams = params.sessionParams;

        /**
         * The current sequence.
         * 
         * @private
         * @type {Sequence}
         */
        this._currentSequence = params.currentSequence;

        /**
         * The current dialogflow context.
         * 
         * @private
         * @type {Object}
         */
        this._currentContext = params.currentContext;

        /**
         * The connector manager.
         * 
         * @private
         * @type {ConnectorManager}
         */
        this._connectorManager = params.connectorManager;

        this.setFulfillmentText = this.setFulfillmentText.bind(this);
        this.appendFulfillmentText = this.appendFulfillmentText.bind(this);
        this.setFulfillmentCourseCorrect = this.setFulfillmentCourseCorrect.bind(this);
        this.setFollowupEvent = this.respondWithEvent.bind(this);
        this.updateDialogflowEsContext = this.updateDialogflowEsContext.bind(this);
        this.setParam = this.setParam.bind(this);
        this.setParams = this.setParams.bind(this);
        this.isAuthRequired = this.isAuthRequired.bind(this);
        this.getOrCreateCtx = this.getOrCreateCtx.bind(this);
        
        this.pushSequence = this.pushSequence.bind(this);
        this.popSequence = this.popSequence.bind(this);
        this.popSequenceAndNavigate = this.popSequenceAndNavigate.bind(this);
    }

    /**
     * Gets the sessionId.
     * 
     * @return The sessionId.
     */
    get sessionId() { return this._sessionId; }
    /**
     * Sets the sessionId.
     * 
     * @param {string} value The value.
     */
    set sessionId(value) { this._sessionId = value; }

    /**
     * Gets the dialogflowClient.
     * 
     * @return The dialogflowClient.
     */
    get dialogflowClient() { return this._dialogflowClient; }
    /**
     * Sets the dialogflowClient.
     * 
     * @param {string} value The value.
     */
    set dialogflowClient(value) { this._dialogflowClient = value; }

    /**
     * Gets the dialogflowAgent.
     * 
     * @return The dialogflowAgent.
     */
    get dialogflowAgent() { return this._dialogflowAgent; }
    /**
     * Sets the dialogflowAgent.
     * 
     * @param {string} value The value.
     */
    set dialogflowAgent(value) { this._dialogflowAgent = value; }

    /**
     * Gets the contextManager.
     * 
     * @return The contextManager.
     */
    get contextManager() { return this._contextManager; }
    /**
     * Sets the contextManager.
     * 
     * @param {Object} value The value.
     */
    set contextManager(value) { this._contextManager = value; }

    /**
     * Gets the connectorManager.
     * 
     * @return The connectorManager.
     */
    get connectorManager() { return this._connectorManager; }
    /**
     * Sets the connectorManager.
     * 
     * @param {Object} value The value.
     */
    set connectorManager(value) { this._connectorManager = value; }

    /**
     * Gets the sessionParams.
     * 
     * @return The sessionParams.
     */
    get sessionParams() { return this._sessionParams; }
    /**
     * Sets the sessionParams.
     * 
     * @param {string} value The value.
     */
    set sessionParams(value) { this._sessionParams = value; }

    /**
     * Gets the session parameters.
     * 
     * @return The session parameters.
     */
    get params() { return this._sessionParams.parameters; }
    /**
     * Sets the session parameters.
     * 
     * @param {string} value The value.
     */
    set params(value) { this._sessionParams.parameters = value; }

    /**
     * Gets the agent-received input parameters.
     * 
     * @return The agent-received input parameters.
     */
    get inparams() { return this._dialogflowAgent.parameters; }
    /**
     * Sets the agent-received input parameters.
     * 
     * @param {Object} value The value.
     */
    set inparams(value) { this._dialogflowAgent.parameters = value; }

    /**
     * Gets the current context parameters.
     * 
     * @return The current context parameters.
     */
    get ctxparams() { return this._currentContext.parameters; }
    /**
     * Sets the current context parameters.
     * 
     * @param {Object} value The value.
     */
    set ctxparams(value) { this._currentContext.parameters = value; }

    /**
     * Gets the currentSequence.
     * 
     * @return The currentSequence.
     */
    get currentSequence() { return this._currentSequence; }
    /**
     * Sets the currentSequence.
     * 
     * @param {Sequence} value The value.
     */
    set currentSequence(value) { this._currentSequence = value; }

    /**
     * Gets the currentContext.
     * 
     * @return The currentContext.
     */
    get currentContext() { return this._currentContext; }
    /**
     * Sets the currentContext.
     * 
     * @param {string} value The value.
     */
    set currentContext(value) { this._currentContext = value; }

    /**
     * Gets the current action.
     * 
     * @return The currentAction.
     */
    get currentAction() { return this._dialogflowAgent.action; }
    /**
     * Sets the current action.
     * 
     * @param {string} value The value.
     */
    set currentAction(value) { this._dialogflowAgent.action = value; }

    // TODO: Abstract the payload to the dialogflow-es client.

    /**
     * Gets the payload.
     * 
     * @return The payload.
     */
    get payload() { return this._dialogflowAgent.request_.body.originalDetectIntentRequest.payload; }
    /**
     * Sets the payload.
     * 
     * @param {Object} value The value.
     */
    set payload(value) { this._dialogflowAgent.request_.body.originalDetectIntentRequest.payload = value; }

    /**
     * Sets the fulfillment text response according to the provided text, or the Dialogflow default response.
     * 
     * @example
     * dialogContext.setFulfillmentText('Hi there!');            // lastFulfillmentText = 'Hi there!'
     * dialogContext.setFulfillmentText('How are you today?');   // lastFulfillmentText = 'How are you today?'
     * 
     * @param {string} fulfillmentText   The fulfillment text.
     * @returns 
     */
    setFulfillmentText (fulfillmentText='|') {
        this._sessionParams.parameters.lastFulfillmentText =
            (fulfillmentText !== '|') ? fulfillmentText : this._dialogflowAgent.consoleMessages[0].text;
        this.updateDialogflowEsContext(this._sessionParams);
        return;
    }

    /**
     * Appends the fulfillment text response according to the provided text, or the Dialogflow default response.
     * 
     * @example
     * dialogContext.appendFulfillmentText('Hi there!');            // lastFulfillmentText = 'Hi there!'
     * dialogContext.appendFulfillmentText('How are you today?');   // lastFulfillmentText = 'Hi there!  How are you today?'
     * 
     * @param {string} fulfillmentText   The fulfillment text.
     * @returns 
     */
    appendFulfillmentText (fulfillmentText='|') {
        this._sessionParams.parameters.lastFulfillmentText = this._sessionParams.parameters.lastFulfillmentText + '  ' + 
            ((fulfillmentText !== '|') ? fulfillmentText : this._dialogflowAgent.consoleMessages[0].text);
        this.updateDialogflowEsContext(this._sessionParams);
        return;
    }

    /**
     * Respond to the conversation turn with fulfillment text.
     * 
     * @example
     * context.respondWithText();                   // Responds with value of sessionParams.lastFulfillmentText
     * context.respondWithText('Have a nice day!'); // Response with 'Have a nice day!'
     * 
     * @param {string} fulfillmentText  The fulfillment response text, or lastFulfillmentText is not provided.
     */
    respondWithText(fulfillmentText = '|') {
        this._dialogflowAgent.add(
            ((fulfillmentText !== '|') ? fulfillmentText : this._sessionParams.parameters.lastFulfillmentText)
        );
    }

    /**
     * Respond to the conversation turn with a follow-up event.
     * 
     * @example
     * context.respondWithEvent('SayIntro');
     * 
     * @param {string} eventName        The event name.
     * @param {string} fulfillmentText  The optional fulfillment text.  It will only be logged, but not uttered due to the event.
     * @returns the follow-up event.
     */
    respondWithEvent(eventName, fulfillmentText = '|') {
        // Add dummy reply due to dialogflow-fulfillment-nodejs API behaviour.
        this._dialogflowAgent.add(
            ((fulfillmentText !== '|') ? fulfillmentText : this._sessionParams.parameters.lastFulfillmentText)
        ); 
        this.setParam(this._sessionParams, 'lastEvent', eventName);
        let event = this._dialogflowAgent.setFollowupEvent(eventName);
        return event;
    }

    /**
     * Capture the current reposnse and respond to the conversation turn with a follow-up event
     * to correct the course back to the current sequence step.
     * 
     * @param {string} fulfillmentText  The repsonse text to capture.
     * @returns 
     */
    setFulfillmentCourseCorrect (fulfillmentText) {
        this.setFulfillmentText(fulfillmentText);
        this.respondWithEvent(this._sessionParams.parameters.lastEvent, this._sessionParams.parameters.lastFulfillmentText); // TODO: Likely remove lastFulfillmentText since it's pointless.
        return;
    }

    /**
     * Sets a global session parameter.
     * 
     * @example
     * dialogContext.setSessionParam('paramName': paramValue);
     * 
     * @param {string} paramName    The parameter name.
     * @param {string} paramValue   The parameter value.
     * @returns 
     */
    setSessionParam(paramName, paramValue) {
        this.setParam (this._sessionParams, paramName, paramValue);
        return;
    }

    /**
     * Sets a set of global session parameters.
     * 
     * @example
     * dialogContext.setSessionParams({
     *  'paramName1': paramValue1,
     *  'paramName2': paramValue2,
     *  'paramName3': paramValue3
     * });
     * 
     * @param {Object} params   The set of parameters.
     * @returns 
     */
    setSessionParams(params) {
        this.setParams (this._sessionParams, params);
        return;
    }

    /**
     * Sets a current context parameters.
     * 
     * @example
     * dialogContext.setCurrentParam('paramName': paramValue);
     * 
     * @param {string} paramName    The parameter name.
     * @param {string} paramValue   The parameter value.
     * @returns 
     */
    setCurrentParam(paramName, paramValue) {
        this.setParam (this._currentContext, paramName, paramValue);
        return;
    }

    /**
     * Sets a set of current context parameters.
     * 
     * @example
     * dialogContext.setCurrentParams({
     *  'paramName1': paramValue1,
     *  'paramName2': paramValue2,
     *  'paramName3': paramValue3
     * });
     * 
     * @param {Object} params   The set of parameters.
     * @returns 
     */
    setCurrentParams(params) {
        this.setParams (this._currentContext, params);
        return;
    }

    /**
     * Sets a parameter on a provided context.
     * 
     * @example
     * let context = dialogContext.getOrCreateCtx('someContextName');
     * dialogContext.setParam(context, 'paramName': paramValue);
     * 
     * @param {Object} context      The provided context.
     * @param {string} paramName    The parameter name.
     * @param {string} paramValue   The parameter value.
     * @returns 
     */
    setParam (context, paramName, paramValue) {
        context.parameters[paramName] = paramValue;
        this.updateDialogflowEsContext(context);
        return;
    }

    /**
     * Sets a set of parameter on a provided contexts.
     * 
     * @example
     * let context = dialogContext.getOrCreateCtx('someContextName');
     * dialogContext.setParams(context, {
     *  'paramName1': paramValue1,
     *  'paramName2': paramValue2,
     *  'paramName3': paramValue3
     * });
     * 
     * @param {Object} context      The provided context.
     * @param {Object} params       The set of parameters.
     * @returns 
     */
    setParams (context, params) {
        for (var param in params) {
            if (Object.prototype.hasOwnProperty.call(params, param)) {
                context.parameters[param] = params[param];
            }
        }
        this.updateDialogflowEsContext(context);
        return;
    }

    /**
     * Persist updated context changes to the dialogflow-fulfillment-nodejs API state.
     * 
     * @example
     * context.parameters.someParam = someValue;
     * 
     * dialogContext.updateDialogflowEsContext(context);        // Persists parameters changes and sets lifespan to 99 turns.
     * dialogContext.updateDialogflowEsContext(context, 5);     // Persists parameters changes and sets lifespan to 5 turns.
     * 
     * @param {Object} context      The updated context.
     * @param {number} newLifespan  The updated lifespan.
     */
    updateDialogflowEsContext(context, newLifespan = DEF_CTX_LIFESPAN) {
        context.lifespan = newLifespan;
        this._dialogflowAgent.context.set(context);
    }

    /**
     * Check if the current dialog session requires authentication.
     * 
     * @returns true if the current dialog session requires authentication, otherwise false.
     */
    isAuthRequired() {
        let context = this._contextManager.getOrCreateCtx(this._dialogflowAgent, CTX_AUTH);
        return (this._sessionParams.parameters.customerIdentified === '0' || this._sessionParams.parameters.customerValidated === '0' || context.parameters.validationStatus !== '1');
    }

    // FIXME: Separate agent assistance to its own sequence.
    /**
     * Reset the global flags for offering agent assistance.
     */
    resetOfferedAgentFlags() {
        this.setParams (this._sessionParams, {
            'offeredAgent': '0',
            'offeredAgentAccepted': '0',
            'offeredAgentDeclined': '0'
        });
    }

    /**
     * Retrieve or create a context.
     * 
     * @param {string} name The context name. 
     * @returns the found or newly created context.
     */
    getOrCreateCtx(name) {
        return this._contextManager.getOrCreateCtx(this._dialogflowAgent, name);
    }

    /**
     * Delete a context.
     * @param {string} name The context name. 
     */
    deleteCtx(name) {
        this._dialogflowAgent.context.delete(name);
    }

    /**
     * Push a sequence onto the stack.
     * @param {string} name The sequence name.
     * @returns 
     */
    pushSequence (name) {
        this._sessionParams.parameters.sequenceCurrent = name;
        if (this._sessionParams.parameters.sequenceStack === CTX_WELCOME || this._sessionParams.parameters.sequenceStack === '') {
            this._sessionParams.parameters.sequenceStack = (name === CTX_RFC) ? name : CTX_RFC + '|' + name;
            if (name !== CTX_RFC) {
                this._sessionParams.parameters.triggeredSkill = '1';
            }
            this.updateDialogflowEsContext(this._sessionParams);
            return;
        }
        this._sessionParams.parameters.sequenceStack = this._sessionParams.parameters.sequenceStack + '|' + name;
        this.updateDialogflowEsContext(this._sessionParams);
        return;
    }

    /**
     * Pop a sequence off of the stack.
     * @param {string} name The sequence name.
     * @returns 
     */
    popSequence (name) {
        // If sequence is corrupt, empty, or in welcome state, fallback to reason for calling sequence.
        if (this._sessionParams.parameters.sequenceStack.indexOf('|') === -1) {
            this.setParams (this._sessionParams, {
                'sequenceCurrent': CTX_RFC,
                'sequenceStack': (name === CTX_RFC) ? name : CTX_RFC
            });
            return;
        }
    
        let sequenceStack = this._sessionParams.parameters.sequenceStack.split('|');
    
        if (sequenceStack[sequenceStack.length-1] !== name) { // Integrity check that we're removing the sequence we think we are.
            console.error(fmtLog('popSequence', 'Error: Expecting to pop '+name+' off of Stack: '+this._sessionParams.parameters.sequenceStack, this));
        }
    
        let newSequenceStack = sequenceStack.slice(0, sequenceStack.length-1);
        let newSequence = newSequenceStack[newSequenceStack.length-1];
        let newSequenceStackString = newSequenceStack.join('|');
            
        this.setParams (this._sessionParams, {
            'sequenceCurrent': newSequence,
            'sequenceStack': newSequenceStackString
        });
        return;
    }

    popSequenceAndNavigate(name) {
        this.popSequence (name);
        let sequenceUpdated = this._contextManager.sequenceManager.get(this._sessionParams.parameters.sequenceCurrent);
        console.log(fmtLog('popSequenceAndNavigate', 'Calling '+sequenceUpdated.name+'.navigate()', this));
        sequenceUpdated.navigate(this);
        return;
    }
}

/**
 * This class represents a context manager.
 */
class ContextManager {

    /**
     * Construct a new instance.
     * 
     * @param {SequenceManager} sequenceManager     The sequence manager.
     */
    constructor(sequenceManager) {
        this._sequenceManager = sequenceManager;

        this.getOrCreateCtx = this.getOrCreateCtx.bind(this);
        this.createCtx = this.createCtx.bind(this);
        this.handleRequireAuthentication = this.handleRequireAuthentication.bind(this);
    }

    /**
     * Gets the sequenceManager.
     * 
     * @return The sequenceManager.
     */
    get sequenceManager() { return this._sequenceManager; }
    /**
     * Sets the sequenceManager.
     * 
     * @param {SequenceManager} value The value.
     */
    set sequenceManager(value) { this._sequenceManager = value; }

    /**
     * Retrieve or create a context.
     * 
     * @param {WebhookClient}   agent The dialogflow-flufillment-nodejs API endpoint.
     * @param {string}          name The context name. 
     * @returns the found or newly created context.
     */
    getOrCreateCtx(agent, name) {
        let context = agent.context.get(name);
        if (!context) {
            let sequence = this._sequenceManager.get(name);
            context = this.createCtx(sequence.name, sequence.params);
            agent.context.set(context);
        }
        return context;
    }

    /**
     * Create a new context.
     * 
     * @param {string} name         The context name.
     * @param {Object} params       The context parameters.
     * @param {number} lifespan     The optional context lifespan.
     * @returns a new initialized context.
     */
    createCtx (name, params, lifespan=DEF_CTX_LIFESPAN) {
        let context = {};
        context.name = name;
        context.lifespan = lifespan;
        context.parameters = {};

        for (var param in params) {
            if (Object.prototype.hasOwnProperty.call(params, param)) {
                context.parameters[param] = params[param];
            }
        }

        return context;
    }

    /**
     * Handle checking and enforcing authentication on the session.
     * 
     * @param {DialogContext} dialogContext The dialog context.
     * @returns 
     */
    handleRequireAuthentication(dialogContext) {
        let context = dialogContext.getOrCreateCtx(CTX_AUTH);
        let sequenceCurrent = this._sequenceManager.get(dialogContext.params.sequenceCurrent);
    
        if (context.parameters.validationStatus === '1') { // Should never occur, so correct application state to pass authentication check.
            dialogContext.setParam(dialogContext.sessionParams, 'customerValidated', '1');
            let sequenceCurrent = this._sequenceManager.get(dialogContext.params.sequenceCurrent);
            sequenceCurrent.navigate(dialogContext);
        }
        
        if (context.parameters.validationStatus === '2') {
            if (dialogContext.params.offeredAgent === '0') {
                dialogContext.setParam(dialogContext.sessionParams, 'lastFulfillmentText', 'I\'m sorry, but '+sequenceCurrent.activity+' isn\'t something I can do without validating your identity.'); // Use counters to match advisories with authentication attempt count.
                let event = dialogContext.setFollowupEvent(dialogContext.dialogflowAgent, dialogContext.sessionParams, 'OfferSpeakToAgent', dialogContext.params.lastFulfillmentText);
                return;
            }
            if (dialogContext.params.offeredAgentAccepted === '1') {
                let event = dialogContext.setFollowupEvent(dialogContext.dialogflowAgent, dialogContext.sessionParams, 'EscalateToAgent', dialogContext.params.lastFulfillmentText);
                return;
            }
            if (dialogContext.params.offeredAgentDeclined === '1') {
                dialogContext.resetOfferedAgentFlags();
                dialogContext.popSequenceAndNavigate(CTX_PWRESET);
                return;
            }
        }
    
        dialogContext.pushSequence(CTX_AUTH);
        let sequenceAuth = this._sequenceManager.get(CTX_AUTH);
        sequenceAuth.navigate(dialogContext);
        return;
    }
    
}

module.exports = {DialogContext, ContextManager};