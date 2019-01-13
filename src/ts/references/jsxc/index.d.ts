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
        constructor(argument:string | MessageProperties);
	}

    function debug(mes: string, data?: object);
    function warn(mes: string, data?: object);
    function error(mes: string, data?: object);
	namespace options{
        function get(optionName: string):any;
        function set(optionName: string, value:any):void
	}
	var storage: {
		getUserItem(userItem: string): string[];
	};
	/**
     *Create comparable bar jid. Id without resource
     *
     * @param {string} jid
     * @returns {string} comparable bar jid
     */
    function jidToBid(jid: string): string;
	namespace xmpp {
		var conn: Connection;
		var connected: boolean;
		var sifiletransfer: SiFileTransfer;
	}
	namespace gui {
		
		
		var window: {
			postMessage(message: MessageProperties): Message;
			updateProgress(message: Message, currentSize: number, totalSize: number):void;
		};
	}
}
