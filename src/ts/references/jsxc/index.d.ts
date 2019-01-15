declare namespace jsxc {
	interface ConnectionPlugins {
		si_filetransfer: SiFileTransferPlugin;
		ibb: IbbPlugin;
	}
    type Connection = ConnectionPlugins & Strophe.Connection;
    enum MessageType{
        IN='in',OUT='out',SYS='sys'
    }
    interface MessageAttachment {
        name: string;
        type: string;
        size?: number;
        data?: string;
    }
    interface MessageProperties {
        _uid?: string;
        bid: string;
        direction: MessageType;
        encrypted?: boolean;
        forwarded?: boolean;
        sender?: string;
        stamp?: number;
        msg?: string;
        attachment?: MessageAttachment;
    }
    class Message {
        static IN: MessageType.IN;
        static OUT: MessageType.OUT;
        static SYS: MessageType.SYS;
        constructor(argument: string | MessageProperties);
        /**
         *Mark message as received.
         *
         * @memberof Message
         */
        received();
	}
    
    
	namespace options{
        function get(optionName: string):any;
        function set(optionName: string, value:any):void
	}
	namespace storage {
		function getUserItem(type:string, key?:string): string[];
	}

	namespace xmpp {
		var conn: Connection;
		var connected: boolean;
        var sifiletransfer: SiFileTransfer;
        namespace httpUpload{
            var ready: boolean;
            function sendFile(file:File, message:jsxc.Message);
        } 
    }
    namespace webrtc{
        var reqFileFeatures: string[];
        /**
         * Return list of capable resources.
         *
         * @param {string} jid
         * @param {(string|string[])} requiredFeatures
         * @returns {string[]} capable resources
         */
        function getCapableRes(jid: string, requiredFeatures: string | string[]): string[];
         /**
    * Send file to full jid via jingle.
    *
    * @memberOf jsxc.webrtc
    * @param  {string} jid full jid
    * @param  {File} file
    * @return {object} session
    */
        function sendFile(jid:string,file:File):any;
    }
	namespace gui {
		
		
		namespace window {
			function postMessage(message: MessageProperties): Message;
            function updateProgress(message: Message, currentSize: number, totalSize: number): void;
            /**
             * Returns the window element
             *
             * @param {string} jid
             * @returns {JQuery}
             */
            function get(jid: string):JQuery;
            function hideOverlay(jid: string): void;
            function selectResource(bid:string, text:string, selectionCallback?:(param:{
                status: 'unavailable' | 'selected',
                result?: string
            }) => void, res?: string[]);
            function showOverlay(bid:string, content: JQuery.htmlString | JQuery.TypeOrArray<JQuery.Node | JQuery<JQuery.Node>>, allowClose:boolean);
		}
    }
    namespace muc{
        function isGroupchat(jid:string);
    }
    var fileTransfer: FileTransfer;
    function debug(mes: string, data?: object);
    function warn(mes: string, data?: object);
    function error(mes: string, data?: object);
    /**
     *Create comparable bar jid. Id without resource
     *
     * @param {string} jid
     * @returns {string} comparable bar jid
     */
    function jidToBid(jid: string): string;
    //var fileTransfer: FileTransfer;
}
