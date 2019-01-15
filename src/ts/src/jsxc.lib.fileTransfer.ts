type FileWithTransportMethod = File & { transportMethod: string };
class FileTransfer {
	/**
	 * Make bytes more human readable.
	 *
	 * @param {number} byte
	 * @returns {string}
	 * @memberof FileTransfer
	 */
	private formatByte(byte: number): string {
		const s = ['', 'KB', 'MB', 'GB', 'TB'];
		let i;

		for (i = 1; i < s.length; i++) {
			if (byte < 1024) {
				break;
			}
			byte /= 1024;
		}

		return Math.round(byte * 10) / 10 + s[i - 1];
	}
	/**
	 * Start file transfer dialog. This is the entry point to send a file from the gui
	 *
	 * @memberOf jsxc.fileTransfer
	 * @param  {String} jid
	 */
	public startGuiAction(jid: string) {
		this.showFileSelection(jid);
	}
	/**
	 * Obtain the full jid for this bid with support for the specified features
	 * A user (bid) could be connected simultaneously to the server with different clients (full jid)
	 *
	 * @private
	 * @param {string} bid
	 * @param {string[]} requiredFeatures
	 * @returns {Promise<string>} A promise including the jid with support for the specified features (or null if not found)
	 * @memberof FileTransfer
	 */
	private getFullJidWithFeaturesAsync(bid: string, requiredFeatures: string[]): Promise<string> {
		const promise = new Promise<string>(resolve => {
			this.selectFullJidWithFeatures(bid, requiredFeatures, jid => resolve(jid), () => resolve(null));
		});
		return promise;
	}
	/**
	 * Obtain the full jid for this bid with support for the specified features
	 * A user (bid) could be connected simultaneously to the server with different clients (full jid)
	 *
	 * @memberOf jsxc.fileTransfer
	 * @param  {String} bid
	 * @param {string[]} requiredFeatures
	 * @param  {Function} success_cb Called if user selects resource
	 * @param  {Function} error_cb Called if no resource was found or selected
	 */
	private selectFullJidWithFeatures(bid: string, requiredFeatures: string[], success_cb: (jid: string) => void, error_cb?: () => void) {
		const win = jsxc.gui.window.get(bid);
		let jid = win.data('jid');
		let res = Strophe.getResourceFromJid(jid);

		const fileCapableRes = jsxc.webrtc.getCapableRes(jid, requiredFeatures);
		const resources = Object.keys(jsxc.storage.getUserItem('res', bid)) || [];

		if (res === null && resources.length === 1 && fileCapableRes.length === 1) {
			// only one resource is available and this resource is also capable to receive files
			res = fileCapableRes[0];
			jid = bid + '/' + res;

			success_cb(jid);
		} else if (fileCapableRes.indexOf(res) >= 0) {
			// currently used resource is capable to receive files
			success_cb(bid + '/' + res);
		} else if (fileCapableRes.indexOf(res) < 0) {
			// show selection dialog. if fileCapableRes.length==0, it closes automatically.
			jsxc.gui.window.selectResource(
				bid,
				$.t('Your_contact_uses_multiple_clients_'),
				data => {
					if (data.status === 'unavailable') {
						jsxc.gui.window.hideOverlay(bid);

						if (typeof error_cb === 'function') {
							error_cb();
						}
					} else if (data.status === 'selected') {
						success_cb(bid + '/' + data.result);
					}
				},
				fileCapableRes
			);
		}
	}

