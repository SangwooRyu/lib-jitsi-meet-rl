import * as JitsiConferenceEvents from '../../JitsiConferenceEvents';
import XMPPEvents from '../../service/xmpp/XMPPEvents';

import SpeakerStats from './SpeakerStats';

/**
 * A collection for tracking speaker stats. Attaches listeners
 * to the conference to automatically update on tracked events.
 */
export default class SpeakerStatsCollector {
    /**
     * Initializes a new SpeakerStatsCollector instance.
     *
     * @constructor
     * @param {JitsiConference} conference - The conference to track.
     * @returns {void}
     */
    constructor(conference) {
        this.stats = {
            users: {
                // userId: SpeakerStats
                // index by jid
            },
            usersIdentity:{
                // user Identity: SpeakerStats
                // index by account's own id
            },
            userIdMatching: {
                //matching jid -> account's own id
            },
            dominantSpeakerId: null
        };

        const userId = conference.myUserId();

        this.stats.users[userId] = new SpeakerStats(userId, null, true);

        this.conference = conference;

        conference.addEventListener(
            JitsiConferenceEvents.DOMINANT_SPEAKER_CHANGED,
            this._onDominantSpeaker.bind(this));
        conference.addEventListener(
            JitsiConferenceEvents.USER_JOINED,
            this._onUserJoin.bind(this));
        conference.addEventListener(
            JitsiConferenceEvents.USER_LEFT,
            this._onUserLeave.bind(this));
        conference.addEventListener(
            JitsiConferenceEvents.DISPLAY_NAME_CHANGED,
            this._onDisplayNameChange.bind(this));
        if (conference.xmpp) {
            conference.xmpp.addListener(
                XMPPEvents.SPEAKER_STATS_RECEIVED,
                this._updateStats.bind(this));
            conference.xmpp.addListener(
                XMPPEvents.PARTICIPANT_LOG_RECEIVED,
                this._updateIdMatching.bind(this));
        }
    }

    /**
     * Reacts to dominant speaker change events by changing its speaker stats
     * models to reflect the current dominant speaker.
     *
     * @param {string} dominantSpeakerId - The user id of the new
     * dominant speaker.
     * @returns {void}
     * @private
     */
    _onDominantSpeaker(dominantSpeakerId) {
        const oldDominantSpeaker
            = this.stats.users[this.stats.dominantSpeakerId];
        const newDominantSpeaker = this.stats.users[dominantSpeakerId];

        oldDominantSpeaker && oldDominantSpeaker.setDominantSpeaker(false);
        newDominantSpeaker && newDominantSpeaker.setDominantSpeaker(true);

        //Below lines are for update this.stats.usersIdentity (similar logic as updating this.stats.users)
        const userIdentityOld = this.stats.userIdMatching[this.stats.dominantSpeakerId];
        const userIdentityNew = this.stats.userIdMatching[dominantSpeakerId];
        
        let oldDominantSpeakerIdentity;
        let newDominantSpeakerIdentity;

        if (!userIdentityOld){
            oldDominantSpeakerIdentity
            = this.stats.usersIdentity[this.stats.dominantSpeakerId];
        }
        else {
            oldDominantSpeakerIdentity
            = this.stats.usersIdentity[userIdentityOld];
        }

        if (!userIdentityNew){
            newDominantSpeakerIdentity
            = this.stats.usersIdentity[dominantSpeakerId];
        }
        else {
            newDominantSpeakerIdentity
            = this.stats.usersIdentity[userIdentityNew];
        }
        
        oldDominantSpeakerIdentity && oldDominantSpeakerIdentity.setDominantSpeaker(false);
        newDominantSpeakerIdentity && newDominantSpeakerIdentity.setDominantSpeaker(true);
    
        this.stats.dominantSpeakerId = dominantSpeakerId;
    }

    /**
     * Reacts to user join events by creating a new SpeakerStats model.
     *
     * @param {string} userId - The user id of the new user.
     * @param {JitsiParticipant} - The JitsiParticipant model for the new user.
     * @returns {void}
     * @private
     */
    _onUserJoin(userId, participant) {
        if (participant.isHidden()) {
            return;
        }

        if (!this.stats.users[userId]) {
            this.stats.users[userId] = new SpeakerStats(userId, participant.getDisplayName());
        }

        //Below lines are for update this.stats.usersIdentity (similar logic as updating this.stats.users)
        const userIdentity = this.conference.getParticipantIdentityById(userId);

        if (!userIdentity){
            this.stats.usersIdentity[userId] = new SpeakerStats(userId, participant.getDisplayName());
            this.stats.userIdMatching[userId] = userId;
        }
        else {
            if (!this.stats.usersIdentity[userIdentity]){
                this.stats.userIdMatching[userId] = userIdentity;
                this.stats.usersIdentity[userIdentity] = new SpeakerStats(userId, participant.getDisplayName());
            }
            else {
                this.stats.userIdMatching[userId] = userIdentity;
                this.stats.usersIdentity[userIdentity].markAsHasJoined();
            }
        }
    }

    /**
     * Reacts to user leave events by updating the associated user's
     * SpeakerStats model.
     *
     * @param {string} userId - The user id of the user that left.
     * @returns {void}
     * @private
     */
    _onUserLeave(userId) {
        const savedUser = this.stats.users[userId];
        const userIdentity = this.stats.userIdMatching[userId];

        if (savedUser) {
            savedUser.markAsHasLeft();
        }

        //Below lines are for update this.stats.usersIdentity (similar logic as updating this.stats.users)
        if (!userIdentity){
            const savedUserIdentity = this.stats.usersIdentity[userId];

            if (savedUserIdentity){
                savedUserIdentity.markAsHasLeft();
            }
        }
        else {
            const savedUserIdentity = this.stats.usersIdentity[userIdentity];

            if (savedUserIdentity){
                savedUserIdentity.markAsHasLeft();
            }
        }   
    }

