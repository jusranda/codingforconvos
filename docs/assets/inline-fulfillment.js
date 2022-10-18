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
'use strict';

const functions = require('@google-cloud/functions-framework');
const {DialogFlowEsClient,Intent,fmtLog} = require('codingforconvos');

process.env.DEBUG = 'dialogflow:*'; // enables lib debugging statements



///////////////////////////////////////////
// Create Dialogflow ES Endpoint Client. //
///////////////////////////////////////////

const convoClient = new DialogFlowEsClient({
    baseParams: {
        // Profile & Channel Type parameters.
        customerName: '',
        companyName: '',
        
        // Identification & Authentication
        customerIdentified: '',
        customerIdentifiedBy: '',
        customerValidated: ''
    },
    populateFromEsPayload: (context, dialogContext) => {
        const payload = dialogContext.payload;
    
        const customerIdentifiedString = (payload.customerIdentified) ? payload.customerIdentified : 'false';
        context.parameters.customerIdentified = (customerIdentifiedString === 'true') ? '1' : '0';
        
        const customerValidatedString = (payload.customerValidated) ? payload.customerValidated : 'false';
        context.parameters.customerValidated = (customerValidatedString === 'true') ? '1' : '0';
        
        context.parameters.companyName = (payload.companyName) ? payload.companyName : 'JCMG';
        
        return context;
    }
});



/////////////////////////////////////////////
// Register Sequences and Intent Handlers. //
/////////////////////////////////////////////

// Register intents
convoClient.registerIntent(new Intent({
    action: 'welcome',
    waitForReply: false,
    handler: (dialogContext) => {
        dialogContext.setFulfillmentText();
        dialogContext.respondWithText();
        return;
    }
}));


//////////////////////////////////////
// Handle the Dialogflow ES Request //
//////////////////////////////////////

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
functions.http('dialogflowFulfillment', async (req, res) => {
    // HTTP debug dump.
    console.log(fmtLog('handleRequest', 'Dialogflow Request headers: ' + JSON.stringify(req.headers)));
    console.log(fmtLog('handleRequest', 'Dialogflow Request body: ' + JSON.stringify(req.body)));

    return await convoClient.handleRequest(req, res);
});
