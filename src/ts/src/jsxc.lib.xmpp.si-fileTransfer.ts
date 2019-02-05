/**
 *Details of an ongoing Si File Transfer
 *
 * @interface Transfer
 */
interface Transfer {
	/**
	 * GUI Message that displays information for this transfer
	 *
	 * @type {jsxc.Message}
	 * @memberof Transfer
	 */
	message: jsxc.Message;
	/**
	 * sender JID
	 *
	 * @type {string}
	 * @memberof Transfer
	 */
	from: string;
	/**
	 * Transfer session identifier
	 *
	 * @type {string}
	 * @memberof Transfer
	 */
	sid: string;
	/**
	 * File name with extension
	 *
	 * @type {string}
	 * @memberof Transfer
	 */
	filename: string;
	/**
	 * File total size in bytes
	 *
	 * @type {number}
	 * @memberof Transfer
	 */
	size: number;
	/**
	 * Mime type
	 *
	 * @type {string}
	 * @memberof Transfer
	 */
	mime: string;
	/**
	 *  donwloaded data for the file
	 *
	 * @type {string}
	 * @memberof Transfer
	 */
	data: string;
	/**
	 * Next sequence id expected
	 *
	 * @type {number}
	 * @memberof Transfer
	 */
	expectedSeq: number;
}

class SiFileTransfer {
	/**
	 * the XMPP connection
	 *
	 * @private
	 * @type {jsxc.Connection}
	 * @memberof SiFileTransfer
	 */
	private conn: jsxc.Connection = null;
	/**
	 * Ongoing file transfers (only those using si file transfer)
	 *
	 * @private
	 * @type {{ [id: string]: Transfer }}
	 * @memberof SiFileTransfer
	 */
	private transfers: { [id: string]: Transfer } = {};

	/**
	 * Features to signal support for Si File Trnasfer
	 * Implemented as a property instead of a member since this class be initializaed
	 * before the siFileTransfer plugin is loaded
	 *
	 * @readonly
	 * @type {string[]}
	 * @memberof SiFileTransfer
	 */
	public get reqSiFileTranferFeatures(): string[] {
		return [Strophe.NS['SI'], Strophe.NS['SI_FILE_TRANSFER']];
	}

