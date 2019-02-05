class SecurityLabels {
	public static SEC_LABELS_NAMESPACE = 'urn:xmpp:sec-label:0';
	public static SEC_LABELS = 'SEC_LABELS';
    connection: jsxc.Connection;
    /**
     * Jid with support for security labels
     *
     * @private
     * @type {string[]}
     * @memberof SecurityLabels
     */
    private securedJid: string[] = [];
	constructor() {}
    async init(): Promise<void> {
        this.connection = null;
        this.securedJid = [];
		this.info('Started initialization');
		if (this.isDisabled()) {
			this.info('The plugin is disabled');
			return;
        }
		this.connection = jsxc.xmpp.conn;

        Strophe.addNamespace(SecurityLabels.SEC_LABELS, SecurityLabels.SEC_LABELS_NAMESPACE);
		// XEP-0258: Discovering Feature Support as a client. Chapter 2 first paragraph
		if (this.connection.disco) {
			this.connection.disco.addFeature(Strophe.NS[SecurityLabels.SEC_LABELS]);
		}


        try {
            await this.waitForServerCapabilitiesIfNeeded();
            await this.discoverSecurityLabelSupport();
        } catch (error) {
            this.error('Error discovering security label support', error);
        }

		this.info('Finished initialization');
    }

    private waitForServerCapabilitiesIfNeeded() {
        const promise = new Promise<void>((resolve, reject) => {
            const caps = jsxc.xmpp.conn.caps;
            const domain = jsxc.xmpp.conn.domain;
            if (!caps || !domain || typeof caps._knownCapabilities[caps._jidVerIndex[domain]] === 'undefined') {
                this.info('Waiting for server capabilities');
                $(document).one('caps.strophe', (ev, from) => {
                    if (from !== domain) {
                        // We are getting capabilities but not for the domain we are asking for
                        const error = new Error(`Expected capabilities for domain: ${domain} but obtained capabilities for ${from}`);
                        reject(error);
                    }
                    // Capabilities has been downloaded. Discover if there is support for security labels
                    resolve();
                });

            } else {
                resolve();
            }

        });
        return promise;
    }

    private async discoverSecurityLabelSupport() {
        const caps = jsxc.xmpp.conn.caps;
		const domain = jsxc.xmpp.conn.domain;
        if (caps.hasFeatureByJid(domain, Strophe.NS[SecurityLabels.SEC_LABELS])) {
            this.saveItemIfSecurityLabelsSupport(domain);
        } else {
            this.info(`${domain} has no support for Security Labels`);
        }
        const items = await AsyncAdapter.Disco.itemsAsync(domain, null);
        const promises = $(items).find('item').map(( index, item) => {
            const jid: string = $(item).attr('jid');
             return this.saveItemIfSecurityLabelsSupport(jid);
        });
        return Promise.all(promises);
    }


    private async saveItemIfSecurityLabelsSupport(jid: string) {
        this.info('query ' + jid + ' for security label support');
        const info: string = await AsyncAdapter.Disco.infoAsync(jid, null);
        const securityLabelsFeature = $(info).find('feature[var="' + Strophe.NS[SecurityLabels.SEC_LABELS] + '"]');
        if (securityLabelsFeature.length > 0) {
            this.info('Security Labels support found on ' + jid);
             this.securedJid.push(jid);
        } else {
            this.info(`${jid} has no support for Security Labels`);
        }
    }

	private debug(msg: string, data?: object): void {
		jsxc.debug(`XEP-0258 [Security labels]: ${msg}`, data);
    }
    private info(msg: string, data?: object): void {
		jsxc.debug(`XEP-0258 [Security labels]: ${msg}`, data);
    }
    private error(msg: string, data?: object): void {
		jsxc.error(`XEP-0258 [Security labels]: ${msg}`, data);
    }
    private warn(msg: string, data?: object): void {
		jsxc.warn(`XEP-0258 [Security labels]: ${msg}`, data);
	}
	private isDisabled(): boolean {
		const options = jsxc.options.get('securityLabels') || { enable: true };
		return !options.enable;
	}
}

jsxc.xmpp.securityLabels = new SecurityLabels();
$(document).on('stateUIChange.jsxc', function(ev, state) {
	if (state === jsxc.CONST.UISTATE.INITIATING) {
		jsxc.xmpp.securityLabels.init();
	}
});
