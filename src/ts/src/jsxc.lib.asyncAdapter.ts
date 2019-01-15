class AsyncAdapter {
	/**
     * Send Si File transfer negotiation asynchronusly (only IBB transport is valid)
     *
     * @static
     * @param {string} jid full jid where the file is being sent
     * @param {string} file file we are about to send
     * @returns {Promise<string>} promise including the session id
     * @memberof AsyncAdapter
     */
    static sendAsync(jid: string, file: File): Promise<string> {
		const sid = 'siFileTransferSession:' + Date.now() + Math.random();
		const promise = new Promise<string>((resolve, reject) => {
			jsxc.xmpp.conn.si_filetransfer.send(jid, sid, file.name, file.size, file.type, err => {
                if (err) {
					reject(err);
				} else {
					resolve(sid);
				}
			});
		});
		return promise;
	}


    /**
     * Send IBB open message asynchronusly. It includes some metadata for the data we are about to send
     *
     * @static
     * @param {string} to. full jid where the file is being sent
     * @param {string} sid . Session id
     * @param {number} [blockSize] maximum packet size in bytes
     * @returns {Promise<number>} promise including the packet size
     * @memberof AsyncAdapter
     */
    static openAsync(to: string, sid: string, blockSize?: number): Promise<number> {
		const bs = blockSize || 4096;
		const promise = new Promise<number>((resolve, reject) => {
			jsxc.xmpp.conn.ibb.open(to, sid, bs, function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(bs);
				}
			});
		});
		return promise;
	}
	/**
     * Send IBB data message asynchronusly. It includes a chunk of data
     *
     * @static
     * @param {string} to full jid where the file is being sent
     * @param {string} sid  Session id
     * @param {number} seq chunk sequence number we are sending
     * @param {string} data base64 payload
     * @returns {Promise<void>}
     * @memberof AsyncAdapter
     */
    static dataAsync(to: string, sid: string, seq: number, data: string): Promise<void> {
		const promise = new Promise<void>((resolve, reject) => {
			jsxc.xmpp.conn.ibb.data(to, sid, seq, data, function(err) {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
		return promise;
	}

    /**
     * Send IBB close message asynchronusly. It reports transmission has finished
     *
     * @static
     * @param {string} to full jid where the file is being sent
     * @param {string} sid Session id
     * @returns {Promise<void>}
     * @memberof AsyncAdapter
     */
    static closeAsync(to: string, sid: string): Promise<void> {
		const promise = new Promise<void>((resolve, reject) => {
			jsxc.xmpp.conn.ibb.close(to, sid, function(err) {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
		return promise;
	}

	/**
     * Read a file asynchronusly
     *
     * @static
     * @param {File} file
     * @returns {Promise<string>} a Promise that resolves to a string
     * with the the data in base64 prefixed by the mimetype like "data:image/png;base64,iVBORw0K"
     * @memberof AsyncAdapter
     */
    static readFileAsync(file: File): Promise<string> {
		const promise = new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = ev => {
				const data: string = reader.result as string;
				resolve(data);
			};
			reader.readAsDataURL(file);
		});
		return promise;
	}
}
