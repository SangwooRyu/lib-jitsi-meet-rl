import { getLogger } from 'jitsi-meet-logger';
import * as XMPPEvents from '../../service/xmpp/XMPPEvents';
import * as JitsiConferenceEvents from '../../JitsiConferenceEvents';
import { Strophe } from 'strophe.js';

const logger = getLogger(__filename);

/**
 * A collection for tracking participant log (joinTime, leaveTime).
 */
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

        //log index by jid { joinTime, leaveTime }
        this.log = null;

        //log index by account's own id { joinTime, leaveTime }
        this.logIdentity = {};

        //matching jid -> account's own id
        this.userIdMatching = {};

        xmpp.addListener(
            XMPPEvents.PARTICIPANT_LOG_RECEIVED,
            this._onModuleMessageReceived.bind(this));
    }

    /**
     * Return log
     * 
     */
    getLog(){
        return this.log;
    }

    /**
     * Return logIdentity
     * 
     */
    getLogIdentity(){
        return this.logIdentity;
    }

    /**
     * Return userIdMatching
     * 
     */
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
        var latestIncome = {};

        for (const userId in message){
            var xmlPacket = message[userId]["sessions"];

            let idFromPacket = null;
            
            //Find unique id of userId's account 
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

            //set userIdMatching
            if(!this.userIdMatching[userId]){
                if(idFromPacket){
                    this.userIdMatching[userId] = idFromPacket;
                }
                else {
                    this.userIdMatching[userId] = userId;
                }
            }

            //set joinTime, leaveTime
            if(!idFromPacket) {
                console.log(userId, 'No identity');
                this.logIdentity[userId] = message[userId];
            }
            else{
                if(!this.logIdentity[idFromPacket]){
                    this.logIdentity[idFromPacket] = message[userId];
                }
                else {
                    if(!latestIncome[idFromPacket]){
                        latestIncome[idFromPacket] = message[userId];
                    }
                    else {
                        if(this.time_convert(message[userId]["joinTime"]) > this.time_convert(latestIncome[idFromPacket]["joinTime"])){
                            latestIncome[idFromPacket] = message[userId];
                        }
                    }

                    if(this.time_convert(message[userId]["joinTime"]) < this.time_convert(this.logIdentity[idFromPacket]["joinTime"])){ //incoming is older
                        this.logIdentity[idFromPacket]["joinTime"] = message[userId]["joinTime"];
                    }

                    this.logIdentity[idFromPacket]["leaveTime"] = latestIncome[idFromPacket]["leaveTime"];
                }
            }
        }
        console.log('Final user Identity is ', this.logIdentity);
    }


    /**
     * Convert timestamp to number
     * ex) 2020.07.15 15:30:26 => 20200715153026
     */
    time_convert(time) {
        var yyyy = time["year"];
        var mo = time["month"];
        var dd = time["day"];
        var hh = time["hour"];
        var mm = time["min"];
        var ss = time["sec"];

        return Number([yyyy,
                (mo>9 ? '' : '0') + mo,
                (dd>9 ? '' : '0') + dd,
                (hh>9 ? '' : '0') + hh, 
                (mm>9 ? '' : '0') + mm, 
                (ss>9 ? '' : '0') + ss,
                ].join(''));
    }
}