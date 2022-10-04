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

/**
 * This class represents a Intent object.
 */
class Intent {
    /**
     * Constructor for DialogFlowEsClient objects.
     * 
     * @example
     * const { Intent } = require(codingforconvos);
     * let params = { 'name': 'test', 'activity': 'testing' };
     * const intent = new Intent(params);
     * 
     * @param {Object} params The constructor parameters.
     */
    constructor(params) {
        // Validate the input parameters.
        if (params == undefined) { throw new Error('parameters object for creating Intent objects is missing.'); }
        if (params.action == undefined) { throw new Error('action is a required parameter for creating Intent objects.'); }
        if (params.handler == undefined) { throw new Error('handler is a required parameter for creating Intent objects ('+params.action+').'); }

        const finalSequenceName = (params.sequenceName != undefined) ? params.sequenceName : 'unassociated';

        /**
         * The intent action value.
         * 
         * @private
         * @type {string}
         */
        this._action = params.action;

        /**
         * The intent's associated sequence.
         * 
         * @private
         * @type {string}
         */
        this._sequenceName = finalSequenceName;

        /**
         * The flag indicating this intent should break to wait for reply.
         * 
         * @private
         * @type {Function}
         */
        this._waitForReply = (params.waitForReply != undefined) ? params.waitForReply : false;

        /**
         * The intent function handler.
         * 
         * @private
         * @type {Function}
         */
        this.handler = params.handler;
    }

    /**
     * Gets the action.
     * 
     * @return The action.
     */
    get action() { return this._action; }
    /**
     * Sets the action.
     * 
     * @param {string} value The value.
     */
    set action(value) {this._action = value; }
    
    /**
     * Gets the sequenceName.
     * 
     * @return The action.
     */
    get sequenceName() { return this._sequenceName; }
    /**
     * Sets the sequenceName.
     * 
     * @param {string} value The value.
     */
    set sequenceName(value) {this._sequenceName = value; }

    /**
     * Gets the waitForReply.
     * 
     * @return The waitForReply.
     */
    get waitForReply() { return this._waitForReply; }
    /**
     * Sets the waitForReply.
     * 
     * @param {boolean} value The value.
     */
    set waitForReply(value) {this._waitForReply = value; }
}

/**
 * Class for managing active intent instances.
 */
class IntentManager {
    /**
     * Constructor for IntentManager objects.
     * 
     * @example
     * const { IntentManager } = require(codingforconvos);
     * const intentManager = new IntentManager();
     */
    constructor() {
        /**
         * The map of actively registered intents.
         * 
         * @private
         * @type {Map}
         */
        this._intents = new Map();
        /**
         * The map of contexts for actively registered intents.
         * 
         * @private
         * @type {Map}
         */
        this._intentContexts = new Map();
    }

    has(name) {
        return this._intents.has(name);
    }

    get(name) {
        return this._intents.get(name);
    }

    hasContext(name) {
        return this._intentContexts.has(name);
    }

    getContext(name) {
        return this._intentContexts.get(name);
    }

    /**
     * Registers an intent with the intent manager.
     * 
     * @param {Intent} intent The intent object.
     */
    registerIntent(intent) {
        if (this._intents.has(intent.action)) {
            throw new Error('Intent action '+intent.action+' is already registered.');
        }
        this._intents.set(intent.action, intent);
        this._intentContexts.set(intent.action, intent.sequenceName);
    }

    /**
     * Registers an array of intent actions with shared handling with the intent manager.
     * 
     * @param {Object} params The list of actions and associated sequenceName and handler.
     */
    registerIntents(params) {
        // Validate the input parameters.
        if (params == undefined) { throw new Error('parameters object for registering Intent objects is missing.'); }
        if (params.actions == undefined) { throw new Error('actions is a required parameter for registering multiple Intent objects.'); }
        if (params.sequenceName == undefined) { throw new Error('sequenceName is a required parameter for registering multiple Intent objects.'); }
        if (params.handler == undefined) { throw new Error('handler is a required parameter for registering multiple Intent objects.'); }

        params.actions.map((action) => this.registerIntent({
            action: action,
            sequenceName: params.sequenceName,
            waitForReply: params.waitForReply,
            handler: params.handler
        }));
        return;
    }
}

module.exports = {Intent,IntentManager};