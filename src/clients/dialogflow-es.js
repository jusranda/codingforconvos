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

const { ConvoClient } = require('../convos');
const { WebhookClient } = require('dialogflow-fulfillment');
const { SequenceManager } = require('../sequences');
const { IntentManager } = require('../intents');
const { DialogContext, ContextManager } = require('../contexts');

const _sessionPathRegex = /\/locations\/[^/]+/;

/**
 * Remove extraneous session path components to make requests consistent across clients.
 * 
 * @example
 * request.body.session = _cleanUpSessionPath(request.body.session);
 * 
 * @param {string} sessionPath The Dialogflow ES session path.
 * @returns the cleaned up session path.
 */
function _cleanUpSessionPath(sessionPath) {
    return sessionPath
        .replace(_sessionPathRegex, '');
}

/**
 * Clean-up the output context object to make requests consistent across clients.
 * 
 * @example
 * equest.body.queryResult.outputContexts = request.body.queryResult.outputContexts
 *     .map((context) => _cleanUpDfOutputContext(context));
 * 
 * @param {Object} outputContext The Dialogflow ES output context.
 * @returns the cleaned up output context object.
 */
function _cleanUpOutputContext(outputContext) {
    let fixedContext = {};
    fixedContext.name = _cleanUpSessionPath(outputContext.name);
    fixedContext.lifespanCount = outputContext.lifespanCount;
    fixedContext.parameters = outputContext.parameters;
    return fixedContext;
}

/**
 * Clean-up the Dialogflow ES webhook fulfillment request.
 * 
 * @example
 * const cleanRequest = cleanUpRequest(request);
 * 
 * @param {Object} request The Dialogflow ES webhook fulfillment request.
 * @returns the cleaned up webhook fulfillment request.
 */
function cleanUpRequest(request) {
    request.body.session = _cleanUpSessionPath(request.body.session);
    request.body.queryResult.outputContexts = request.body.queryResult.outputContexts
        .map((context) => _cleanUpOutputContext(context));
    return request;
}

/**
 * This class handles all of the state objects representing the conversation.
 * All navifation across sequences and steps happens within.
 */
class DialogFlowEsClient extends ConvoClient {

    /**
     * Constructor for DialogFlowEsClient objects.
     * 
     * @example
     * const { DialogFlowEsClient } = require(codingforconvos);
     * const agent = new DialogFlowEsClient();
     */
    constructor(sequenceManager,intentManager,contextManager,getSessionPropsContext) {
        super('Dialogflow ES');

        if (typeof sequenceManager == 'undefined') {
            throw new Error('Error creating DialogFlowEsClient: sequenceManager is undefined');
        }

        if (typeof intentManager == 'undefined') {
            throw new Error('Error creating DialogFlowEsClient: intentManager is undefined');
        }

        if (typeof contextManager == 'undefined') {
            throw new Error('Error creating DialogFlowEsClient: contextManager is undefined');
        }

        if (typeof getSessionPropsContext == 'undefined') {
            throw new Error('Error creating DialogFlowEsClient: getSessionPropsContext is undefined');
        }

        /**
         * The sequence manager.
         * 
         * @private
         * @type {SequenceManager}
         */
        this._sequenceManager = sequenceManager;

        /**
         * The intent manager.
         * 
         * @private
         * @type {IntentManager}
         */
        this._intentManager = intentManager;

        /**
         * The intent manager.
         * 
         * @private
         * @type {ContextManager}
         */
        this._contextManager = contextManager;

        /**
         * The function to initialize the sesion props context.
         * 
         * @private
         * @type {Function}
         */
        this._getSessionPropsContext = getSessionPropsContext;
        
        this.executeHandler = this.executeHandler.bind(this);
        this.intentHandler = this.intentHandler.bind(this);
        this.handleIntentAndNavigate = this.handleIntentAndNavigate.bind(this);
        this.handleRequest = this.handleRequest.bind(this);
        this._getSessionPropsContext = this._getSessionPropsContext.bind(this);
    }

    //////////////////////////////////
    // Define the main entry point. //
    //////////////////////////////////

    // Wrapper to better handle async/await.
    // TODO: Check if this is still required after refactoring.
    async executeHandler(agent, handler) {
        await agent.handleRequest(handler);
    }

