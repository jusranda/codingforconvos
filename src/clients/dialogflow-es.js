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
const { Sequence, SequenceManager } = require('../sequences');
const { IntentManager } = require('../intents');
const { DialogContext, ContextManager } = require('../contexts');
const { fmtLog } = require('../common');
const { ConnectorManager, Connector, DefaultParameterManager } = require('../connectors');

// Define Global Context Constants.
const SESSION_PROPS = 'sessionprops';
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
 * Initialize the sequence manager.
 * 
 * @param {SequenceManager} sequenceManager   The sequence manager.
 * @return {SequenceManager} The initialized sequence manager.
 */
function initializeSequenceManager (sequenceManager) {
    const newSequenceManager = (sequenceManager != undefined) ? sequenceManager : new SequenceManager();
    newSequenceManager.registerSequence(new Sequence({
        name: 'unassociated', // Sequence name, also used for Dialogflow context name.
        activity: 'what we were doing', // Activity description, used in course correction.
        identityRequired: false,
        authRequired: false,
        params: {
            none: '0'
        },
        navigate: (dialogContext) => { // Navigate the sequence forward.
            dialogContext.setFulfillmentText();
            console.log('action: '+dialogContext.currentAction+', lastFulfillmentText: '+dialogContext.params.lastFulfillmentText);
            dialogContext.respondWithText();
            return;
        }
    }));
    return newSequenceManager;
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
    constructor(params) {
        super('Dialogflow ES');

        // Validate the input parameters.
        if (params == undefined) { throw new Error('parameters object for creating DialogFlowEsClient objects is missing.'); }
        if (params.baseParams == undefined) { throw new Error('baseParams is a required parameter for creating DialogFlowEsClient objects.'); }
        
        /**
         * The sequence manager.
         * 
         * @private
         * @type {SequenceManager}
         */
        this._sequenceManager = initializeSequenceManager(params.sequenceManager);

        /**
         * The intent manager.
         * 
         * @private
         * @type {IntentManager}
         */
        this._intentManager = (params.intentManager != undefined) ? params.intentManager : new IntentManager();

        /**
         * The context manager.
         * 
         * @private
         * @type {ContextManager}
         */
        this._contextManager = (params.contextManager != undefined) ? params.contextManager : new ContextManager(this._sequenceManager);

        /**
         * The connector manager.
         * 
         * @private
         * @type {ConnectorManager}
         */
        this._connectorManager = (params.connectorManager != undefined) ? params.connectorManager : new ConnectorManager({
            defaultParameterManager: new DefaultParameterManager()
        });

        /**
         * The function to populate the session props context using the Dialogflow ES payload.
         * 
         * @private
         * @type {Function}
         */
        this._populateFromEsPayload = (params.populateFromEsPayload != undefined) ? params.populateFromEsPayload : (sessioncontext, dialogContext) => { return sessioncontext; };

        /**
         * The function to populate the session props context using the lookup function.
         * 
         * @private
         * @type {Function}
         */
        this._populateFromLookup = (params.populateFromLookup != undefined) ? params.populateFromLookup : async (sessioncontext, dialogContext) => { return sessioncontext; };

        /**
         * The function to initialize the sesion props base parameters.
         * 
         * @private
         * @type {Object}
         */
        this._baseParams = (params.baseParams != undefined) ? params.baseParams : {};
        
        this.executeHandler = this.executeHandler.bind(this);
        this.intentHandler = this.intentHandler.bind(this);
        this.handleIntentAndNavigate = this.handleIntentAndNavigate.bind(this);
        this.handleRequest = this.handleRequest.bind(this);
        this._populateFromEsPayload = this._populateFromEsPayload.bind(this);
        this._populateFromLookup = this._populateFromLookup.bind(this);
        this.getOrCreateEsSessionProps = this.getOrCreateEsSessionProps.bind(this);
        this.createEsSessionProps = this.createEsSessionProps.bind(this);
        
        this.registerConnector = this.registerConnector.bind(this);
        this.registerSequence = this.registerSequence.bind(this);
        this.registerIntent = this.registerIntent.bind(this);
    }

    /**
     * Registers a connector with the connector manager.
     * 
     * @param {Connector} sequence The connector object.
     */
    registerConnector(connector) {
        this._connectorManager.registerConnector(connector);
    }

    /**
     * Registers a sequence with the sequence manager.
     * 
     * @param {Sequence} sequence The sequence object.
     */
    registerSequence(sequence) {
        this._sequenceManager.registerSequence(sequence)
    }

    /**
     * Registers an intent with the intent manager.
     * 
     * @param {Intent} intent The intent object.
     */
    registerIntent(intent) {
        this._intentManager.registerIntent(intent);
    }

    /**
     * Registers an array of intent actions with shared handling with the intent manager.
     * 
     * @param {Object} params The list of actions and associated sequenceName and handler.
     */
    registerIntents(params) {
        this._intentManager.registerIntents(params);
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
        console.log(fmtLog('handleIntentAndNavigate', intentAction+' found in intentManager', dialogContext));

        // Call await on handler, not on get.
        let intent = this._intentManager.get(intentAction);
        let funcHandler = intent.handler;
        await funcHandler (dialogContext);

        //console.log(fmtLog('handleIntentAndNavigate', intentAction+' funcHandler complete', dialogContext));

        // Update the sequence and break if terminating statement or question.
        let sequenceUpdated = this._sequenceManager.get(dialogContext.sessionParams.parameters.sequenceCurrent); // Get sequence after intent handler has run in case it updated.
        
        //console.log(fmtLog('handleIntentAndNavigate', 'updated sequence: '+sequenceUpdated.name, dialogContext));

        // Handle response already set.
        if (dialogContext.sessionParams.parameters.responseAlreadySet === '1') {
            //console.log(fmtLog('handleIntentAndNavigate', 'responseAlreadySet === \'1\'', dialogContext));
            if (intent.waitForReply === true) {
                dialogContext.setParam(dialogContext.sessionParams, 'lastAction', intentAction); // Update lastAction for break intents.
            }
            return;
        }
        //console.log(fmtLog('handleIntentAndNavigate', 'responseAlreadySet === \'0\'', dialogContext));

        // Handle response wait for reply set.
        if (intent.waitForReply === true) {
            //console.log(fmtLog('handleIntentAndNavigate', 'intent.waitForRepl === true', dialogContext));
            console.log(fmtLog('handleIntentAndNavigate', 'breakIntents - Calling respondWithText()', dialogContext));
            dialogContext.setParam(dialogContext.sessionParams, 'lastAction', intentAction); // Update lastAction for break intents.
            dialogContext.respondWithText(dialogContext.sessionParams.parameters.lastFulfillmentText);
            return;
        }
        //console.log(fmtLog('handleIntentAndNavigate', 'intent.waitForRepl === false', dialogContext));
        
        // Handle authentication.
        if (sequenceUpdated.authRequired === true && dialogContext.isAuthRequired()) {
            console.log(fmtLog('handleIntentAndNavigate', 'Calling handleRequireAuthentication()', dialogContext));
            this._contextManager.handleRequireAuthentication(dialogContext);
            return;
        }

        console.log(fmtLog('handleIntentAndNavigate', 'Calling '+sequenceUpdated.name+'.navigate()', dialogContext));

        // Navigate the sequence forward.
        sequenceUpdated.navigate(dialogContext);
        return;
    }
    
    /**
     * Fetch or Create the Dialogflow ES session props.
     * 
     * @param {Object} sessionId    The Dialogflow API endpoint.
     * @param {string} sessionId    The Dialogflow session ID.
     * @returns the Dialogflow ES session props.
     */
    getOrCreateEsSessionProps(agent, sessionId) {
        let ctxSessionProps = agent.context.get(SESSION_PROPS);
        if (!ctxSessionProps) {
            // Initialize base Dialogflow ES context.
            console.log('Creating session props for Dialogflow session '+sessionId+'.');
            ctxSessionProps = this.createEsSessionProps(sessionId);

            // Register dynamic parameter sets.
            let paramSets = this._connectorManager.getDefaultPropertyManager().getSets();

            for (var paramSetKey in paramSets) {
                const paramSet = paramSets[paramSetKey];
                for (var param in paramSet) {
                    if (Object.prototype.hasOwnProperty.call(paramSet, param)) {
                        ctxSessionProps.parameters[param] = paramSet[param];
                    }
                }
            }

            // Persist parameters to Dialogflow ES session props context.
            agent.context.set(ctxSessionProps);
        }
        return ctxSessionProps;
    }

    /**
     * Create the Dialogflow ES session props.
     * 
     * @param {string} sessionId    The Dialogflow session ID.
     * @returns the Dialogflow ES session props.
     */
    createEsSessionProps(sessionId) {
        this._baseParams.sessionId = sessionId;
        this._baseParams.sessionInitialized = '0';
        
        this._baseParams.helpCounter = '0';
        this._baseParams.responseAlreadySet = '0';
        this._baseParams.fallbackCounter = '0';
        this._baseParams.noInputCounter = '0';
        this._baseParams.sequenceCurrent = 'welcome';
        this._baseParams.sequenceStack = 'welcome';
        this._baseParams.lastEvent = '';
        this._baseParams.lastAction = '';
        this._baseParams.lastFulfillmentText = '';
        this._baseParams.fulfillmentBuffer = '';
        this._baseParams.triggeredSkill = '0';
        this._baseParams.sayGoodbye = '0';
        this._baseParams.saidGoodbye = '0';

        let context = {name: SESSION_PROPS, lifespan: 99, parameters: this._baseParams };
        return context;
    }

    /**
     * The main entry point from the dialogflow-fulfillment-nodejs API.
     * 
     * @param {WebhookClient} agent The dialogflow-fulfillment-nodejs API endpoint.
     * @returns 
     */
    async intentHandler(agent) {
        // Create globally accessible sessionId.
        const sessionId = (agent.request_.body.session.indexOf('/') !== -1) ? agent.request_.body.session.split('/').pop() : '12345';

        try {
            // Fetch the session properties.
            if (typeof this._contextManager == 'undefined') {
                throw new Error(sessionId+'|intentHandler: Error executing intentHandler: contextManager is undefined');
            }
            
            let ctxSessionProps = await this.getOrCreateEsSessionProps(agent, sessionId);
            
            console.debug(sessionId+'|intentHandler: Fetched the ctxSessionProps');

            console.debug(sessionId+'|intentHandler: DEBUG: ctxSessionProps: '+JSON.stringify(ctxSessionProps));

            // Fetch the current sequence.
            let sequenceCurrent = this._sequenceManager.get(ctxSessionProps.parameters.sequenceCurrent);
            sequenceCurrent = sequenceCurrent || this._sequenceManager.get('unassociated');

            console.debug(sessionId+'|intentHandler: Fetched sequenceCurrent \''+sequenceCurrent.name+'\'');

            // Fetch the action-related context.
            let context = (this._intentManager.hasContext(agent.action)) ? this._contextManager.getOrCreateCtx(agent, this._intentManager.getContext(agent.action)) : {};

            console.debug(sessionId+'|intentHandler: Fetched intent-related context \''+context.name+'\'');

            let dialogContext = new DialogContext({
                sessionId: sessionId,
                dialogflowClient: this,
                dialogflowAgent: agent,
                contextManager: this._contextManager,
                sessionParams: ctxSessionProps,
                currentSequence: sequenceCurrent,
                currentContext: context,
                connectorManager: this._connectorManager
            });

            if (ctxSessionProps.parameters.sessionInitialized === '0') {
                console.debug(sessionId+'|intentHandler: Calling _populateFromPayload');
                
                // Populate from base injected payload handler.
                ctxSessionProps = await this._populateFromEsPayload(ctxSessionProps, dialogContext);
                
                // Populate from dynamically registered payload handlers.
                let payloadHandlers = this._connectorManager.getDefaultPropertyManager().getPayloadHandlers();
                for (var payloadHandlerIdx in payloadHandlers) {
                    const payloadHandler = payloadHandlers[payloadHandlerIdx];
                    ctxSessionProps = await payloadHandler (ctxSessionProps, dialogContext);
                }

                console.debug(sessionId+'|intentHandler: DEBUG: ctxSessionProps (after populateFromPayload): '+JSON.stringify(ctxSessionProps));
                
                if (ctxSessionProps.parameters.customerIdentified === '0' || ctxSessionProps.parameters.interactionSource === 'phone') {
                    console.debug(sessionId+'|intentHandler: Calling _populateFromLookup');
                    ctxSessionProps = await this._populateFromLookup(ctxSessionProps, dialogContext);
                    console.debug(sessionId+'|intentHandler: DEBUG: ctxSessionProps (after populateFromLookup): '+JSON.stringify(ctxSessionProps));
                }

                ctxSessionProps.parameters.sessionInitialized = '1';
                agent.context.set(ctxSessionProps);
            } else {
                console.debug(sessionId+'|intentHandler: session already initialized');
            }

            // Debug original query.
            console.debug(fmtLog('intentHandler', 'User Said: '+agent.query, dialogContext));
            console.debug(fmtLog('intentHandler', 'We Responded: '+((agent.consoleMessages[0] !== undefined) ? agent.consoleMessages[0].text : '<blank>'), dialogContext));

            // Handle a stand-alone intent.
            if (this._intentManager.has(agent.action)) {
                await this.handleIntentAndNavigate(dialogContext, agent.action);
                ctxSessionProps.parameters.responseAlreadySet = '0';
                agent.context.set(ctxSessionProps);
                return;
            }

            // Handle a composite intent.
            let lastAction = ctxSessionProps.parameters.lastAction;
            let compositeIntentName = lastAction+'.'+agent.action;
            let baseContext = (this._intentManager.hasContext(lastAction)) ? this._contextManager.getOrCreateCtx(agent, this._intentManager.getContext(lastAction)) : {};
            dialogContext.currentContext = baseContext;
            if (this._intentManager.has(compositeIntentName)) {
                await this.handleIntentAndNavigate(dialogContext, compositeIntentName);
                ctxSessionProps.parameters.responseAlreadySet = '0';
                agent.context.set(ctxSessionProps);
                return;
            }

            // Handle a templated intent.
            let actiontemplateTail = (agent.action.indexOf('.') !== -1) ? agent.action.split('.').pop() : agent.action;
            if (this._intentManager.has(actiontemplateTail)) {
                await this.handleIntentAndNavigate(dialogContext, actiontemplateTail);
                ctxSessionProps.parameters.responseAlreadySet = '0';
                agent.context.set(ctxSessionProps);
                return;
            }

            // Handle no intent handlers found.
            console.log(fmtLog('intentHandler', agent.action+' has no associated handlers', dialogContext));
            dialogContext.setFulfillmentText();
            console.log(fmtLog('intentHandler', 'Calling '+sequenceCurrent.name+'.navigate()', dialogContext));
            sequenceCurrent.navigate(dialogContext);
            ctxSessionProps.parameters.responseAlreadySet = '0';
            agent.context.set(ctxSessionProps);
            return;
        } catch (err) {
            console.error(sessionId+'|intentHandler: Unhandled error: '+err.stack);
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
        // Clean-up the HTTP request for dialogflow-fulfillment + WxCC interoperability.
        request = cleanUpRequest(request);
    
        // Create the dialogflow API client.
        const agent = new WebhookClient({ request, response });

        await this.executeHandler(agent, this.intentHandler);
    }
}
 
module.exports = {DialogFlowEsClient};