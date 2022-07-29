/**
 * Copyright 2022 Cisco Systems Inc. All Rights Reserved.
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

const {cleanUpDfFulfillmentRequest} = require('../common');
const { ConvoClient } = require('../convos');
const { WebhookClient } = require('dialogflow-fulfillment');
const { SequenceManager } = require('../sequences');
const { IntentManager } = require('../intents');
const { ContextManager } = require('../contexts');

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
    }

    //////////////////////////////////
    // Define the main entry point. //
    //////////////////////////////////

    // Wrapper to better handle async/await.
    // TODO: Check if this is still required after refactoring.
    async executeHandler(agent, handler) {
        await agent.handleRequest(handler);
    }

    // Main logic for found intents.
    // agent - The dialogflow API client.
    // ctxSessionProps - The session properties.
    // sequenceCurrent - The current sequence.
    // context - The context associated with the intent.
    // intentAction - The intent action.
    async handleIntentAndNavigate(agent, ctxSessionProps, sequenceCurrent, context, intentAction) {
        console.log(intentAction+' found in intentManager');

        // Fetch the common sequence.
        let sequenceCommon = this._sequenceManager.get('common'); // FIXME: Move this to a common library.
                
        // Call await on handler, not on get.
        let funcHandler = this._intentManager.get(intentAction).handler;
        await funcHandler (agent, ctxSessionProps, sequenceCurrent, context);

        // Update the sequence and break if terminating statement or question.
        let sequenceUpdated = this._sequenceManager.get(ctxSessionProps.parameters.sequenceCurrent); // Get sequence after intent handler has run in case it updated.
        if (sequenceUpdated.breakIntents.has(intentAction) || sequenceCommon.breakIntents.has(intentAction)) {
            this._contextManager.setContextParam(agent, ctxSessionProps, 'lastAction', intentAction); // Update lastAction for break intents.
            agent.add(ctxSessionProps.parameters.lastFulfillmentText);
            return;
        }

        // Handle authentication.
        if (sequenceUpdated.authRequired === true && this._contextManager.isAuthRequired(agent, ctxSessionProps)) {
            this._contextManager.handleRequireAuthentication(agent, ctxSessionProps);
            return;
        }

        // Navigate the sequence forward.
        sequenceUpdated.navigate(agent, ctxSessionProps);
        return;
    }
    
    // Main intent handler entry point.
    async intentHandler(agent) {
        try {
            // Debug original query.
            console.log('User Said: '+agent.query);
            console.log('We Responded: '+((agent.consoleMessages[0] !== undefined) ? agent.consoleMessages[0].text : '<blank>'));

            // Create globally accessible sessionId.
            const sessionId = (agent.request_.body.session.indexOf('/') !== -1) ? agent.request_.body.session.split('/').pop() : '12345';

            // Fetch the session properties.
            let ctxSessionProps = await this._getSessionPropsContext(agent, sessionId, agent.request_);

            // Fetch the current sequence.
            let sequenceCurrent = this._sequenceManager.get(ctxSessionProps.parameters.sequenceCurrent);

            // Fetch the action-related context.
            let context = (this._intentManager.hasContext(agent.action)) ? this._contextManager.getOrCreateCtx(agent, this._intentManager.getContext(agent.action)) : {};
                
            // Handle a stand-alone intent.
            if (this._intentManager.has(agent.action)) {
                await this.handleIntentAndNavigate(agent, ctxSessionProps, sequenceCurrent, context, agent.action);
                return;
            }

            // Handle a composite intent.
            let lastAction = ctxSessionProps.parameters.lastAction;
            let compositeIntentName = lastAction+'.'+agent.action;
            let baseContext = (this._intentManager.hasContext(lastAction)) ? this._contextManager.getOrCreateCtx(agent, this._intentManager.getContext(lastAction)) : {};
            if (this._intentManager.has(compositeIntentName)) {
                await this.handleIntentAndNavigate(agent, ctxSessionProps, sequenceCurrent, baseContext, compositeIntentName);
                return;
            }

            // Handle a templated intent.
            let actiontemplateTail = (agent.action.indexOf('.') !== -1) ? agent.action.split('.').pop() : agent.action;
            if (this._intentManager.has(actiontemplateTail)) {
                await this.handleIntentAndNavigate(agent, ctxSessionProps, sequenceCurrent, context, actiontemplateTail);
                return;
            }

            // Handle no intent handlers found.
            console.log(agent.action+' has no associated handlers');
            this._contextManager.setFulfillmentText(agent, ctxSessionProps);
            sequenceCurrent.navigate(agent, ctxSessionProps);
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
        request = cleanUpDfFulfillmentRequest(request);
    
        // Create the dialogflow API client.
        const agent = new WebhookClient({ request, response });

        await this.executeHandler(agent, this.intentHandler);
    }
}
 
module.exports = {DialogFlowEsClient};