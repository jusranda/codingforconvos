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
 * Class for representing a conversation turn.
 */
class Turn {

    /**
     * Constructor for Turn objects.
     * 
     * @example
     * const { Turn } = require(codingforconvos);
     * let params = { 'name': 'skill.covidscreen', 'dialogflowClient': dialogflowClient, ... };
     * const turn = new Turn(params);
     * 
     * @param {Object} params The constructor parameters.
     */
    constructor(params) {

        // Validate the input parameters.
        if (params == undefined) { throw new Error('parameters object for creating Turn objects is missing.'); }
        if (params.name == undefined) { throw new Error('name is a required parameter for creating Turn objects.'); }
        if (params.promptAction == undefined) { throw new Error('promptAction is a required parameter for creating Turn objects.'); }
        if (params.promptEvent == undefined) { throw new Error('promptEvent is a required parameter for creating Turn objects.'); }
        if (params.activity == undefined) { throw new Error('activity is a required parameter for creating Turn objects.'); }
        if (params.paraphrases == undefined) { throw new Error('paraphrases is a required parameter for creating Turn objects.'); }

        /**
         * The step name.
         * 
         * @private
         * @type {string}
         */
        this._name = params.name;

        /**
         * The step prompt action.
         * 
         * @private
         * @type {string}
         */
        this._promptAction = params.promptAction;

        /**
         * The step prompt event.
         * 
         * @private
         * @type {string}
         */
        this._promptEvent = params.promptEvent;

        /**
         * The step activity description.
         * 
         * @private
         * @type {number}
         */
        this._activity = params.activity;

        /**
         * The step paraphrases.
         * 
         * @private
         * @type {Array}
         */
        this._paraphrases = params.paraphrases;

        /**
         * The step paraphrase count.
         * 
         * @private
         * @type {number}
         */
        this._paraphraseCount = 0;

        /**
         * The step fallback count.
         * 
         * @private
         * @type {number}
         */
        this._fallbackCount = 0;
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
     * Gets the prompt action.
     * 
     * @return The prompt action.
     */
    get promptAction() { return this._promptAction; }
    /**
     * Sets the prompt action.
     * 
     * @param {string} value The value.
     */
    set promptAction(value) { this._promptAction = value; }

    /**
     * Gets the prompt event.
     * 
     * @return The prompt event.
     */
    get promptEvent() { return this._promptEvent; }
    /**
     * Sets the prompt event.
     * 
     * @param {string} value The value.
     */
    set promptEvent(value) { this._promptAction = value; }

    /**
     * Gets the activity.
     * 
     * @return The activity.
     */
    get activity() { return this._activity; }
    /**
     * Sets the activity.
     * 
     * @param {string} value The value.
     */
    set activity(value) { this._activity = value; }

    /**
     * Gets the paraphrases.
     * 
     * @return The paraphrases.
     */
    get paraphrases() { return this._paraphrases; }
    /**
     * Sets the paraphrases.
     * 
     * @param {Object} value The value.
     */
    set paraphrases(value) { this._paraphrases = value; }

}

module.exports = {Turn};
