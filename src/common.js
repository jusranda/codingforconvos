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
 function _cleanUpDfOutputContext(outputContext) {
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
 * const cleanRequest = cleanUpDfFulfillmentRequest(request);
 * 
 * @param {Object} request The Dialogflow ES webhook fulfillment request.
 * @returns the cleaned up webhook fulfillment request.
 */
 function cleanUpDfFulfillmentRequest(request) {
    request.body.session = _cleanUpSessionPath(request.body.session);
    request.body.queryResult.outputContexts = request.body.queryResult.outputContexts
        .map((context) => _cleanUpDfOutputContext(context));
    return request;
}

module.exports = {cleanUpDfFulfillmentRequest};