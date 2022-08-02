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
 * This class handles all of the state objects representing the conversation.
 * All navifation across sequences and steps happens within.
 */
class ConvoClient {
 
    /**
     * Constructor for ConvoClient objects.
     * 
     * @example
     * const { ConvoClient } = require(codingforconvos);
     * const agent = new ConvoClient('Dialogflow ES');
     */
    constructor(clientType) {
        /**
         * The convo client type.
         * 
         * @private
         * @type {string}
         */
        this._clientType = clientType;
    }
}
 
module.exports = {ConvoClient};