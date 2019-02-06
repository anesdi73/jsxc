/**
 *A Catalog of Labels
 *
 * @interface SecurityCatalog
 */
interface SecurityCatalog {
	/**
	 * A Jabber Id. Who is this catalog intended to be used with
	 *
	 * @type {string}
	 * @memberof SecurityCatalog
	 */
	to: string;
	/**
	 * Description
	 *
	 * @type {string}
	 * @memberof SecurityCatalog
	 */
	desc: string;
	name: string;
	/**
	 * Restrictive. Id true only security labels included in this catalog can be used
	 *
	 * @type {boolean}
	 * @memberof SecurityCatalog
	 */
	restrict?: boolean;
	items: CatalogItem[];
}
interface CatalogItem {
	selector?: string;
	securitylabel?: SecurityLabel;
	default?: boolean;
}
/**
 * A Security Label
 *
 * @interface SecurityLabel
 */
interface SecurityLabel {
	displayMarking?: DisplayMarking;
	label: Label;
	equivalentlabels?: Label[];
}
interface Label {
	labelbody?: string;
}
interface DisplayMarking {
	fgColor?: string;
	bgColor?: string;
	text: string;
}
class SecurityLabels {
	public static SEC_LABELS_NAMESPACE = 'urn:xmpp:sec-label:0';
	public static SEC_LABELS_CATALOG_NAMESPACE = 'urn:xmpp:sec-label:catalog:2';
	public static SEC_LABELS = 'SEC_LABELS';
	public static SEC_LABELS_CATALOG = 'SEC_LABELS_CATALOG';
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
		Strophe.addNamespace(SecurityLabels.SEC_LABELS_CATALOG, SecurityLabels.SEC_LABELS_CATALOG_NAMESPACE);
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

