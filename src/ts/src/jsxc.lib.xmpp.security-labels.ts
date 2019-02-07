class SecurityLabels {
	public static SEC_LABELS_NAMESPACE = 'urn:xmpp:sec-label:0';
	public static SEC_LABELS_CATALOG_NAMESPACE = 'urn:xmpp:sec-label:catalog:2';
	public static SEC_LABELS = 'SEC_LABELS';
	public static SEC_LABELS_CATALOG = 'SEC_LABELS_CATALOG';

	private selectedSecurityLabel: SecurityLabelDescription = SecurityLabelsUtils.noSecurityLabel;
	private securityLabelsMenuTemplate: JQuery;
	private connection: jsxc.Connection;
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
		SecurityLabelsUtils.info('Started initialization');
		if (this.isDisabled()) {
			SecurityLabelsUtils.info('The plugin is disabled');
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
			SecurityLabelsUtils.error('Error discovering security label support', error);
		}

		SecurityLabelsUtils.info('Finished initialization');
	}

	private waitForServerCapabilitiesIfNeeded() {
		const promise = new Promise<void>((resolve, reject) => {
			const caps = jsxc.xmpp.conn.caps;
			const domain = jsxc.xmpp.conn.domain;
			if (!caps || !domain || typeof caps._knownCapabilities[caps._jidVerIndex[domain]] === 'undefined') {
				SecurityLabelsUtils.info('Waiting for server capabilities');
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
			SecurityLabelsUtils.info(`${domain} has no support for Security Labels`);
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
		SecurityLabelsUtils.info('query ' + jid + ' for security label support');
		const info: string = await AsyncAdapter.Disco.infoAsync(jid, null);
		const securityLabelsFeature = $(info).find('feature[var="' + Strophe.NS[SecurityLabels.SEC_LABELS] + '"]');
		if (securityLabelsFeature.length > 0) {
			SecurityLabelsUtils.info('Security Labels support found on ' + jid);
			this.securedJid.push(jid);
		} else {
			SecurityLabelsUtils.info(`${jid} has no support for Security Labels`);
		}
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
		const userInput = win.find('.jsxc_user_input_container');
		if (!userInput || userInput.length !== 1) {
			return;
		}
		userInput.addClass('jsxc_security_labels_disableInput');

		await this.refreshSecurityLabelCatalog(bid);
		userInput.removeClass('jsxc_security_labels_disableInput');
	}
	/**
	 * Add menu otions to the setting menu in the chat window
	 * So far only the option to refresh the security labels catalog
	 *
	 * @param {string} bid
	 * @returns
	 * @memberof SecurityLabels
	 */
	addMenuOptionsForSecurityLabels(bid: string) {
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
			catalog = await SecurityLabelsUtils.requestSecurityLabelsCatalogToXmppServer(this.connection.jid, bid);
		} catch (error) {
			SecurityLabelsUtils.error(`Security Catalog download failed: ${error}`);
			// TODO: Notify the user that we could not get the security labels catalog from the server
			catalog = SecurityLabelsUtils.getDefaultCatalog();
		}
		this.selectedSecurityLabel = SecurityLabelsUtils.getDefaultSecurityLabel(catalog);
		this.securityLabelsMenuTemplate = SecurityLabelsUtils.MenuBuilder.createCatalogMenu(catalog);
	}

	public shouldEnableSecurityLabelsGui(bid: string) {
		if (this.isDisabled()) {
			return false;
		}
		// TODO: For testing we always enable security labels gui but we should check it with the server and service
		return true;
		const caps = jsxc.xmpp.conn.caps;
		const domain = jsxc.xmpp.conn.domain;
		return caps.hasFeatureByJid(domain, Strophe.NS[SecurityLabels.SEC_LABELS_CATALOG]);
	}
	private getTooltipTextForSecurityLabelsIcon() {
		// TODO: Localize this string
		return `Current Sec. Label: ${this.selectedSecurityLabel.securityLabelDisplayText}`;
	}
	public addSecurityLabelSelectionIcon(bid: string) {
		SecurityLabelsUtils.info(`creating security label selection icon`);
		const win = jsxc.gui.window.get(bid);

		if (!win || win.length === 0 || !jsxc.xmpp.conn) {
			return;
		}
		const iconsContainer = win.find('.jsxc_textImput_right_icons_container');
		const securityLabelsIcon = $('<div>');
		securityLabelsIcon.addClass('jsxc_security_labels_icon');
		securityLabelsIcon.addClass('jsxc_icon');
		securityLabelsIcon.tooltip({
			title: () => {
				return this.getTooltipTextForSecurityLabelsIcon();
			}
		});
		securityLabelsIcon.on('click', () => {
			this.onSecurityLabelsIconClicked(win, iconsContainer, securityLabelsIcon);
		});

		iconsContainer.prepend(securityLabelsIcon);
	}
	private onSecurityLabelsIconClicked(win: JQuery, iconsContainer: JQuery, securityLabelsIcon: JQuery) {
		win.trigger('extra.jsxc');
		$('body').trigger('click');

		if (!this.securityLabelsMenuTemplate) {
			return false;
		}
		const previousMenu = win.find(`.${SecurityLabelsUtils.MenuBuilder.jsxc_security_labels_menu}`);
		if (previousMenu.length > 0) {
			return false;
		}
		let menu = this.securityLabelsMenuTemplate.clone(true, true);
		iconsContainer.append(menu);
		menu.menu();
		menu.on('menuselect', (menuEvent, ui: { item: JQuery }) => {
			this.selectedSecurityLabel = ui.item.data(
				SecurityLabelsUtils.MenuBuilder.securitylabelDescriptionDataKey
			) as SecurityLabelDescription;
			SecurityLabelsUtils.info(`selected security label is ${this.selectedSecurityLabel}`);
			menu.menu('destroy');
			menu.remove();
			menu = null;
			return false;
		});
		$('body').one('click', () => {
			if (menu) {
				menu.menu('destroy');
				menu.remove();
			}
		});
		securityLabelsIcon.tooltip('hide');
		// To prevent event from bubling up and hide the menus just shown
		return false;
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
		jsxc.xmpp.securityLabels.addMenuOptionsForSecurityLabels(bid);
		jsxc.xmpp.securityLabels.addSecurityLabelSelectionIcon(bid);
		await jsxc.xmpp.securityLabels.fillSecurityLabelsAvailable(bid);
	}
});
