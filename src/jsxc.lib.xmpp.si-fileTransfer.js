/**
 * siFileTransfer namespace for jsxc.
 *
 * @namespace jsxc.sifiletransfer
 */
jsxc.xmpp.sifiletransfer = {
	conn: null,
	transfers: {}
};

/**
 * Initialize sifiletransfer plugin.
 *
 * @private
 * @memberOf jsxc.sifiletransfer
 */
jsxc.xmpp.sifiletransfer.init = function() {
	var self = jsxc.xmpp.sifiletransfer;
	jsxc.debug("sifiletransfer.init");
	if (!jsxc.xmpp.conn || !jsxc.xmpp.connected) {
		$(document).on("attached.jsxc", self.init);

		return;
	}
	if (self.isDisabled()) {
		jsxc.debug("si file transfer disabled");
		return;
	}
	self.conn = jsxc.xmpp.conn;
	self.conn.si_filetransfer.addFileHandler(self.fileHandler);
	self.conn.ibb.addIBBHandler(self.ibbHandler);
};

jsxc.xmpp.sifiletransfer.fileHandler = function(from, sid, filename, size, mime) {
	var self = jsxc.xmpp.sifiletransfer;
	jsxc.debug("incoming si file transfer from: " + from + " sid:" + sid + " filename:" + filename + " size: " + size + " mime:" + mime);

	var buddylist = jsxc.storage.getUserItem("buddylist") || [];
	var bid = jsxc.jidToBid(from);

	if (buddylist.indexOf(bid) > -1) {
		var message = jsxc.gui.window.postMessage({
			_uid: sid + ":msg",
			bid: bid,
			direction: jsxc.Message.IN,
			attachment: {
				name: filename,
				type: mime || "application/octet-stream"
			}
		});
		self.transfers[sid] = { message:message, from:from, sid:sid, filename:filename, size:Number(size), mime:mime, sent: 0, data: "" };
	}
};
jsxc.xmpp.sifiletransfer.ibbHandler = function(type, from, sid, data, seq) {
	var self = jsxc.xmpp.sifiletransfer;
	jsxc.debug("si file transfer IBB packet received. From: " + from + " sid:" + sid + " seq: " + seq + " type:" + type);
	var transfer = self.transfers[sid];
	if (transfer) {
		switch (type) {
			case "open":
				// new file, only metadata
				break;
			case "data":
				// data
				var decodedData = atob(data);
				transfer.data += decodedData;
				jsxc.gui.window.updateProgress(transfer.message, transfer.data.length, transfer.size);
				break;
			case "close":
				// and we're done
				jsxc.debug("si file transfer Finished. Expected size: " + transfer.size + " Received size:" + transfer.data.length);
				if (transfer.size === transfer.data.length) {
					self.onReceivedFile(transfer);
				} else {
                    // display failure notification
                    jsxc.gui.window.postMessage({
                        bid: jsxc.jidToBid(transfer.from),
                        direction: jsxc.Message.SYS,
                        msg: $.t('File_was_not_properly_received') + ': ' + transfer.filename
                     });
				}

				break;
			default:
				throw new Error("shouldn't be here.");
		}
	}
};

jsxc.xmpp.sifiletransfer.onReceivedFile = function(transfer) {
	jsxc.debug("file received", transfer);

	if (!FileReader) {
		return;
	}

	var reader = new FileReader();
	var type;

	if (!transfer.mime) {
		var ext = transfer.filename.replace(/.+\.([a-z0-9]+)$/i, "$1").toLowerCase();

		switch (ext) {
			case "jpg":
			case "jpeg":
			case "png":
			case "gif":
			case "svg":
				type = "image/" + ext.replace(/^jpg$/, "jpeg");
				break;
			case "mp3":
			case "wav":
				type = "audio/" + ext;
				break;
			case "pdf":
				type = "application/pdf";
				break;
			case "txt":
				type = "text/" + ext;
				break;
			default:
				type = "application/octet-stream";
		}
	} else {
		type = transfer.mime;
	}

	reader.onload = function(ev) {
		// modify element with uid metadata.actualhash

		jsxc.gui.window.postMessage({
			_uid: transfer.sid + ":msg",
			bid: jsxc.jidToBid(transfer.from),
			direction: jsxc.Message.IN,
			attachment: {
				name: transfer.filename,
				type: type,
				size: transfer.size,
				data: ev.target.result
			}
		});
	};
	var bytes = new Uint8Array(transfer.size);
	for (var i = 0; i < transfer.size; i++) {
		bytes[i] = transfer.data.charCodeAt(i);
	}
	//if (!file.type) {
	// file type should be handled in lib
	var file = new File([bytes.buffer], transfer.filename, {
		type: type
	});
	//}

	reader.readAsDataURL(file);
};






jsxc.xmpp.sifiletransfer.isDisabled = function() {
	var options = jsxc.options.get("siFileTransfer") || { enable: true };
	return !options.enable;
};

$(document).ready(function() {
	$(document).on("attached.jsxc", jsxc.xmpp.sifiletransfer.init);
});
