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
        this.logIdentity = {};

        xmpp.addListener(
            XMPPEvents.PARTICIPANT_LOG_RECEIVED,
            this._onModuleMessageReceived.bind(this));
    }

    getLog(){
        return this.log;
    }

    getLogIdentity(){
        return this.logIdentity;
    }

    /**
     * Received message from prosody module.
     * 
     * @param payload - Message
     */
    _onModuleMessageReceived(message) {
        this.log = message;

        for (const userId in message){
            const participantIdentity = this.conference.getParticipantIdentityById(userId);

            if(!participantIdentity){ 
                if(!this.logIdentity[userId]){
                    this.logIdentity[userId] = message[userId];
                }
            }
            else{
                if(!this.logIdentity[participantIdentity]){
                    this.logIdentity[participantIdentity] = message[userId];
                }
                else{
                    if(this.logIdentity[participantIdentity]["leaveTime"]){
                        this.logIdentity[participantIdentity]["leaveTime"] = null;
                    }
                }
            }
        }
    }
}