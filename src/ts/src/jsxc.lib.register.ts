class Register {
	constructor() {
		jsxc.debug('XEP-0077: In-Band Registration plugin has been initialized');
	}
    registerInServer(url?: string, domain?: string) {
        // TODO: Review when url and domain are updated. It seems we change them in the UI and are not modified
        url = url || jsxc.options.get('xmpp').url;

		if (!url) {
			jsxc.warn('xmpp.url required for in band registration');

			return;
		}
         domain = domain || jsxc.options.get('xmpp').domain;

		if (!domain) {
			jsxc.warn('xmpp.domain required for in band registration');

			return;
		}
		this.createXmppConnection(url, domain);
	}

	private createXmppConnection(url: string, domain: string) {
		if (jsxc.xmpp.conn) {
			jsxc.debug('Log out before doing In-Band registration');
			return;
		}

		// Create new connection (no login)
		jsxc.xmpp.conn = new Strophe.Connection(url) as any;

		if (jsxc.storage.getItem('debug') === true) {
			jsxc.xmpp.conn.xmlInput = function(data) {
				console.log('<', data);
			};
			jsxc.xmpp.conn.xmlOutput = function(data) {
				console.log('>', data);
			};
		}

		jsxc.xmpp.conn.nextValidRid = jsxc.xmpp.onRidChange;
		jsxc.changeState(jsxc.CONST.STATE.ESTABLISHING);
		jsxc.debug('New connection');
		jsxc.xmpp.conn.register.connect(
			domain,
			(status, condition, element) => this.handleRegisterUpdateStatus(status, condition, element)
		);
	}
    private disconnect() {
        if (!jsxc.xmpp.conn) {
            jsxc.warn('Could not disconnect since it was not connected');
			return;
        }
		jsxc.xmpp.conn.options.sync = true; // Switch to using synchronous requests since this is typically called onUnload.
		jsxc.xmpp.conn.flush();
        jsxc.xmpp.conn.disconnect('');
        jsxc.xmpp.conn = null;
	}
	private async handleRegisterUpdateStatus(status: Strophe.Status, condition: string, element): Promise<void> {
		this.triggerJsxcStatus(status, condition);
		if (status === Strophe.Status.CONNECTING) {
			// Nothing to be done here
			// TODO: Update buttons state
		} else if (status === Strophe.Status['REGISTER']) {
            this.registerNewContact(jsxc.xmpp.conn.register.fields);
		} else if (status === Strophe.Status['REGISTERED']) {
			// Report the user that he/she has succesfully registered. He can log into the system if he wants
            const info = 'The user has been succesfully registered';
            jsxc.debug(info);
            await jsxc.gui.euccis.showInfo(info);
            // Disconnect. Do not reuse this connection
			// We dont login now because this connection has been created ad-hoc for the registration
			// and not everything has been configured as it is when jsxc connects to enter the chat
			this.disconnect();
        } else if (status === Strophe.Status['CONFLICT']) {
            // Report the user that there is a conflict
            const alert = 'Contact has not been registered. Contact already existed! ';
            jsxc.debug(alert);
            await jsxc.gui.euccis.showAlert(alert);
            // Display again the registration form
            this.registerNewContact(jsxc.xmpp.conn.register.fields);
		} else if (status === Strophe.Status['NOTACCEPTABLE']) {
			// Report the user that there is a problem with the data as it is
            const alert = 'Contact has not been registered. Registration form not properly filled out.';
            jsxc.debug(alert);
            // Display again the registration form
            this.registerNewContact(jsxc.xmpp.conn.register.fields);
		} else if (status === Strophe.Status['REGIFAIL']) {
			// Report the user that it is not possible to register
            const alert = 'Contact has not been registered. Registration failed.';
            jsxc.debug(alert);
            // TODO: This case should be avoid if we check first if the server is capable of in-band registration
            await jsxc.gui.euccis.showAlert(alert);
            // Display again the registration form
            this.registerNewContact(jsxc.xmpp.conn.register.fields);
		} else if (status === Strophe.Status.DISCONNECTED) {
			// Nothing to be done here
		} else if (status === Strophe.Status.DISCONNECTING) {
			// Nothing to be done here
		} else {
			// This is an unexpected situation. Report it
			const details = JSON.stringify({ status, condition, element });
			jsxc.warn(`Unexpected status during in-band registration.  ${details}`);
		}
	}
	private triggerJsxcStatus(status: Strophe.Status, condition: string) {
		jsxc.debug(Object.getOwnPropertyNames(Strophe.Status)[status] + ': ' + condition);

		switch (status) {
			case Strophe.Status.CONNECTING:
				$(document).trigger('connecting.jsxc');
				break;
			case Strophe.Status.CONNECTED:
				jsxc.bid = jsxc.jidToBid(jsxc.xmpp.conn.jid.toLowerCase());
				$(document).trigger('connected.jsxc');
				break;
			case Strophe.Status.ATTACHED:
				$(document).trigger('attached.jsxc');
				break;
			case Strophe.Status.DISCONNECTED:
				$(document).trigger('disconnected.jsxc');
				break;
			case Strophe.Status.CONNFAIL:
				$(document).trigger('connfail.jsxc', condition);
				break;
			case Strophe.Status.AUTHFAIL:
				$(document).trigger('authfail.jsxc');
				break;
		}
	}
    /**
     * Show the registration fields dialog and create a new contact with the data filled in the dialog
     *
     * @private
     * @param {*} registrationFields The fields that need to be filled
     * @returns {Promise<void>} A Promise resolved when this registration ends
     * @memberof Register
     */
    private async registerNewContact(registrationFields: any) {
        // fill out the fields
			const continueWithRegistration = await jsxc.gui.euccis.showInBandRegistryBox(registrationFields);
			if (continueWithRegistration) {
				// calling submit will continue the registration process
				jsxc.xmpp.conn.register.submit();
			} else {
				this.disconnect();
			}
    }

}
jsxc.register = new Register();
