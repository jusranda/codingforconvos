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
     constructor() {
        /**
         * The map of actively registered connectors.
         * 
         * @private
         * @type {Map}
         */
        this._connectors = new Map();
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
     * Registers a sequence with the sequence manager.
     * 
     * @param {Sequence} sequence The sequence object.
     */
    registerConnector(connector) {
        if (this._connectors.has(connector.name)) {
            throw new Error('Connector '+connector.name+' is already registered.');
        }
        ;
        this._connectors.set(connector.name, connector);
    }
}

module.exports = {Connector,ConnectorManager};