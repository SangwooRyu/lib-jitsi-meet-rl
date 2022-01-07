import { getLogger } from '@jitsi/logger';
import { $msg } from 'strophe.js';

import * as MediaType from '../../service/RTC/MediaType';
import XMPPEvents from '../../service/xmpp/XMPPEvents';

const logger = getLogger(__filename);

/**
 * The AVModeration logic.
 */
export default class AVModeration {

    /**
     * Constructs AV moderation room.
     *
     * @param {ChatRoom} room the main room.
     */
    constructor(room) {
        this._xmpp = room.xmpp;

        this._mainRoom = room;

        this._moderationEnabledByType = {
            audio: false,
            video: false,
            chat: false,
            poll: false,
            name: false,
            presenter: false,
        };

        this._whitelist = {
            audio: [],
            video: [],
            chat: [],
            poll: [],
            name: [],
            presenter: [],
        };

        this._onMessage = this._onMessage.bind(this);
        this._xmpp.addListener(XMPPEvents.AV_MODERATION_RECEIVED, this._onMessage);
    }

    /**
     * Stops listening for events.
     */
    dispose() {
        this._xmpp.removeListener(XMPPEvents.AV_MODERATION_RECEIVED, this._onMessage);
    }

    /**
     * Whether AV moderation is supported on backend.
     *
     * @returns {boolean} whether AV moderation is supported on backend.
     */
    isSupported() {
        return Boolean(this.getComponentAddress());
    }

    /**
     * Gets the address of the Breakout Rooms XMPP component.
     *
     * @returns The address of the component.
     */
    getComponentAddress() {
        return this._xmpp.avModerationComponentAddress;
    }

    /**
     * Enables or disables AV Moderation by sending a msg with command to the component.
     */
    enable(state, kind) {
        if (!this.isSupported() || !this._mainRoom.isModerator()) {
            logger.error(`Cannot enable:${state} AV moderation supported:${this.isSupported()}, 
                moderator:${this._mainRoom.isModerator()}`);

            return;
        }

        if (state === this._moderationEnabledByType[kind]) {
            logger.warn(`Moderation already in state:${state} for kind:${kind}`);

            return;
        }

        const message = {
            enable: state,
            kind
        };

        this._sendMessage(message);
    }

    /**
     * Approves that a participant can unmute by sending a msg with its jid to the component.
     */
    approve(kind, jid) {
        if (!this.isSupported() || !this._mainRoom.isModerator()) {
            logger.error(`Cannot approve in AV moderation supported:${this.isSupported()}, 
                moderator:${this._mainRoom.isModerator()}`);

            return;
        }

        const message = {
            kind,
            jidToWhitelist: jid
        };

        this._sendMessage(message);
    }

    /**
     * Rejects that a participant can unmute by sending a msg with its jid to the component.
     */
    reject(kind, jid) {
        if (!this.isSupported() || !this._mainRoom.isModerator()) {
            logger.error(`Cannot reject in AV moderation supported:${this.isSupported()},
                moderator:${this._mainRoom.isModerator()}`);

            return;
        }

        // send a message to remove from whitelist the jid and reject it to unmute
        const message = {
            kind,
            jidToBlacklist: jid
        };

        this._sendMessage(message);
    }

    _sendMessage(message) {
        const msg = $msg({ to: this.getComponentAddress() });
        const jsonMsg = JSON.stringify({
            ...message,
            type: 'av_moderation',
            room: this._mainRoom.roomjid
        });
        msg.c('json-message', { xmlns: 'http://jitsi.org/jitmeet' }, jsonMsg);
        this._xmpp.connection.send(msg);
    }

    /**
     * Receives av_moderation parsed messages as json.
     * @param obj the parsed json content of the message to process.
     * @private
     */
    _onMessage(obj) {
        const { removed, kind, enabled, approved, actor, whitelists: newWhitelists } = obj;

        if (newWhitelists) {
            const oldList = this._whitelist[kind];
            const newList = newWhitelists[kind];

            if (removed) {
                oldList.filter(x => !newList.includes(x))
                    .forEach(jid => this._xmpp.eventEmitter
                        .emit(XMPPEvents.AV_MODERATION_PARTICIPANT_REJECTED, kind, jid));
            } else {
                newList.filter(x => !oldList.includes(x))
                    .forEach(jid => this._xmpp.eventEmitter
                        .emit(XMPPEvents.AV_MODERATION_PARTICIPANT_APPROVED, kind, jid));
            }

            this._whitelist[kind] = newList;
        } else if (enabled !== undefined && this._moderationEnabledByType[kind] !== enabled) {
            this._moderationEnabledByType[kind] = enabled;

            this._xmpp.eventEmitter.emit(XMPPEvents.AV_MODERATION_CHANGED, enabled, kind, actor);
        } else if (removed) {
            this._xmpp.eventEmitter.emit(XMPPEvents.AV_MODERATION_REJECTED, kind);
        } else if (approved) {
            this._xmpp.eventEmitter.emit(XMPPEvents.AV_MODERATION_APPROVED, kind);
        }
    }
}
