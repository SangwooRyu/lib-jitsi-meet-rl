import { getLogger } from 'jitsi-meet-logger';
import * as XMPPEvents from '../../service/xmpp/XMPPEvents';
import * as JitsiConferenceEvents from '../../JitsiConferenceEvents';
import { Strophe } from 'strophe.js';

const logger = getLogger(__filename);

const MESSAGE_PARTICIPANT_LOG = 'participant-log-change';

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

    informChange(log) {
        this.conference.sendMessage({
            type: MESSAGE_PARTICIPANT_LOG,
            event: {
                log
            }
        });

        this.conference.eventEmitter.emit(
            JitsiConferenceEvents.PARTICIPANT_LOG_CHANGED,
            log
        );
    }

    /**
     * Received message from another user.
     * @param {Object} message - Message
     */
    _onEndPointMessageReceived(from, message) {
        const myid = this.conference.myUserId();

        const { type } = message;

        // Message sent as broadcast to MUC is re-sent to the
        // participant again.
        if (myid === Strophe.getResourceFromJid(from) || !type) {
            return;
        }

        if(type === MESSAGE_PARTICIPANT_LOG){
            this.log = message;
        }
    }
    
    /**
     * Received message from prosody module.
     * 
     * @param payload - Message
     */
    _onModuleMessageReceived(message) {
        console.log('Module messsage received in plog module')
        this.log = message;

        //this.informChange(message);
    }
}