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
 * This class represents a Connector to external API interfaces.
 */
class Connector {

    /**
     * Constructor for Connector objects.
     * 
     * @example
     * const { Connector } = require(codingforconvos);
     * const someApiEndpoint = new SomeApiEndpoint({...});
     * let params = { 'name': 'test', 'endpoint': someApiEndpoint };
     * const connector = new Connector(params);
     * 
     * @param {Object} params The constructor parameters.
     */
    constructor(params) {
        // Validate the input parameters.
        if (params == undefined) { throw new Error('parameters object for creating Connector objects is missing.'); }
        if (params.name == undefined) { throw new Error('name is a required parameter for creating Connector objects.'); }
        if (params.endpoint == undefined) { throw new Error('endpoint is a required parameter for creating Connector objects.'); }
        if (params.params == undefined) { throw new Error('params is a required parameter for creating Connector objects.'); }

        let defaultSessionParams = (params.sessionParams != undefined) ? params.sessionParams : {};
        let defaultPopulateFromPayload = (params.populateFromPayload != undefined) ? params.populateFromPayload : (context, dialogContext) => { return context; };
        
        /**
         * The name of the connector.  Must be unique.
         * 
         * @private
         * @type {string}
         */
        this._name = params.name;

        /**
         * The API endpoint for the connector.
         * 
         * @private
         * @type {Object}
         */
        this._endpoint = params.endpoint;

        /**
         * The initialization parameters for the connector.
         * 
         * @private
         * @type {Object}
         */
        this._params = params.params;

        /**
         * The session parameters for the connector.
         * 
         * @private
         * @type {Object}
         */
        this._sessionParams = defaultSessionParams;

        /**
         * The populate from payload function handler.
         * 
         * @private
         * @type {Function}
         */
        this._populateFromPayload = defaultPopulateFromPayload;

         /**
         * The status of the connector.
         * 
         * 0 - active-healthy
         * 1 - active-unhealthy
         * 2 - inactive
         * 
         * @private
         * @type {number}
         */
        this._status = 0;

        /**
         * The number of successful API endpoint requests.
         * 
         * @private
         * @type {number}
         */
        this._successCount = 0;

        /**
         * The number of failed API endpoint requests.
         * 
         * @private
         * @type {number}
         */
        this._failureCount = 0;
    }

    /**
     * Gets the name.
     * 
     * @return The name.
     */
    get name() { return this._name; }
    /**
     * Sets the name.
     * 
     * @param {string} value The value.
     */
    set name(value) { this._name = value; }

    /**
     * Gets the API endpoint.
     * 
     * @return The API endpoint.
     */
    get endpoint() { return this._endpoint; }
    /**
     * Sets the API endpoint.
     * 
     * @param {Object} value The value.
     */
    set endpoint(value) { this._endpoint = value; }

    /**
     * Gets the initialization parameters.
     * 
     * @return The initialization parameters.
     */
    get params() { return this._params; }
    /**
     * Sets the initialization parameters.
     * 
     * @param {string} value The value.
     */
    set params(value) { this._params = value; }

    /**
     * Gets the injected session parameters.
     * 
     * @return The injected session parameters.
     */
    get sessionParams() { return this._sessionParams; }
    /**
     * Sets the injected session parameters.
     * 
     * @param {string} value The value.
     */
    set sessionParams(value) { this._sessionParams = value; }

    /**
     * Gets the payload function handler.
     * 
     * @return The payload function handler.
     */
    get populateFromPayload() { return this._populateFromPayload; }
    /**
     * Sets the payload function handler.
     * 
     * @param {Function} value The value.
     */
    set populateFromPayload(value) { this._populateFromPayload = value; }

    /**
     * Gets the status.
     * 
     * @return The status.
     */
    get status() { return this._status; }
    /**
     * Sets the status.
     * 
     * @param {number} value The value.
     */
    set status(value) { this._status = value; }

    /**
     * Gets the successCount.
     * 
     * @return The successCount.
     */
    get successCount() { return this._successCount; }
    /**
     * Sets the successCount.
     * 
     * @param {number} value The value.
     */
    set successCount(value) { this._successCount = value; }

    /**
     * Gets the failureCount.
     * 
     * @return The failureCount.
     */
    get failureCount() { return this._failureCount; }
    /**
     * Sets the failureCount.
     * 
     * @param {number} value The value.
     */
    set failureCount(value) { this._failureCount = value; }
}

