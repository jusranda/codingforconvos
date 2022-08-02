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

const DEF_CTX_LIFESPAN = 99;

// Define Sequence Name Constants.
// FIXME: Find a better way to embed these.
const CTX_WELCOME = 'welcome';
const CTX_RFC = 'reasonforcontact';
const CTX_AUTH = 'authentication';
const CTX_PWRESET = 'passwordreset';
const CTX_COMMON = 'common';

/**
 * This class represents a context manager.
 */
class ContextManager {

    constructor(sequenceManager) {
        this._sequenceManager = sequenceManager;

        this.setContextParam = this.setContextParam.bind(this);
        this.setContextParams = this.setContextParams.bind(this);

        this.setFulfillmentText = this.setFulfillmentText.bind(this);
        this.appendFulfillmentText = this.appendFulfillmentText.bind(this);
        this.setFulfillmentCourseCorrect = this.setFulfillmentCourseCorrect.bind(this);
    }

    getOrCreateCtx(agent, name) {
        let context = agent.context.get(name);
        if (!context) {
            let sequence = this._sequenceManager.get(name);
            context = sequence.createCtx(sequence);
            agent.context.set(context);
        }
        return context;
    }

    createBaseCtx (name, lifespan=DEF_CTX_LIFESPAN) {
        let context = {};
        context.name = name;
        context.lifespan = lifespan;
        return context;
    }

    updateContext(agent, context, newLifespan = DEF_CTX_LIFESPAN) {
        context.lifespan = newLifespan;
        agent.context.set(context);
    }

    setContextParam (agent, context, paramName, paramValue) {
        context.parameters[paramName] = paramValue;
        this.updateContext(agent, context);
        return;
    }

    setContextParams (agent, context, props) {
        for (var prop in props) {
            if (Object.prototype.hasOwnProperty.call(props, prop)) {
                context.parameters[prop] = props[prop];
            }
        }
        this.updateContext(agent, context);
        return;
    }

    setFulfillmentText (agent, ctxSessionProps, sequenceCurrent={}, context={}) {
        ctxSessionProps.parameters.lastFulfillmentText = agent.consoleMessages[0].text;
        this.updateContext(agent, ctxSessionProps);
        return;
    }

    appendFulfillmentText (agent, ctxSessionProps, sequenceCurrent={}, context={}) {
        ctxSessionProps.parameters.lastFulfillmentText = ctxSessionProps.parameters.lastFulfillmentText + '  ' + agent.consoleMessages[0].text;
        this.updateContext(agent, ctxSessionProps);
        return;
    }

    setFulfillmentCourseCorrect (agent, ctxSessionProps, sequenceCurrent={}, context={}) {
        this.setFulfillmentText(agent, ctxSessionProps, sequenceCurrent, context);
        let courseCorrectEvent = this.returnFollowupEvent(agent, ctxSessionProps, ctxSessionProps.parameters.lastEvent, ctxSessionProps.parameters.lastFulfillmentText);
        return;
    }

    isAuthRequired(agent, ctxSessionProps) {
        let context = this.getOrCreateCtx(agent, CTX_AUTH);
        return (ctxSessionProps.parameters.customerIdentified === '0' || ctxSessionProps.parameters.customerValidated === '0' || context.parameters.validationStatus !== '1');
    }