    /**
     * Reacts to user name change events by updating the last known name
     * tracked in the associated SpeakerStats model.
     *
     * @param {string} userId - The user id of the user that left.
     * @returns {void}
     * @private
     */
    _onDisplayNameChange(userId, newName) {
        const savedUser = this.stats.users[userId];
        const userIdentity = this.stats.userIdMatching[userId];

        if (savedUser) {
            savedUser.setDisplayName(newName);
        }

        //Below lines are for update this.stats.usersIdentity (similar logic as updating this.stats.users)
        if (!userIdentity){
            const savedUserIdentity = this.stats.usersIdentity[userId];

            if (savedUserIdentity){
                savedUserIdentity.setDisplayName(newName);
            }
        }
        else {
            const savedUserIdentity = this.stats.usersIdentity[userIdentity];

            if (savedUserIdentity){
                savedUserIdentity.setDisplayName(newName);
            }
        }
    }

    /**
     * Return a copy of the tracked SpeakerStats models.
     *
     * @returns {Object} The keys are the user ids and the values are the
     * associated user's SpeakerStats model.
     * @private
     */
    getStats() {
        return this.stats.users;
    }

    /**
     * Return a copy of the tracked SpeakerStats models that is indexed by account's own id.
     *
     * @returns {Object} The keys are the user identitys and the values are the
     * associated user's SpeakerStats model.
     * @private
     */
    getStatsIdentity(){
        return this.stats.usersIdentity;
    }

    /**
     * Updates of the current stats is requested, passing the new values.
     *
     * @param {Object} newStats - The new values used to update current one.
     * @private
     */
    _updateStats(newStats) {
        for (const userId in newStats) { // eslint-disable-line guard-for-in
            let speakerStatsToUpdate;
            const newParticipant = this.conference.getParticipantById(userId);

            // we want to ignore hidden participants
            if (!newParticipant || !newParticipant.isHidden()) {
                if (this.stats.users[userId]) {
                    speakerStatsToUpdate = this.stats.users[userId];

                    if (!speakerStatsToUpdate.getDisplayName()) {
                        speakerStatsToUpdate
                            .setDisplayName(newStats[userId].displayName);
                    }
                } else {
                    speakerStatsToUpdate = new SpeakerStats(
                        userId, newStats[userId].displayName);
                    this.stats.users[userId] = speakerStatsToUpdate;
                    speakerStatsToUpdate.markAsHasLeft();
                }
            }

            speakerStatsToUpdate.totalDominantSpeakerTime
                = newStats[userId].totalDominantSpeakerTime;

            //Below lines are for update this.stats.usersIdentity (similar logic as updating this.stats.users)
            if(!this.stats.userIdMatching[userId]){
                this.stats.userIdMatching[userId] = this.conference.getParticipantIdentityById(userId);
            }
            
            let speakerStatsToUpdateIdentity;

            if (!newParticipant || !newParticipant.isHidden()) {
                const userIdentity = this.stats.userIdMatching[userId];

                if (!userIdentity) {
                    if (this.stats.usersIdentity[userId]) {
                        speakerStatsToUpdateIdentity = this.stats.usersIdentity[userId];
    
                        if (!speakerStatsToUpdateIdentity.getDisplayName()) {
                            speakerStatsToUpdateIdentity
                                .setDisplayName(newStats[userId].displayName);
                        }
                    } else {
                        speakerStatsToUpdateIdentity = new SpeakerStats(
                            userId, newStats[userId].displayName);
                        this.stats.usersIdentity[userId] = speakerStatsToUpdateIdentity;
                        speakerStatsToUpdateIdentity.markAsHasLeft();
                    }
                }
                else {
                    if (this.stats.usersIdentity[userIdentity]) {
                        speakerStatsToUpdateIdentity = this.stats.usersIdentity[userIdentity];
    
                        if (!speakerStatsToUpdateIdentity.getDisplayName()) {
                            speakerStatsToUpdateIdentity
                                .setDisplayName(newStats[userId].displayName);
                        }
                    } else {
                        speakerStatsToUpdateIdentity = new SpeakerStats(
                            userId, newStats[userId].displayName);
                        this.stats.usersIdentity[userIdentity] = speakerStatsToUpdateIdentity;
                        speakerStatsToUpdateIdentity.markAsHasLeft();
                    }
                }
            }

            speakerStatsToUpdateIdentity.totalDominantSpeakerTime
                = newStats[userId].totalDominantSpeakerTime;
        }
    }

    //Update Id Matching by parsing message from participant_log prosody module.
    //This function is for getting identity of myself. 
    _updateIdMatching(message) {
        for (const userId in message){
            if(userId != this.conference.myUserId()){
                continue;
            }

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

            if(!idFromPacket){
                this.stats.usersIdentity[userId] = new SpeakerStats(userId, null, true);
                this.stats.userIdMatching[userId] = userId;
            }
            else{
                if (!this.stats.usersIdentity[idFromPacket]){
                    this.stats.userIdMatching[userId] = idFromPacket;
                    this.stats.usersIdentity[idFromPacket] = new SpeakerStats(userId, null, true);
                }
            }
        }
    }
}