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
 * Initialize sifiletransfer +ibb plugin for jsxc. (XEP-0096: SI File Transfer + XEP-0047: In-Band Bytestreams)
 * This is executed when connection is established so it will be called potentially multiple times (or none)
 *
 * @public
 * @memberOf jsxc.xmpp.sifiletransfer
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
/**
 * Handle file negotiation using XEP-0096: SI File Transfer.
 * This is executed when a file sending request is received
 *
 * @public
 * @memberOf jsxc.xmpp.sifiletransfer
 */
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
		self.transfers[sid] = { message:message, from:from, sid:sid, filename:filename, size:Number(size), mime:mime,  data: "", expectedSeq:0 };
	}
};
/**
 * Handle ibb packages recived via using XEP-0047: In-Band Bytestreams.
 * This is executed when a package is recived
 *
 * @public
 * @memberOf jsxc.xmpp.sifiletransfer
 */
jsxc.xmpp.sifiletransfer.ibbHandler = function (type, from, sid, data, seq) {
	var self = jsxc.xmpp.sifiletransfer;
	jsxc.debug("si file transfer IBB packet received. From: " + from + " sid:" + sid + " seq: " + seq + " type:" + type);
	var transfer = self.transfers[sid];
	if (!transfer) {
		jsxc.debug("si file transfer IBB packet received for unknown file tranfer: " + sid);
		return;
	}

	switch (type) {
		case "open":
			// new file, only metadata
			// we use the metada from the si file transfer negotiation. It includes additional data not included in the ibb open packet
			break;
		case "data":
			// We are assuming all data is recieved secuentially and without duplicates. Check it
			var seqValue = Number(seq)
			if (transfer.expectedSeq !== seqValue) {
				jsxc.debug("si file transfer IBB packet received out of order. From: " + from + " sid:" + sid + " seq: " + seq + " expected seq:" + transfer.expectedSeq);
				return;
			}
			transfer.expectedSeq = seqValue + 1;
			// convert from base64
			var decodedData = atob(data);
			// store data to later display it
			
			transfer.data += decodedData;
			// update gui with progress details
			// TODO: it would be nice to include also download speed, time to finish, total size and current size
			// TODO: font size is very small for progress. It is difficult to see it
			// TODO: it would be nice to include progress bar not only the number value
			jsxc.gui.window.updateProgress(transfer.message, transfer.data.length, transfer.size);
			break;
		case "close":
			jsxc.debug("si file transfer Finished. Expected size: " + transfer.size + " Received size:" + transfer.data.length);
			// check we have all the data we expected to receive
			if (transfer.size === transfer.data.length) {
				// handle file received
				self.onReceivedFile(transfer);
			} else {
				// display failure notification
				jsxc.gui.window.postMessage({
					bid: jsxc.jidToBid(transfer.from),
					direction: jsxc.Message.SYS,
					msg: $.t('File_was_not_properly_received') + ': ' + transfer.filename
				});
			}
			// delete tranfer data
			self.transfers[sid] = null;
			delete self.transfers[sid];
			break;
		default:
			throw new Error("shouldn't be here.");
	}
};


jsxc.xmpp.sifiletransfer.onReceivedFile = function(transfer) {
	var self = jsxc.xmpp.sifiletransfer;
	jsxc.debug("file received via si file transfer", transfer);

	if (!FileReader) {
		return;
	}
	// create a file in memory from the data downloaded
	var file = self.fileFromTransfer(transfer)
	// Read the created file
	var reader = new FileReader();
	reader.onload = function(ev) {
		// When the file is read update the gui 
		// (i.e. display a thumbnail if it is an image)
		// TODO: The Gui is not displaying the filename nor the size of the file
		jsxc.gui.window.postMessage({
			_uid: transfer.sid + ":msg",
			bid: jsxc.jidToBid(transfer.from),
			direction: jsxc.Message.IN,
			attachment: {
				name: transfer.filename,
				type: self.fileTypeFromTransfer(transfer),
				size: transfer.size,
				data: ev.target.result
			}
		});
	};
	reader.readAsDataURL(file);
};
jsxc.xmpp.sifiletransfer.fileFromTransfer = function (transfer) {
	var self = jsxc.xmpp.sifiletransfer;
	var type = self.fileTypeFromTransfer(transfer);

	
	var bytes = self.byteArrayFromTransfer(transfer);
	var file = new File([bytes.buffer], transfer.filename, {
		type: type
	});
	return file;
}
jsxc.xmpp.sifiletransfer.fileTypeFromTransfer = function (transfer) {
	var type;
	if (!transfer.mime) {
		type = self.mimeTypeFromFileName(transfer.filename);
	} else {
		type = transfer.mime;
	}
	return type;
}
jsxc.xmpp.sifiletransfer.byteArrayFromTransfer = function (transfer) {
	var bytes = new Uint8Array(transfer.size);
	for (var i = 0; i < transfer.size; i++) {
		bytes[i] = transfer.data.charCodeAt(i);
	}
	return bytes;
}
jsxc.xmpp.sifiletransfer.mimeTypeFromFileName = function (fileNameWithExtension) {
	var type;
	var ext = fileNameWithExtension.replace(/.+\.([a-z0-9]+)$/i, "$1").toLowerCase();

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
	return type;
}



jsxc.xmpp.sifiletransfer.isDisabled = function() {
	var options = jsxc.options.get("siFileTransfer") || { enable: true };
	return !options.enable;
};

$(document).ready(function () {
	// Triggered when connection is established
	$(document).on("attached.jsxc", jsxc.xmpp.sifiletransfer.init);
});