/**
 * Class for managing active sequence instances.
 */
class ConnectorManager {

    /**
     * Constructor for ConnectorManager objects.
     * 
     * @example
     * const { ConnectorManager } = require(codingforconvos);
     * const connectorManager = new ConnectorManager();
     */
    constructor(params) {
        // Validate the input parameters.
        if (params == undefined) { throw new Error('parameters object for creating ConnectorManager objects is missing.'); }
        if (params.defaultParameterManager == undefined) { throw new Error('defaultParameterManager is a required parameter for creating ConnectorManager objects.'); }
        
        /**
         * The map of actively registered connectors.
         * 
         * @private
         * @type {Map}
         */
        this._connectors = new Map();

        /**
         * The Default Parameter Manager.
         * 
         * @private
         * @type {DefaultParameterManager}
         */
        this._defaultParameterManager = params.defaultParameterManager;
    }

    /**
     * Retrieve a connector by registered name.
     * 
     * @param {string} name 
     * @returns the registered connector.
     */
    get(name) {
        return this._connectors.get(name);
    }

    /**
     * Retrieve a connector by registered name.
     * 
     * @param {string} name 
     * @returns the registered connector.
     */
    getDefaultPropertyManager() {
        return this._defaultParameterManager;
    }

    /**
     * Registers a sequence with the sequence manager.
     * 
     * @param {Sequence} sequence The sequence object.
     */
    registerConnector(connector) {
        if (this._connectors.has(connector.name)) {
            throw new Error('Connector '+connector.name+' is already registered.');
        }

        this._defaultParameterManager.registerSessionParameters(connector.name, connector.sessionParams);
        this._defaultParameterManager.registerPayloadHandler(connector.name, connector.populateFromPayload);
        this._connectors.set(connector.name, connector);
    }
}



/**
 * Class for managing active sequence instances.
 */
 class DefaultParameterManager {

    /**
     * Constructor for DefaultParameterManager objects.
     * 
     * @example
     * const { DefaultParameterManager } = require(codingforconvos);
     * const defaultParameterManager = new DefaultParameterManager();
     */
    constructor() {
        /**
         * The set of actively registered parameter sets.
         * 
         * @private
         * @type {Array}
         */
        this._parameterSets = [];

        /**
         * The map of actively registered parameter sets.
         * 
         * @private
         * @type {Map}
         */
        this._parameterMap = new Map();

        /**
         * The set of actively registered payload handlers.
         * 
         * @private
         * @type {Array}
         */
        this._populateFromPayloadHandlers = [];

        /**
         * The map of actively registered payload handlers.
         * 
         * @private
         * @type {Map}
         */
        this._populateFromPayloadHandlerMap = new Map();
    }

    /**
     * Retrieve a connector by registered name.
     * 
     * @param {string} name 
     * @returns the registered connector.
     */
    getInstance(name) {
        return this._parameterMap.get(name);
    }

    /**
     * Retrieve a connector by registered name.
     * 
     * @param {string} name 
     * @returns the registered connector.
     */
    getSets() {
        return this._parameterSets;
    }

    /**
     * Retrieve the payload handlers.
     * 
     * @returns the registered connector.
     */
    getPayloadHandlers() {
        return this._populateFromPayloadHandlers;
    }

    /**
     * Retrieve the payload handlers.
     * 
     * @param {string} name 
     * @returns the registered connector.
     */
    getPayloadHandler(name) {
        return this._populateFromPayloadHandlerMap.get(name);
    }

    /**
     * Registers a payload handler.
     * 
     * @param {*} name 
     * @param {*} handler 
     */
    registerPayloadHandler(name, handler) {
        if (this._populateFromPayloadHandlerMap.has(name)) {
            throw new Error('Registered payload handler '+name+' is already exists.');
        }
        this._populateFromPayloadHandlerMap.set(name, handler);
        this._populateFromPayloadHandlers.push(handler);
    }

    /**
     * Registers a parameter set.
     * 
     * @param {string} name     The parameter set name.
     * @param {Object} params   The parameter set.
     */
    registerSessionParameters(name, params) {
        if (this._parameterMap.has(name)) {
            throw new Error('Registered parameter set '+name+' is already exists.');
        }
        this._parameterMap.set(name, params);
        this._parameterSets.push(params);
    }

}

module.exports = {Connector,ConnectorManager,DefaultParameterManager};