	/**
	 * Initialize sifiletransfer +ibb plugin for jsxc. (XEP-0096: SI File Transfer + XEP-0047: In-Band Bytestreams)
	 * This is executed when connection is established so it will be called potentially multiple times (or none)
	 * @returns
	 * @memberof SiFileTransfer
	 */
	init() {
		jsxc.debug('sifiletransfer.init');
		if (!jsxc.xmpp.conn || !jsxc.xmpp.connected) {
			$(document).on('attached.jsxc', this.init);

			return;
		}
		if (this.isDisabled()) {
			jsxc.debug('si file transfer disabled');
			return;
		}
		this.conn = jsxc.xmpp.conn;
		this.conn.si_filetransfer.addFileHandler((from, sid, filename, size, mime) => this.fileHandler(from, sid, filename, size, mime));
		this.conn.ibb.addIBBHandler((type, from, sid, data, seq) => this.ibbHandler(type, from, sid, data, seq));
	}
	/**
	 * returns true if si file trnasfer has been disabled by a configuration option
	 *
	 * @private
	 * @returns
	 * @memberof SiFileTransfer
	 */
	private isDisabled() {
		const options = jsxc.options.get('siFileTransfer') || { enable: true };
		return !options.enable;
	}
	/**
	 * Handle file negotiation using XEP-0096: SI File Transfer.
	 * This is executed when a file sending request is received
	 * @private
	 * @param {string} from
	 * @param {string} sid
	 * @param {string} filename
	 * @param {string} size
	 * @param {string} mime
	 * @memberof SiFileTransfer
	 */
	private fileHandler(from: string, sid: string, filename: string, size: string, mime: string) {
		jsxc.debug('incoming si file transfer from: ' + from + ' sid:' + sid + ' filename:' + filename + ' size: ' + size + ' mime:' + mime);

		const bid = jsxc.jidToBid(from);
		// TODO: it would be nice to show a downloading gif while we wait for the file to download if we dont have a thmubnail
		const message = jsxc.gui.window.postMessage({
			_uid: sid + ':msg',
			bid: bid,
			direction: jsxc.Message.IN,
			attachment: {
				name: filename,
				type: mime || 'application/octet-stream'
			}
		});
		this.transfers[sid] = {
			message: message,
			from: from,
			sid: sid,
			filename: filename,
			size: Number(size),
			mime: mime,
			data: '',
			expectedSeq: 0
		};
	}
	/**
	 * Handle ibb packages recived via XEP-0047: In-Band Bytestreams.
	 * This is executed when a package is recived
	 * @private
	 * @param {string} type
	 * @param {string} from
	 * @param {string} sid
	 * @param {string} data
	 * @param {string} seq
	 * @returns
	 * @memberof SiFileTransfer
	 */
	private ibbHandler(type: string, from: string, sid: string, data: string, seq: string) {
		jsxc.debug('si file transfer IBB packet received. From: ' + from + ' sid:' + sid + ' seq: ' + seq + ' type:' + type);
		const transfer = this.transfers[sid];
		if (!transfer) {
			// This can happen when sending a file. The other side can send a close to indicate that it has all the packets
			// See xep-0047 v2.0  section 2.3
			// It is not an error and can be safely ignored
			jsxc.debug('si file transfer IBB packet received for unknown file tranfer: ' + sid);
			return;
		}

		switch (type) {
			case 'open':
				// new file, only metadata
				// we use the metada from the si file transfer negotiation. It includes additional data not included in the ibb open packet
				break;
			case 'data':
				// We are assuming all data is recieved secuentially and without duplicates. Check it
				const seqValue = Number(seq);
				if (transfer.expectedSeq !== seqValue) {
					jsxc.debug(
						'si file transfer IBB packet received out of order. From: ' +
							from +
							' sid:' +
							sid +
							' seq: ' +
							seq +
							' expected seq:' +
							transfer.expectedSeq
					);
					return;
				}
				transfer.expectedSeq = seqValue + 1;
				// convert from base64
				const decodedData = atob(data);
				// store data to later display it
				transfer.data += decodedData;
				// update gui with progress details
				// TODO: it would be nice to include also download speed, time to finish, total size and current size
				// TODO: font size is very small for progress. It is difficult to see it
				// TODO: it would be nice to include progress bar not only the number value or some other graphical feedback (update the download gif )
				jsxc.gui.window.updateProgress(transfer.message, transfer.data.length, transfer.size);
				break;
			case 'close':
				jsxc.debug('si file transfer Finished. Expected size: ' + transfer.size + ' Received size:' + transfer.data.length);
				// check we have all the data we expected to receive
				if (transfer.size === transfer.data.length) {
					// handle file received
					this.onReceivedFile(transfer);
				} else {
					// display failure notification
					jsxc.gui.window.postMessage({
						bid: jsxc.jidToBid(transfer.from),
						direction: jsxc.Message.SYS,
						msg: $.t('File_was_not_properly_received') + ': ' + transfer.filename
					});
				}
				// delete tranfer data
				this.transfers[sid] = null;
				delete this.transfers[sid];
				break;
			default:
				throw new Error('shouldn\'t be here.');
		}
	}
	/**
	 * Handle that a whole file has been received
	 *
	 * @private
	 * @param {Transfer} transfer the recieved file
	 * @returns {void}
	 * @memberof SiFileTransfer
	 */
	private onReceivedFile(transfer: Transfer): void {
		jsxc.debug('file received via si file transfer', transfer);

		if (!FileReader) {
			return;
		}
		// create a file in memory from the data downloaded
		const file = this.fileFromTransfer(transfer);
		// Read the created file
		const reader = new FileReader();
		reader.onload = ev => {
			const data: string = reader.result as string;
			// When the file is read update the gui
			// (i.e. display a thumbnail if it is an image)
			// TODO: The Gui is not displaying the filename nor the size of the file. ¿tooltip?
			jsxc.gui.window.postMessage({
				_uid: transfer.sid + ':msg',
				bid: jsxc.jidToBid(transfer.from),
				direction: jsxc.Message.IN,
				attachment: {
					name: transfer.filename,
					type: this.fileTypeFromTransfer(transfer),
					size: transfer.size,
					data
				}
			});
		};
		reader.readAsDataURL(file);
	}

