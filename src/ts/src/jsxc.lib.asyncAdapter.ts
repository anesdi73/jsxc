class AsyncAdapter {
	static sendAsync(jid, file): Promise<string> {
		const sid = 'sifileTransferSession:' + new Date();
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

	static openAsync(to, sid): Promise<number> {
		const blockSize = 4096;
		const promise = new Promise<number>((resolve, reject) => {
			jsxc.xmpp.conn.ibb.open(to, sid, blockSize, function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(blockSize);
				}
			});
		});
		return promise;
	}
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
	static closeAsync(to, sid): Promise<void> {
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