	/**
	 * Save if the server and its service includes support for handling security labels
	 *
	 * @private
	 * @returns
	 * @memberof SecurityLabels
	 */
	private async discoverSecurityLabelSupport() {
		const caps = jsxc.xmpp.conn.caps;
		const domain = jsxc.xmpp.conn.domain;
		if (caps.hasFeatureByJid(domain, Strophe.NS[SecurityLabels.SEC_LABELS])) {
			this.securedJid.push(domain);
		} else {
			this.info(`${domain} has no support for Security Labels`);
		}
		const items = await AsyncAdapter.Disco.itemsAsync(domain, null);
		const promises = $(items)
			.find('item')
			.map((index, item) => {
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
	/**
	 *Returns true if the security labels plugin is disabled in the chat options
	 *
	 * @private
	 * @returns {boolean}
	 * @memberof SecurityLabels
	 */
	private isDisabled(): boolean {
		const options = jsxc.options.get('securityLabels') || { enable: true };
		return !options.enable;
	}
	/**
	 * Fill the security Labels available in a chat window
	 *
	 * @param {string} bid
	 * @returns
	 * @memberof SecurityLabels
	 */
	async fillSecurityLabelsAvailable(bid: string) {
		const win = jsxc.gui.window.get(bid);

		if (!win || win.length === 0 || !jsxc.xmpp.conn) {
			return;
		}
		const textInput = win.find('.jsxc_textinput');
		if (!textInput || textInput.length !== 1) {
			return;
		}
		textInput.prop('disabled', true);

		await this.refreshSecurityLabelCatalog(bid);
		textInput.prop('disabled', false);
	}
	addMenuOptionToRefreshLabelCatalog(bid: string) {
		// TODO: Add menu option to read the security labels available from a file
		const win = jsxc.gui.window.get(bid);

		if (!win || win.length === 0 || !jsxc.xmpp.conn) {
			return;
		}
		const refreshSecLabCat = $('<a>');
		refreshSecLabCat.attr('href', '#');
		refreshSecLabCat.text($.t('Refresh_Sec_Label_Catalog'));
		refreshSecLabCat.addClass('jsxc_refresh_sec_lab_cat');

		refreshSecLabCat.click(async () => {
			// Copied from Ln 2123 in jsxc.lib.gui.js (Dont really know why we need the following call)
			$('body').click();

			// Do nothing if the menu is disabled
			if (refreshSecLabCat.hasClass('jsxc_disabled')) {
				return;
			}
			// Disable the menu to avoid reentrant code
			refreshSecLabCat.addClass('jsxc_disabled');
			await this.fillSecurityLabelsAvailable(bid);
			// reenable the menu
			refreshSecLabCat.removeClass('jsxc_disabled');
		});
		win.find('.jsxc_settings ul').append($('<li>').append(refreshSecLabCat));
	}
	private async refreshSecurityLabelCatalog(bid: string) {

		let catalog: SecurityCatalog;
		try {
			catalog = await this.requestSecurityLabelsCatalogToXmppServer(bid);
		} catch (error) {
			this.error(`Security Catalog download failed: ${error}`);
			// TODO: Notify the user that we could not get the security labels catalog from the server
			catalog = this.getDefaultCatalog();
		}
		this.updateUiWithSecurityCatalog(bid, catalog);
	}
	private updateUiWithSecurityCatalog(bid: string, catalog: SecurityCatalog) {
		// TODO: Refresh the UI with the Security Labels catalog
		const win = jsxc.gui.window.get(bid);

		if (!win || win.length === 0 || !jsxc.xmpp.conn) {
			return;
		}
		const securityLabelsIcon = win.find('.jsxc_security_labels');
		securityLabelsIcon.show();
	}

	private getDefaultCatalog(): SecurityCatalog {
		// This is the default security label catalog included in the specification https://xmpp.org/extensions/xep-0258.html v1.1.1 (Example 9)
		const defaultCatalog: SecurityCatalog = {
			to: 'example.com',
			name: 'Default',
			desc: 'an example set of labels',
			restrict: false,
			items: [
				{
					selector: 'Classified|SECRET',
					securitylabel: {
						label: { labelbody: '<esssecuritylabel xmlns="urn:xmpp:sec-label:ess:0">MQYCAQQGASk=</esssecuritylabel>' },
						displayMarking: {
							text: 'SECRET',
							fgColor: 'black',
							bgColor: 'red'
						}
					}
				},
				{
					selector: 'Classified|CONFIDENTIAL',
					securitylabel: {
						label: { labelbody: '<esssecuritylabel xmlns="urn:xmpp:sec-label:ess:0">MQYCAQMGASk</esssecuritylabel>' },
						displayMarking: {
							text: 'CONFIDENTIAL',
							fgColor: 'black',
							bgColor: 'navy'
						}
					}
				},
				{
					selector: 'Classified|RESTRICTED',
					securitylabel: {
						label: { labelbody: '<esssecuritylabel xmlns="urn:xmpp:sec-label:ess:0">MQYCAQIGASk=</esssecuritylabel>' },
						displayMarking: {
							text: 'RESTRICTED',
							fgColor: 'black',
							bgColor: 'aqua'
						}
					}
				},
				{
					selector: 'UNCLASSIFIED',
					default: true
				}
			]
		};
		return defaultCatalog;
	}
	private async sendSecurityLabelsCatalogRequestFaked(): Promise<SecurityCatalog> {
		const catalog = this.getDefaultCatalog();
		const promise = new Promise<SecurityCatalog>((resolve, reject) => {
			setTimeout(() => resolve(catalog), 6000);
		});
		return promise;
	}
	private async requestSecurityLabelsCatalogToXmppServer(bid: string): Promise<SecurityCatalog> {
		// TODO: For testing we always return the same hardcoded security labels catalog but we should ask the server
		return this.sendSecurityLabelsCatalogRequestFaked();

		this.info(`Start Requesting SecurityLabels Catalog for ` + bid);
		const ownServer = this.connection.jid;
		const iq = $iq({
			to: ownServer,
			type: 'get'
		}).c('catalog', {
			xmlns: Strophe.NS[SecurityLabels.SEC_LABELS],
			to: bid
		});

		const stanza = await AsyncAdapter.strophe.sendIQAsync(iq);
		this.info(`End Requesting SecurityLabels Catalog for ` + bid);
		const catalog = this.parseCatalogStanza(stanza);
		return catalog;
	}
	private parseCatalogStanza(stanza: Element): SecurityCatalog {
		// TODO: we have to parse a received security labels catalog
		const stanza$ = $(stanza);
		const catalog = stanza$.find('catalog[xmlns="' + Strophe.NS[SecurityLabels.SEC_LABELS_CATALOG] + '"]');
		return { to: '', desc: '', name: '', items: [] };
	}
	public shouldEnableSecurityLabelsGui(bid: string) {
		// TODO: For testing we always enable security labels gui but we should check it with the server and service
		return true;
		if (this.isDisabled()) {
			return false;
		}
		const caps = jsxc.xmpp.conn.caps;
		const domain = jsxc.xmpp.conn.domain;
		return caps.hasFeatureByJid(domain, Strophe.NS[SecurityLabels.SEC_LABELS_CATALOG]);
	}
	public addSecurityLabelSelectionIcon(bid: string) {
		this.info(`creating security label selection icon`);
		const win = jsxc.gui.window.get(bid);

		if (!win || win.length === 0 || !jsxc.xmpp.conn) {
			return;
		}
		const securityLabelsIcon = $('<div>');
		securityLabelsIcon.addClass('jsxc_security_labels');
		securityLabelsIcon.addClass('jsxc_disabled');
		securityLabelsIcon.addClass('jsxc_icon');
		const iconsContainer = win.find('.jsxc_textImput_right_icons_container');
		iconsContainer.prepend(securityLabelsIcon);
	}
}

jsxc.xmpp.securityLabels = new SecurityLabels();
$(document).on('stateUIChange.jsxc', function(ev, state) {
	if (state === jsxc.CONST.UISTATE.INITIATING) {
		jsxc.xmpp.securityLabels.init();
	}
});
$(document).on('update.gui.jsxc', async (ev, bid) => {
	if (jsxc.xmpp.securityLabels.shouldEnableSecurityLabelsGui(bid)) {
		jsxc.xmpp.securityLabels.addMenuOptionToRefreshLabelCatalog(bid);
		jsxc.xmpp.securityLabels.addSecurityLabelSelectionIcon(bid);
		await jsxc.xmpp.securityLabels.fillSecurityLabelsAvailable(bid);
	}
});