    /**
     * Run the intent handlers, fetch the updated (or not) sequence, and navigate to the next turn.
     * 
     * @param {DialogContext} dialogContext The dialog context.
     * @param {string} intentAction         The intent action.
     * @returns 
     */
    async handleIntentAndNavigate(dialogContext, intentAction) {
        console.log(intentAction+' found in intentManager');

        // Fetch the common sequence.
        let sequenceCommon = this._sequenceManager.get('common'); // FIXME: Move this to a common library.
                
        // Call await on handler, not on get.
        let funcHandler = this._intentManager.get(intentAction).handler;
        await funcHandler (dialogContext);

        // Update the sequence and break if terminating statement or question.
        let sequenceUpdated = this._sequenceManager.get(dialogContext.sessionParams.parameters.sequenceCurrent); // Get sequence after intent handler has run in case it updated.
        if (sequenceUpdated.breakIntents.has(intentAction) || sequenceCommon.breakIntents.has(intentAction)) {
            dialogContext.setParam(dialogContext.sessionParams, 'lastAction', intentAction); // Update lastAction for break intents.
            dialogContext.respondWithText(dialogContext.sessionParams.parameters.lastFulfillmentText);
            return;
        }

        // Handle authentication.
        if (sequenceUpdated.authRequired === true && dialogContext.isAuthRequired()) {
            this._contextManager.handleRequireAuthentication(agent, dialogContext.sessionParams);
            return;
        }

        // Navigate the sequence forward.
        sequenceUpdated.navigate(dialogContext);
        return;
    }
    
    /**
     * The main entry point from the dialogflow-fulfillment-nodejs API.
     * 
     * @param {WebhookClient} agent The dialogflow-fulfillment-nodejs API endpoint.
     * @returns 
     */
    async intentHandler(agent) {
        try {
            // Debug original query.
            console.log('User Said: '+agent.query);
            console.log('We Responded: '+((agent.consoleMessages[0] !== undefined) ? agent.consoleMessages[0].text : '<blank>'));

            // Create globally accessible sessionId.
            const sessionId = (agent.request_.body.session.indexOf('/') !== -1) ? agent.request_.body.session.split('/').pop() : '12345';

            // Fetch the session properties.
            if (typeof this._contextManager == 'undefined') {
                throw new Error('Error executing intentHandler: contextManager is undefined');
            }
            
            let ctxSessionProps = await this._getSessionPropsContext(agent, sessionId, this._contextManager, agent.request_);

            console.log('Fetched ctxSessionProps');

            // Fetch the current sequence.
            let sequenceCurrent = this._sequenceManager.get(ctxSessionProps.parameters.sequenceCurrent);

            console.log('Fetched sequenceCurrent');

            // Fetch the action-related context.
            let context = (this._intentManager.hasContext(agent.action)) ? this._contextManager.getOrCreateCtx(agent, this._intentManager.getContext(agent.action)) : {};

            console.log('Fetched context');
            
            let dialogContext = new DialogContext({
                sessionId: sessionId,
                dialogflowClient: this,
                dialogflowAgent: agent,
                contextManager: this._contextManager,
                sessionParams: ctxSessionProps,
                currentSequence: sequenceCurrent,
                currentContext: context
            });

            // Handle a stand-alone intent.
            if (this._intentManager.has(agent.action)) {
                await this.handleIntentAndNavigate(dialogContext, agent.action);
                return;
            }

            // Handle a composite intent.
            let lastAction = ctxSessionProps.parameters.lastAction;
            let compositeIntentName = lastAction+'.'+agent.action;
            let baseContext = (this._intentManager.hasContext(lastAction)) ? this._contextManager.getOrCreateCtx(agent, this._intentManager.getContext(lastAction)) : {};
            dialogContext.currentContext = baseContext;
            if (this._intentManager.has(compositeIntentName)) {
                await this.handleIntentAndNavigate(dialogContext, compositeIntentName);
                return;
            }

            // Handle a templated intent.
            let actiontemplateTail = (agent.action.indexOf('.') !== -1) ? agent.action.split('.').pop() : agent.action;
            if (this._intentManager.has(actiontemplateTail)) {
                await this.handleIntentAndNavigate(dialogContext, actiontemplateTail);
                return;
            }

            // Handle no intent handlers found.
            console.log(agent.action+' has no associated handlers');
            dialogContext.setFulfillmentText();
            sequenceCurrent.navigate(dialogContext);
            return;
        } catch (err) {
            console.error('Unhandled error: '+err.message);
        }
    }

    /**
     * Handle the Dialogflow ES webhook fulfillment request.
     * 
     * @example
     * const client = new DialogFlowEsClient();
     * const response = client.handleRequest(request)
     * 
     * @param {Object} request The HTTP request object.
     * @param {Object} response The HTTP response object.
     * @returns the cleaned up webhook fulfillment request.
     */
    async handleRequest(request, response) {
        // HTTP debug dump.
        console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
        console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

        // Clean-up the HTTP request for dialogflow-fulfillment + WxCC interoperability.
        request = cleanUpRequest(request);
    
        // Create the dialogflow API client.
        const agent = new WebhookClient({ request, response });

        await this.executeHandler(agent, this.intentHandler);
    }
}
 
module.exports = {DialogFlowEsClient};