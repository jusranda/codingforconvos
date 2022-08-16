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
 * This class represents a Sequence object.
 */
class Sequence {
 
    /**
     * Constructor for Sequence objects.
     * 
     * @example
     * const { Sequence } = require(codingforconvos);
     * let params = { 'name': 'test', 'activity': 'testing' };
     * const sequence = new Sequence(params);
     * 
     * @param {Object} params The sequence constructor parameters.
     */
    constructor(params) {
        // Validate the input parameters.
        if (params == undefined) { throw new Error('parameters object for creating Sequence objects is missing.'); }
        if (params.name == undefined) { throw new Error('name is a required parameter for creating Sequence objects.'); }
        if (params.activity == undefined) { throw new Error('activity is a required parameter for creating Sequence objects.'); }
        if (params.authRequired == undefined) { throw new Error('authRequired is a required parameter for creating Sequence objects.'); }
        if (params.params == undefined) { throw new Error('params is a required parameter for creating Sequence objects.'); }
        if (params.createCase == undefined) { throw new Error('createCase is a required parameter for creating Sequence objects.'); }
        if (params.navigate == undefined) { throw new Error('navigate is a required parameter for creating Sequence objects.'); }
        if (params.breakIntents == undefined) { throw new Error('breakIntents is a required parameter for creating Sequence objects.'); }

        /**
         * The name of the sequence.
         * 
         * @private
         * @type {string}
         */
        this._name = ((params.name !== undefined) ? params.name : 'name-broken');
 
        /**
         * The gerund description of the sequence goal.
         * 
         * @private
         * @type {string}
         */
        this._activity = params.activity;
 
        /**
         * The flag indicating of authentication is required for this sequence.
         * 
         * @private
         * @type {boolean}
         */
        this._authRequired = params.authRequired;
 
        /**
         * The context parameters for this sequence.
         * 
         * @private
         * @type {Object}
         */
        this._params = params.params;
 
        /**
         * The function pointer for creating a case if the sequence fails.
         * 
         * @private
         * @type {Function}
         */
        this.createCase = params.createCase;
 
        /**
         * The function pointer for navigating a sequence forward.
         * 
         * @private
         * @type {Function}
         */
        this.navigate = params.navigate.bind(this);
 
        /**
         * The map of intents to trigger a skip of the navigation step.  The result 
         * behaviour is to immediately return after running the intent handler.
         * 
         * @private
         * @type {Map}
         */
        this._breakIntents = new Map();
        params.breakIntents.forEach(breakIntent => this._breakIntents.set(breakIntent.action, breakIntent.trigger));

        this.navigate = this.navigate.bind(this);
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
     * Gets the activity.
     * 
     * @return The activity.
     */
    get ativity() { return this._activity; }
    /**
     * Sets the activity.
     * 
     * @param {string} value The value.
     */
    set activity(value) { this._activity = value; }

    /**
     * Gets the authRequired.
     * 
     * @return The authRequired.
     */
    get authRequired() { return this._authRequired; }
    /**
     * Sets the authRequired.
     * 
     * @param {string} value The value.
     */
    set authRequired(value) { this._authRequired = value; }

    /**
     * Gets the params.
     * 
     * @return The params.
     */
    get params() { return this._params; }
    /**
     * Sets the params.
     * 
     * @param {string} value The value.
     */
    set params(value) { this._params = value; }

    /**
     * Gets the breakIntents.
     * 
     * @return The breakIntents.
     */
    get breakIntents() { return this._breakIntents; }
    /**
     * Sets the breakIntents.
     * 
     * @param {string} value The value.
     */
    set breakIntents(value) {
        this._breakIntents.clear();
        value.forEach(breakIntent => this._breakIntents.set(breakIntent.action, breakIntent.trigger));
    }
}

/**
 * Class for managing active sequence instances.
 */
class SequenceManager {
    /**
     * Constructor for SequenceManager objects.
     * 
     * @example
     * const { SequenceManager } = require(codingforconvos);
     * const sequenceManager = new SequenceManager();
     */
    constructor() {
        /**
         * The map of actively registered sequences.
         * 
         * @private
         * @type {Map}
         */
        this._sequences = new Map();
    }

    /**
     * Retrieve a sequence by registered name.
     * 
     * @param {string} name 
     * @returns the registered sequence.
     */
    get(name) {
        return this._sequences.get(name);
    }

    /**
     * Registers a sequence with the sequence manager.
     * 
     * @param {Sequence} sequence The sequence object.
     */
    registerSequence(sequence) {
        if (this._sequences.has(sequence.name)) {
            throw new Error('Sequence '+sequence.name+' is already registered.');
        }
        ;
        this._sequences.set(sequence.name, sequence);
    }
}
  
module.exports = {Sequence,SequenceManager};