type FileWithTransportMethod = File & {transportMethod: string};
class FileTransfer {

	/**
	 * Make bytes more human readable.
	 *
	 * @static
	 * @param {number} byte
	 * @returns {string}
	 * @memberof FileTransfer
	 */
	formatByte(byte: number): string {
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
	 * Start file transfer dialog.
	 *
	 * @memberOf jsxc.fileTransfer
	 * @param  {String} jid
	 */
	startGuiAction(jid: string) {
		const bid = jsxc.jidToBid(jid);
		const res = Strophe.getResourceFromJid(jid);

		if (!res && !jsxc.xmpp.httpUpload.ready) {
			if (this.isWebrtcCapable(bid)) {
				this.selectResource(bid, (selectedResource) => this.startGuiAction(selectedResource));
			} else {
				jsxc.gui.window.postMessage({
					bid: bid,
					direction: jsxc.Message.SYS,
					msg: $.t('No_proper_file_transfer_method_available')
				});
			}

			return;
		}

		this.showFileSelection(jid);
	}
	/**
	 * Show select dialog for file transfer capable resources.
	 *
	 * @memberOf jsxc.fileTransfer
	 * @param  {String} bid
	 * @param  {Function} success_cb Called if user selects resource
	 * @param  {Function} error_cb Called if no resource was found or selected
	 */
	selectResource(bid: string, success_cb: (jid: string) => void, error_cb?: () => void) {
		const win = jsxc.gui.window.get(bid);
		let jid = win.data('jid');
		let res = Strophe.getResourceFromJid(jid);

		const fileCapableRes = jsxc.webrtc.getCapableRes(jid, jsxc.webrtc.reqFileFeatures);
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
			// show selection dialog
			jsxc.gui.window.selectResource(
				bid,
				$.t('Your_contact_uses_multiple_clients_'),
				(data) => {
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
	 * Show file selector.
	 *
	 * @memberOf jsxc.fileTransfer
	 * @param  {String} jid
	 */
	showFileSelection(jid: string) {
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
			const transportMethodInfo: { transportMethod: string } = { transportMethod: undefined };
			const fileEx = $.extend(file, transportMethodInfo);
			this.fileSelected(jid, msg, fileEx);
		});
	}
	showFileTooLarge(bid, file) {
		const maxSize = this.formatByte(jsxc.options.get('httpUpload').maxSize);
		const fileSize = this.formatByte(file.size);

		jsxc.gui.window.postMessage({
			bid: bid,
			direction: jsxc.Message.SYS,
			msg: $.t('File_too_large') + ' (' + fileSize + ' > ' + maxSize + ')'
		});

		jsxc.gui.window.hideOverlay(bid);
	}
	/**
	 * Callback for file selector.
	 *
	 * @memberOf jsxc.fileTransfer
	 * @param  {String} jid
	 * @param  {jQuery} msg jQuery object of temporary file message
	 * @param  {FileWithTransportMethod} file selected file
	 */
	fileSelected(jid: string, msg: JQuery<HTMLElement>, file: FileWithTransportMethod) {
		const bid = jsxc.jidToBid(jid);
		const httpUploadOptions = jsxc.options.get('httpUpload') || {};
		const maxSize = httpUploadOptions.maxSize || -1;

		if (file.transportMethod !== 'webrtc' && jsxc.xmpp.httpUpload.ready && maxSize >= 0 && file.size > maxSize) {
			jsxc.debug('File too large for http upload.');

			if (this.isWebrtcCapable(bid)) {
				// try data channels
				file.transportMethod = 'webrtc';

				this.selectResource(
					bid,
					selectedJid => {
						this.fileSelected(selectedJid, msg, file);
					},
					() => {
						this.showFileTooLarge(bid, file);
					}
				);
			} else {
				this.showFileTooLarge(bid, file);
			}

			return;
		} else if (!jsxc.xmpp.httpUpload.ready && Strophe.getResourceFromJid(jid)) {
			// http upload not available
			file.transportMethod = 'webrtc';
		}

		const attachment = $('<div>');
		attachment.addClass('jsxc_attachment');
		attachment.addClass('jsxc_' + file.type.replace(/\//, '-'));
		attachment.addClass('jsxc_' + file.type.replace(/^([^/]+)\/.*/, '$1'));

		msg.empty().append(attachment);
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

				if (file.transportMethod === 'webrtc') {
					const sess = jsxc.webrtc.sendFile(jid, file);

					sess.sender.on('progress', (sent: number, size: number) => {
						jsxc.gui.window.updateProgress(message, sent, size);

						if (sent === size) {
							message.received();
						}
					});
				} else {
					// progress is updated in xmpp.httpUpload.uploadFile
					jsxc.xmpp.httpUpload.sendFile(file, message);
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
	updateIcons(bid: string) {
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
		}/*
		else if (this.canSendFileWitSiFileTransfer(bid)) {
			win.find('.jsxc_sendFile').removeClass('jsxc_disabled');
			jsxc.debug('File transfer with ' + bid + ' can be done using si FileTransfer');
			return;
		}
		*/
		// No valid method found
		win.find('.jsxc_sendFile').addClass('jsxc_disabled');
		jsxc.debug('File transfer with ' + bid + ' can not be done. No valid method found');
	}
	canSendFileWithHttpUpload() {
		if (!jsxc.xmpp.httpUpload.ready) {
			return false;
		}
		return true;
	}
	canSendFileWithWebRtc(bid) {
		if (!this.isWebrtcCapable(bid)) {
			return false;
		}
		if (!this.hasSupportFor(bid, jsxc.webrtc.reqFileFeatures)) {
			return false;
		}
		return true;
	}
	canSendFileWitSiFileTransfer(bid) {
		if (!this.isSiFileTransferCapable(bid)) {
			return false;
		}
		if (!this.hasSupportFor(bid, [Strophe.NS['SI'], Strophe.NS['SI_FILE_TRANSFER']])) {
			return false;
		}
		return true;
	}
	isSiFileTransferCapable(bid) {
		return !jsxc.muc.isGroupchat(bid);
	}
	hasSupportFor(bid, reqFeatures) {
		const win = jsxc.gui.window.get(bid);

		if (!win || win.length === 0 || !jsxc.xmpp.conn) {
			return;
		}

		const jid = win.data('jid');
		const res = Strophe.getResourceFromJid(jid);
		const fileCapableRes = jsxc.webrtc.getCapableRes(bid, reqFeatures);
		const resources = Object.keys(jsxc.storage.getUserItem('res', bid) || {}) || [];

		if (fileCapableRes.indexOf(res) > -1 || (res === null && fileCapableRes.length === 1 && resources.length === 1)) {
			return true;
		} else {
			return false;
		}
	}
	isWebrtcCapable(bid) {
		return !jsxc.muc.isGroupchat(bid);
	}
}

$(document).on('update.gui.jsxc', (ev, bid) => {
	jsxc.fileTransfer = new FileTransfer();
	jsxc.fileTransfer.updateIcons(bid);
});
