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
        this.userIdMatching = {};

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

    getIdMathcing(){
        return this.userIdMatching;
    }

    /**
     * Received message from prosody module.
     * 
     * @param payload - Message
     */
    _onModuleMessageReceived(message) {
        this.log = message;

        for (const userId in message){
            console.log('originalPacket ', message[userId]["sessions"]);
            var xmlPacket = message[userId]["sessions"];

            let idFromPacket = null;
            if(xmlPacket){
                if(xmlPacket.tags[7].name == "identity")
                    idFromPacket = xmlPacket.tags[7].tags[0].__array[0];
            }

            console.log('Received id from Packet ', idFromPacket);

            if(!this.userIdMatching[userId]){
                this.userIdMatching[userId] = this.conference.getParticipantIdentityById(userId);
            }

            const participantIdentity = this.userIdMatching[userId];

            if(!participantIdentity){ 
                this.logIdentity[userId] = message[userId];
            }
            else{
                if(!this.logIdentity[participantIdentity]){
                    this.logIdentity[participantIdentity] = message[userId];
                }
                else {
                    this.logIdentity[participantIdentity]["leaveTime"] = message[userId]["leaveTime"];
                }
            }
        }
    }

    /**
     * Transforms a stringified xML into a XML wrapped in jQuery.
     *
     * @param {string} xml - The XML in string form.
     * @private
     * @returns {Object|null} A jQuery version of the xml. Null will be returned
     * if an error is encountered during transformation.
     */
    _convertStringToXML(xml) {
        try {
            const xmlDom = new DOMParser().parseFromString(xml, 'text/xml');

            return xmlDom;
        } catch (e) {
            logger.error('Attempted to convert incorrectly formatted xml');

            return null;
        }
    }
}