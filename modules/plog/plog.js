import { getLogger } from 'jitsi-meet-logger';
import * as XMPPEvents from '../../service/xmpp/XMPPEvents';
import * as JitsiConferenceEvents from '../../JitsiConferenceEvents';
import { Strophe } from 'strophe.js';

const logger = getLogger(__filename);

export default class ParticipantLog {

    /**
     * Constructor.
     * @param conference
     * @param xmpp - XMPP connection.
     */
    constructor(conference, xmpp) {
        const room = conference.room;

        this.conference = conference;
        this.xmpp = xmpp;

        this.log = null;

        xmpp.addListener(
            XMPPEvents.PARTICIPANT_LOG_RECEIVED,
            this._onModuleMessageReceived.bind(this));
        room.addListener(
            XMPPEvents.JSON_MESSAGE_RECEIVED,
            this._onEndPointMessageReceived.bind(this));
    }

    /**
     * Received message from another user.
     * @param {Object} message - Message received.
     */
    _onEndPointMessageReceived(from, message) {
        logger.log(`Received Endpoint Message from ${from}, ${message}`);
    }
    
    /**
     * Received message from prosody module.
     * 
     * @param payload - Poll to notify
     */
    _onModuleMessageReceived(message) {
        logger.log(`Received Module Message ${message.toString()}`);
    }
}