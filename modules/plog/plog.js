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
            var xmlPacket = message[userId]["sessions"];

            let idFromPacket = null;
            if(xmlPacket){
                let find = false;
                for(var i = 0; i < xmlPacket.tags.length; i++){
                    if(xmlPacket.tags[i].name == "identity"){
                        for(var j = 0; j < xmlPacket.tags[i].tags.length; j++){
                            if(xmlPacket.tags[i].tags[j].name == "user"){
                                for(var k = 0; k < xmlPacket.tags[i].tags[j].tags.length; k++){
                                    if(xmlPacket.tags[i].tags[j].tags[k].name == "id"){
                                        idFromPacket = xmlPacket.tags[i].tags[j].tags[k].__array[0];
                                        find = true;
                                        break;
                                    }
                                }
                            }
                            if(find){
                                break;
                            }
                        }
                    }
                    if(find){
                        break;
                    }
                }
            }

            if(!this.userIdMatching[userId]){
                if(idFromPacket){
                    this.userIdMatching[userId] = idFromPacket;
                }
                else {
                    this.userIdMatching[userId] = userId;
                }
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
}