	/**
	 * Create a file from a finished Transfer
	 *
	 * @private
	 * @param {Transfer} transfer
	 * @returns {File}
	 * @memberof SiFileTransfer
	 */
	private fileFromTransfer(transfer: Transfer): File {
		const type = this.fileTypeFromTransfer(transfer);
		const bytes = this.byteArrayFromTransfer(transfer);
		const file = new File([bytes.buffer], transfer.filename, {
			type: type
		});
		return file;
	}
	/**
	 * Returns  a file type (mime) from a Transfer
	 *
	 * @private
	 * @param {Transfer} transfer
	 * @returns {string} mime type
	 * @memberof SiFileTransfer
	 */
	private fileTypeFromTransfer(transfer: Transfer): string {
		let type: string;
		if (!transfer.mime) {
			type = this.mimeTypeFromFileName(transfer.filename);
		} else {
			type = transfer.mime;
		}
		return type;
	}
	/**
	 * Returns a byteArray from a finished Transfer
	 *
	 * @private
	 * @param {Transfer} transfer
	 * @returns {Uint8Array}
	 * @memberof SiFileTransfer
	 */
	private byteArrayFromTransfer(transfer: Transfer): Uint8Array {
		const bytes = new Uint8Array(transfer.size);
		for (let i = 0; i < transfer.size; i++) {
			bytes[i] = transfer.data.charCodeAt(i);
		}
		return bytes;
	}
	/**
	 * Returns the mimetype from the file name
	 *
	 * @private
	 * @param {string} fileNameWithExtension
	 * @returns {string}
	 * @memberof SiFileTransfer
	 */
	private mimeTypeFromFileName(fileNameWithExtension: string): string {
		let type;
		const ext = fileNameWithExtension.replace(/.+\.([a-z0-9]+)$/i, '$1').toLowerCase();

		switch (ext) {
			case 'jpg':
			case 'jpeg':
			case 'png':
			case 'gif':
			case 'svg':
				type = 'image/' + ext.replace(/^jpg$/, 'jpeg');
				break;
			case 'mp3':
			case 'wav':
				type = 'audio/' + ext;
				break;
			case 'pdf':
				type = 'application/pdf';
				break;
			case 'txt':
				type = 'text/' + ext;
				break;
			default:
				type = 'application/octet-stream';
		}
		return type;
	}
	/**
	 * Send a file using si File Transfer with ibb asynchrounsly
	 *
	 * @param {string} jid Full jabber identifier where we are sending the file to
	 * @param {File} file file we are sending
	 * @param {jsxc.Message} message Gui message that shows information regarding this file transmission
	 * @returns {Promise<void>}
	 * @memberof SiFileTransfer
	 */
	public async sendFileAsync(jid: string, file: File, message: jsxc.Message): Promise<void> {
		try {
			// Read asynchronusly the file (no await)
			const fileData$ = AsyncAdapter.readFileAsync(file);
			// Create a Si file transfer session
			const sid = await AsyncAdapter.SiFileTransfer.sendAsync(jid, file);
			// Open an In band byte stream (no await)
			const blocksize$ = AsyncAdapter.IBB.openAsync(jid, sid);

			// Wait for the pending asynchronous operation
			const res = await Promise.all([blocksize$, fileData$]);
			const blocksize = res[0];
			const fileData = res[1];

			const fileBytesBase64 = fileData.split('base64,')[1];
			const numChunks = Math.ceil(fileBytesBase64.length / blocksize);

			for (let seq = 0; seq < numChunks; seq++) {
				const seqData = fileBytesBase64.slice(seq * blocksize, (seq + 1) * blocksize);
				await AsyncAdapter.IBB.dataAsync(jid, sid, seq, seqData);
				jsxc.gui.window.updateProgress(message, seq, numChunks);
			}
			AsyncAdapter.IBB.closeAsync(jid, sid);
			// TODO: We could remark that the file has been sent using a green border
			message.received();
		} catch (error) {
			// TODO: We could remark that the file has not been sent using a red border
			jsxc.debug('Error sending file with sifileTransfer: ' + error);
			const bid = jsxc.jidToBid(jid);
			jsxc.gui.window.postMessage({
				bid: bid,
				direction: jsxc.Message.SYS,
				msg: $.t('Error_sending_file') + ' ' + file.name
			 });
		}
	}

}
// register the module initialization when the connection is established
$(document).ready(function() {
	// Triggered when connection is established
	jsxc.xmpp.sifiletransfer = new SiFileTransfer();
	$(document).on('attached.jsxc', () => jsxc.xmpp.sifiletransfer.init());
});
