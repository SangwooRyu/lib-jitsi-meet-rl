import { getLogger } from 'jitsi-meet-logger';
import * as XMPPEvents from '../../service/xmpp/XMPPEvents';
import * as JitsiConferenceEvents from '../../JitsiConferenceEvents';
import { Strophe } from 'strophe.js';

const logger = getLogger(__filename);

const MESSAGE_PARTICIPANT_JOIN = 'participant-join';
const MESSAGE_PARTICIPANT_LEAVE = 'participant-leave';

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

    getLog(){
        return this.log;
    }

    informJoin(log) {
        this.conference.sendMessage({
            type: MESSAGE_PARTICIPANT_JOIN,
            event: {
                log
            }
        });

        this.conference.eventEmitter.emit(
            JitsiConferenceEvents.PARTICIPANT_JOIN_LOG,
            log
        );
    }

    informLeave(log) {
        this.conference.sendMessage({
            type: MESSAGE_PARTICIPANT_LEAVE,
            event: {
                log
            }
        });

        this.conference.eventEmitter.emit(
            JitsiConferenceEvents.PARTICIPANT_LEAVE_LOG,
            log
        );
    }

    /**
     * Received message from another user.
     * @param {Object} message - Message
     */
    _onEndPointMessageReceived(from, message) {
        logger.log(`Received Endpoint Message from ${from}, ${message}`);
    }
    
    /**
     * Received message from prosody module.
     * 
     * @param payload - Message
     */
    _onModuleMessageReceived(message) {
        logger.log(`Received Module Message ${message}`);

        this.log = message;

        this.informJoin(message);
    }
}