	/**
	 * Show file selector overlay.
	 *
	 * @memberOf jsxc.fileTransfer
	 * @param  {String} jid
	 */
	private showFileSelection(jid: string) {
		const bid = jsxc.jidToBid(jid);
		const msg = $('<div><div><label><input type="file" name="files" /><label></div></div>');

		msg.addClass('jsxc_chatmessage');

		jsxc.gui.window.showOverlay(bid, msg, true);

		// open file selection for user
		msg.find('label').click();

		msg.find('[type="file"]').change(ev => {
			const input: HTMLInputElement = ev.target as HTMLInputElement;
			const file = input.files[0];

			if (!file) {
				return;
			}
			jsxc.gui.window.hideOverlay(bid);
			this.fileSelected(jid, file);
		});
	}
	/**
	 * File selection handler
	 *
	 * @private
	 * @param {string} jid
	 * @param {File} file
	 * @memberof FileTransfer
	 */
	private async fileSelected(jid: string, file: File) {
		const bid = jsxc.jidToBid(jid);
		const methodAndJid = await this.defineMethodAndJidtoSendFile(bid, file);
		if (!methodAndJid.transportMethod) {
			jsxc.gui.window.postMessage({
				bid: bid,
				direction: jsxc.Message.SYS,
				msg: $.t('No_proper_file_transfer_method_available')
			});
		} else {
			this.showOverlayToSendSelectedFile(methodAndJid.jid, methodAndJid.transportMethod, file);
		}
	}
	/**
	 *
	 *
	 * @private
	 * @param {string} bid User we are sending to
	 * @param {File} file File we are sending
	 * @returns the method and full jid to send the file to
	 * @memberof FileTransfer
	 */
	private async defineMethodAndJidtoSendFile(bid: string, file: File) {
		if (this.canSendFileWithHttpUpload(file.size)) {
			return { transportMethod: 'httpUpload', jid: undefined };
		}
		const jidForWebRtc = await this.getFullJidWithFeaturesAsync(bid, jsxc.webrtc.reqFileFeatures);
		if (jidForWebRtc) {
			return { transportMethod: 'webrtc', jid: jidForWebRtc };
		}
		const jidForSiFileTransfer = await this.getFullJidWithFeaturesAsync(bid, jsxc.xmpp.sifiletransfer.reqSiFileTranferFeatures);
		if (jidForSiFileTransfer) {
			return { transportMethod: 'siFileTransfer', jid: jidForSiFileTransfer };
		}
		return { transportMethod: null, jid: null };
	}
	/**
	 * Show and overlay that allows the user to send the selected file (or cancel it )
	 *
	 * @private
	 * @param {string} jid
	 * @param {string} transportMethod
	 * @param {File} file
	 * @memberof FileTransfer
	 */
	private showOverlayToSendSelectedFile(jid: string, transportMethod: string, file: File) {
		const bid = jsxc.jidToBid(jid);
		const attachment = $('<div>');
		attachment.addClass('jsxc_attachment');
		attachment.addClass('jsxc_' + file.type.replace(/\//, '-'));
		attachment.addClass('jsxc_' + file.type.replace(/^([^/]+)\/.*/, '$1'));
		const msg = $('<div>');
		msg.addClass('jsxc_chatmessage');
		msg.append(attachment);
		jsxc.gui.window.showOverlay(bid, msg, true);

		let img;
		if (FileReader && file.type.match(/^image\//)) {
			// show image preview
			img = $('<img alt="preview">').attr('title', file.name);
			img.attr('src', jsxc.options.get('root') + '/img/loading.gif');
			img.appendTo(attachment);

			const reader = new FileReader();

			reader.onload = () => {
				img.attr('src', reader.result as string);
			};

			reader.readAsDataURL(file);
		} else {
			attachment.text(file.name + ' (' + file.size + ' byte)');
		}

		$('<button>')
			.addClass('jsxc_btn jsxc_btn-primary')
			.text($.t('Send'))
			.click(() => {
				// user confirmed file transfer
				jsxc.gui.window.hideOverlay(bid);
				msg.remove();

				const message = jsxc.gui.window.postMessage({
					bid: bid,
					direction: jsxc.Message.OUT,
					attachment: {
						name: file.name,
						size: file.size,
						type: file.type,
						data: file.type.match(/^image\//) ? img.attr('src') : null
					}
				});

				if (transportMethod === 'webrtc') {
					const sess = jsxc.webrtc.sendFile(jid, file);

					sess.sender.on('progress', (sent: number, size: number) => {
						jsxc.gui.window.updateProgress(message, sent, size);

						if (sent === size) {
							message.received();
						}
					});
				} else if (transportMethod === 'siFileTransfer') {
					// progress is updated in xmpp.sifiletransfer.sendFile
					jsxc.xmpp.sifiletransfer.sendFileAsync(jid, file, message);
				} else if (transportMethod === 'httpUpload') {
					// progress is updated in xmpp.httpUpload.uploadFile
					jsxc.xmpp.httpUpload.sendFile(file, message);
				} else {
					// This should never happen
					jsxc.debug('Unknown method to send a file: ' + transportMethod);
					jsxc.gui.window.postMessage({
						bid: bid,
						direction: jsxc.Message.SYS,
						msg: $.t('Unknown_file_transport_method') + ' ' + transportMethod
					});
				}
			})
			.appendTo(msg);

		$('<button>')
			.addClass('jsxc_btn jsxc_btn-default')
			.text($.t('Abort'))
			.click(() => {
				// user aborted file transfer
				jsxc.gui.window.hideOverlay(bid);
			})
			.appendTo(msg);
	}

	/**
	 * Enable/disable icons for file transfer.
	 *
	 * @memberOf jsxc.fileTransfer
	 * @param  {String} bid
	 */
	public updateIcons(bid: string) {
		const win = jsxc.gui.window.get(bid);

		if (!win || win.length === 0 || !jsxc.xmpp.conn) {
			return;
		}

		jsxc.debug('Update file transfer icons for ' + bid);

		if (this.canSendFileWithHttpUpload()) {
			win.find('.jsxc_sendFile').removeClass('jsxc_disabled');
			jsxc.debug('File transfer with ' + bid + ' can be done using httpUpload');
			return;
		} else if (this.canSendFileWithWebRtc(bid)) {
			win.find('.jsxc_sendFile').removeClass('jsxc_disabled');
			jsxc.debug('File transfer with ' + bid + ' can be done using WebRtc');
			return;
		} else if (this.canSendFileWitSiFileTransfer(bid)) {
			win.find('.jsxc_sendFile').removeClass('jsxc_disabled');
			jsxc.debug('File transfer with ' + bid + ' can be done using si FileTransfer');
			return;
		}
		// No valid method found
		win.find('.jsxc_sendFile').addClass('jsxc_disabled');
		jsxc.debug('File transfer with ' + bid + ' can not be done. No valid method found');
	}
	private canSendFileWithHttpUpload(size?: number) {
		// Just check that the server is capabale.
		if (!jsxc.xmpp.httpUpload.ready) {
			return false;
		} else {
			// Check we are not trying to send somethnig too big
			const httpUploadOptions = jsxc.options.get('httpUpload') || {};
			const maxSize = httpUploadOptions.maxSize || -1;
			if (typeof size !== 'undefined' && maxSize !== -1) {
				if (size >= maxSize) {
					jsxc.debug('File too large for http upload. Max. size: ' + this.formatByte(maxSize) + ' Actual size: ' + this.formatByte(size));
					return false;
				}
			}
		}
		return true;
	}
	private canSendFileWithWebRtc(bid) {
		if (!this.isWebrtcCapable(bid)) {
			return false;
		}
		if (!this.hasSupportFor(bid, jsxc.webrtc.reqFileFeatures)) {
			return false;
		}
		return true;
	}
	private canSendFileWitSiFileTransfer(bid) {
		if (!this.isSiFileTransferCapable(bid)) {
			return false;
		}
		if (!this.hasSupportFor(bid, jsxc.xmpp.sifiletransfer.reqSiFileTranferFeatures)) {
			return false;
		}
		return true;
	}
	private isSiFileTransferCapable(bid: string) {
		return !jsxc.muc.isGroupchat(bid);
	}
	/**
	 * return true if the current client we are talking to in this  chat
	 * has support  si file transfer
	 * @private
	 * @param {string} bid
	 * @param {string[]} reqFeatures
	 * @returns
	 * @memberof FileTransfer
	 */
	private hasSupportFor(bid: string, reqFeatures: string[]) {
		const win = jsxc.gui.window.get(bid);

		if (!win || win.length === 0 || !jsxc.xmpp.conn) {
			return false;
		}
		// Get the full jabber id  from the window
		// If we have not yet received any message it will not include a resource
		const jid = win.data('jid');
		// res can be null
		const res = Strophe.getResourceFromJid(jid);
		const fileCapableRes = jsxc.webrtc.getCapableRes(bid, reqFeatures);
		const resources = Object.keys(jsxc.storage.getUserItem('res', bid) || {}) || [];

		// If the client we are talking to is one with support for the capability return true;
		if (fileCapableRes.indexOf(res) > -1) {
			return true;
		}
		// we dont know yet the client we are talking to (probably we have not received any message from it)
		// but if there is only one and also only one with support for the capability return true;
		if (res === null && fileCapableRes.length === 1 && resources.length === 1) {
			return true;
		}
		return false;
	}
	private isWebrtcCapable(bid: string) {
		return !jsxc.muc.isGroupchat(bid);
	}
}
jsxc.fileTransfer = new FileTransfer();
$(document).on('update.gui.jsxc', (ev, bid) => {
	jsxc.fileTransfer.updateIcons(bid);
});
