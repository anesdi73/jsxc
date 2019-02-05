declare namespace jsxc {
	interface ConnectionPlugins {
		si_filetransfer: SiFileTransferPlugin;
		ibb: IbbPlugin;
		register: RegisterPlugin;
		disco: DiscoPlugin;
		caps: CapsPlugin;
		options: {
			sync: boolean;
		};
		authenticated: boolean;
		authenticate();
		/**
		 * User overrideable function that receives the new valid rid.
		 *
		 * The default function does nothing. User code can override this with
		 *  > Strophe.Connection.nextValidRid = function (rid) {
		 *  >    (user code)
		 *  > };
		 *
		 * @param {number} rid
		 */
		nextValidRid(rid: number): void;
	}
	type Connection = ConnectionPlugins & Strophe.Connection;
	enum MessageType {
		IN = "in",
		OUT = "out",
		SYS = "sys"
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
	interface LoginForm {
		form: JQuery<HTMLElement>;
		jid: JQuery<HTMLElement>;
		pass: JQuery<HTMLElement>;
		triggered: boolean;
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
	var CONST: {
		STATE: {
			INITIATING: 0;
			PREVCONFOUND: 1;
			SUSPEND: 2;
			TRYTOINTERCEPT: 3;
			INTERCEPTED: 4;
			ESTABLISHING: 5;
			READY: 6;
		};
		UISTATE: {
			INITIATING: 0;
			READY: 1;
		};
	};
	namespace options {
		function get(optionName: string): any;
		function set(optionName: string, value: any): void;
		var loginForm: LoginForm;
	}
	namespace storage {
		function getUserItem(type: string, key?: string): string[];
		/**
		 * Load item from storage
		 *
		 * @param {string} variableName
		 * @param {boolean} [useUserKey]
		 * @returns {*}
		 */
		function getItem(variableName: string, useUserKey?: boolean): any;
	}

	namespace xmpp {
		var conn: Connection;
		var connected: boolean;
		/**
		 * Triggerd if the rid changed
		 *
		 * @param {number} rid
		 */
		function onRidChange(rid: number);
		/**
		 * Create new connection or attach to old
		 *
		 */
		function login();
		/**
		 * Create new connection with given parameters.
		 *
		 * @param {string} jid
		 * @param {string} password
		 */
		function login(jid: string, password: string);
		/**
		 * Attach connection with given parameters.
		 *
		 * @param {string} jid
		 * @param {string} password
		 * @param {string} rid connection
		 */
		function login(jid: string, password: string, rid: string);
		var sifiletransfer: SiFileTransfer;
		var securityLabels: SecurityLabels;
		namespace httpUpload {
			var ready: boolean;
			function sendFile(file: File, message: jsxc.Message);
		}
	}
	namespace webrtc {
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
		function sendFile(jid: string, file: File): any;
	}
	namespace gui {
		/**
		 * Creates and show a window to register and login as new user
		 *
		 *
		 *
		 * @param {boolean} loginAfterSuccesfullRegister
		 */
		function showRegisterUserBox(loginAfterSuccesfullRegister: boolean);

		/**
		 * Create and show a wait dialog
		 *
		 * @param {string} msg message to display to the user
		 */
		function showWaitAlert(msg: string): void;

		/**
		 * Create and show a wait dialog
		 *
		 * @param {string} msg message to display to the user
		 */
		function showAlert(msg: string): void;

		/**
		 * Create and show a confirm dialog
		 *
		 * @param {string} msg
		 * @param {Function} confirm
		 * @param {Function} dismiss
		 */
		function showConfirmDialog(msg: string, confirm: Function, dismiss: Function): void;

		namespace dialog {
			/**
			 * Open a Dialog.
			 *
			 * @param {(Array<JQuery.htmlString | JQuery.TypeOrArray<JQuery.Node | JQuery<JQuery.Node>>>)} data Data of the dialog
			 * @param {{noclose?:boolean, name?:string}} [o] Options for the dialog
			 */
			function open(
				data: JQuery.htmlString | JQuery.TypeOrArray<JQuery.Node | JQuery<JQuery.Node>>,
				o?: { noclose?: boolean; name?: string }
			);

			function resize();
			/**
			 * If no name is provided every dialog will be closed,
			 * otherwise only dialog with given name is closed.
			 *
			 * @param {string} [name] Close only dialog with the given name
			 */
			function close(name?: string): void;
		}
		namespace template {
			/**
			 * Return requested template and replace all placeholder
			 *
			 * @param {string} name template name
			 * @param {string} [bid]
			 * @param {string} [msg]
			 * @returns {JQuery} HTML Template
			 */
			function get(name: string, bid?: string, msg?: string): JQuery<HTMLElement>;
		}

		namespace window {
			function postMessage(message: MessageProperties): Message;
			function updateProgress(message: Message, currentSize: number, totalSize: number): void;
			/**
			 * Returns the window element
			 *
			 * @param {string} jid
			 * @returns {JQuery}
			 */
			function get(jid: string): JQuery;
			function hideOverlay(jid: string): void;
			function selectResource(
				bid: string,
				text: string,
				selectionCallback?: (param: { status: "unavailable" | "selected"; result?: string }) => void,
				res?: string[]
			);
			function showOverlay(
				bid: string,
				content: JQuery.htmlString | JQuery.TypeOrArray<JQuery.Node | JQuery<JQuery.Node>>,
				allowClose: boolean
			);
		}
	}
	namespace muc {
		function isGroupchat(jid: string);
	}
	var triggeredFromBox: boolean;
	var bid: string;
	var fileTransfer: FileTransfer;
	var register: Register;

	function debug(mes: string, data?: object, level?:string);
	function warn(mes: string, data?: object);
	function error(mes: string, data?: object);
	/**
	 *Create comparable bar jid. Id without resource
	 *
	 * @param {string} jid
	 * @returns {string} comparable bar jid
	 */
	function jidToBid(jid: string): string;

	/**
	 *
	 *
	 * @param {()=>void} [cb] Called after login is prepared with result as param
	 */
	function prepareLogin(cb?: (setting: any) => void);

	/**
	 * Load settings and prepare jid.
	 *
	 * @param {string} username
	 * @param {string} [password]
	 * @param {()=>void} [cb] Called after login is prepared with result as param
	 */
	function prepareLogin(username: string, password?: string, cb?: (setting: any) => void);

	function changeState(state: number): void;

	//var fileTransfer: FileTransfer;
}