    handleRequireAuthentication(agent, ctxSessionProps) {
        let context = this.getOrCreateCtx(agent, CTX_AUTH);
        let sequenceCurrent = this._sequenceManager.get(ctxSessionProps.parameters.sequenceCurrent);
    
        if (context.parameters.validationStatus === '1') { // Should never occur, so correct application state to pass authentication check.
            this.setContextParam(agent, ctxSessionProps, 'customerValidated', '1');
            let sequenceCurrent = this._sequenceManager.get(ctxSessionProps.parameters.sequenceCurrent);
            sequenceCurrent.navigate(agent, ctxSessionProps);
        }
        
        if (context.parameters.validationStatus === '2') {
            if (ctxSessionProps.parameters.offeredAgent === '0') {
                this.setContextParam(agent, ctxSessionProps, 'lastFulfillmentText', 'I\'m sorry, but '+sequenceCurrent.activity+' isn\'t something I can do without validating your identity.'); // Use counters to match advisories with authentication attempt count.
                let event = this.returnFollowupEvent(agent, ctxSessionProps, 'OfferSpeakToAgent', ctxSessionProps.parameters.lastFulfillmentText);
                return;
            }
            if (ctxSessionProps.parameters.offeredAgentAccepted === '1') {
                let event = this.returnFollowupEvent(agent, ctxSessionProps, 'EscalateToAgent', ctxSessionProps.parameters.lastFulfillmentText);
                return;
            }
            if (ctxSessionProps.parameters.offeredAgentDeclined === '1') {
                this.resetOfferedAgentFlags(agent, ctxSessionProps);
                console.log('Calling completeAndResumeNavigation');
                this.completeAndResumeLastSequence(agent, ctxSessionProps, CTX_PWRESET);
                return;
            }
        }
    
        this.pushNewSequence(agent, ctxSessionProps, CTX_AUTH);
    
        let sequenceAuth = this._sequenceManager.get(CTX_AUTH);
        sequenceAuth.navigate(agent, ctxSessionProps);
        return;
    }

    resetOfferedAgentFlags(agent, ctxSessionProps) {
        this.setContextParams (agent, ctxSessionProps, {
            'offeredAgent': '0',
            'offeredAgentAccepted': '0',
            'offeredAgentDeclined': '0'
        });
    }

    returnFollowupEvent(agent, ctxSessionProps, eventName, fulfillment = '.') {
        agent.add(fulfillment); // Add dummy reply due to dialogflow-fulfillment-nodejs API behaviour.
        this.setContextParam(agent, ctxSessionProps, 'lastEvent', eventName);
        let event = agent.setFollowupEvent(eventName);
        return event;
    }

    pushNewSequence (agent, ctxSessionProps, name) {
        ctxSessionProps.parameters.sequenceCurrent = name;
        if (ctxSessionProps.parameters.sequenceStack === CTX_WELCOME || ctxSessionProps.parameters.sequenceStack === '') {
            ctxSessionProps.parameters.sequenceStack = (name === CTX_RFC) ? name : CTX_RFC + '|' + name;
            if (name !== CTX_RFC) {
                ctxSessionProps.parameters.triggeredSkill = '1';
            }
            this.updateContext(agent, ctxSessionProps);
            return;
        }
        ctxSessionProps.parameters.sequenceStack = ctxSessionProps.parameters.sequenceStack + '|' + name;
        this.updateContext(agent, ctxSessionProps);
        return;
    }

    popCompletedSequence (agent, ctxSessionProps, name) {
        // If sequence is corrupt, empty, or in welcome state, fallback to reason for calling sequence.
        if (ctxSessionProps.parameters.sequenceStack.indexOf('|') === -1) {
            this.setContextParams (agent, ctxSessionProps, {
                'sequenceCurrent': CTX_RFC,
                'sequenceStack': (name === CTX_RFC) ? name : CTX_RFC
            });
            return;
        }
    
        let sequenceStack = ctxSessionProps.parameters.sequenceStack.split('|');
    
        if (sequenceStack[sequenceStack.length-1] !== name) { // Integrity check that we're removing the sequence we think we are.
            console.error('Error: Expecting to pop '+name+' off of Stack: '+ctxSessionProps.parameters.sequenceStack);
        }
    
        let newSequenceStack = sequenceStack.slice(0, sequenceStack.length-1);
        let newSequence = newSequenceStack[newSequenceStack.length-1];
        let newSequenceStackString = newSequenceStack.join('|');
            
        this.setContextParams (agent, ctxSessionProps, {
            'sequenceCurrent': newSequence,
            'sequenceStack': newSequenceStackString
        });
        return;
    }

    completeAndResumeLastSequence(agent, ctxSessionProps, name) {
        this.popCompletedSequence (agent, ctxSessionProps, name);
        let sequenceUpdated = this._sequenceManager.get(ctxSessionProps.parameters.sequenceCurrent);
        sequenceUpdated.navigate(agent, ctxSessionProps);
        return;
    }
    
}

module.exports = {ContextManager};