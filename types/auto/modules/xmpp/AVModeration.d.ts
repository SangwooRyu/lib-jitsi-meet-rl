/**
 * The AVModeration logic.
 */
export default class AVModeration {
    /**
     * Constructs AV moderation room.
     *
     * @param {ChatRoom} room the main room.
     */
    constructor(room: any);
    _xmpp: any;
    _mainRoom: any;
    _moderationEnabledByType: {
        audio: boolean;
        video: boolean;
        chat: boolean;
        poll: boolean;
        name: boolean;
        presenter: boolean;
    };
    _whitelist: {
        audio: any[];
        video: any[];
        chat: any[];
        poll: any[];
        name: any[];
        presenter: any[];
    };
    /**
     * Receives av_moderation parsed messages as json.
     * @param obj the parsed json content of the message to process.
     * @private
     */
    private _onMessage;
    /**
     * Stops listening for events.
     */
    dispose(): void;
    /**
     * Whether AV moderation is supported on backend.
     *
     * @returns {boolean} whether AV moderation is supported on backend.
     */
    isSupported(): boolean;
    /**
     * Gets the address of the Breakout Rooms XMPP component.
     *
     * @returns The address of the component.
     */
    getComponentAddress(): any;
    /**
     * Enables or disables AV Moderation by sending a msg with command to the component.
     */
    enable(state: any, kind: any): void;
    /**
     * Approves that a participant can unmute by sending a msg with its jid to the component.
     */
    approve(kind: any, jid: any): void;
    /**
     * Rejects that a participant can unmute by sending a msg with its jid to the component.
     */
    reject(kind: any, jid: any): void;
    _sendMessage(message: any): void;
}
