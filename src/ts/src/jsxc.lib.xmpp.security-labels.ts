class SecurityLabels {
	// TODO: when very long messages are written, they overlap with the security label selection icon
	// TODO: create aconfiguration section for the security lables in the setting page
	public static SEC_LABELS_NAMESPACE = 'urn:xmpp:sec-label:0';
	public static SEC_LABELS_CATALOG_NAMESPACE = 'urn:xmpp:sec-label:catalog:2';
	public static SEC_LABELS = 'SEC_LABELS';
	public static SEC_LABELS_CATALOG = 'SEC_LABELS_CATALOG';

	private connection: jsxc.Connection = null;
	/**
	 * Jid with support for security labels
	 *
	 * @private
	 * @type {string[]}
	 * @memberof SecurityLabels
	 */
	private securedJid: string[] = [];

	constructor() {
		// name space can only be added to strophe so we dont add them in initialize (we would not be able to remove them in deinitialize)
		Strophe.addNamespace(SecurityLabels.SEC_LABELS, SecurityLabels.SEC_LABELS_NAMESPACE);
		Strophe.addNamespace(SecurityLabels.SEC_LABELS_CATALOG, SecurityLabels.SEC_LABELS_CATALOG_NAMESPACE);
	}
	async init(): Promise<void> {
		this.connection = null;
		this.securedJid = [];
		SecurityLabelsUtils.info('Started initialization');
		if (this.isDisabled()) {
			SecurityLabelsUtils.info('The plugin is disabled');
			return;
		}
		this.connection = jsxc.xmpp.conn;

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

		this.registerSendingHandler();

		this.registerReceptionHandler();

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
	addSecurityLabelsWhenMessageIsSent(bid: string) {
		const win = jsxc.gui.window.get(bid);

		if (!win || win.length === 0 || !jsxc.xmpp.conn) {
			return;
		}
		// when the user press enter to send the message, the security label selected is added to the message being created
		win.on(jsxc.gui.window.outgoingPostMessageEvent, (event, message: jsxc.MessageProperties) => {
			SecurityLabelsUtils.info('adding security label to outgoing message');
			const securitylabelDescription: SecurityLabelDescription = win.data('selectedSecurityLabel');
			message.securityLabel = securitylabelDescription.securityLabel;
		});
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
		const refrehSecLabelsMenu: ChatWindowSettingsMenuProperties = {
			textKey: 'Refresh_Sec_Label_Catalog',
			cssClass: 'jsxc_refresh_sec_lab_cat',
			onClick: menuItem => {
				return this.OnClickRefrehSecLabelsMenu(bid, menuItem);
			}
		};
		SecurityLabelsUtils.addSettingsMenuEntry(bid, refrehSecLabelsMenu);
		const readSecLabelsFromfileMenu: ChatWindowSettingsMenuProperties = {
			textKey: 'Read_Sec_Label_From_File',
			cssClass: 'jsxc_read_sec_lab_from_file',
			onClick: menuItem => {
				return this.OnClickReadSecLabelsFromfile(bid, menuItem);
			}
		};
		SecurityLabelsUtils.addSettingsMenuEntry(bid, readSecLabelsFromfileMenu);
	}
	private OnClickReadSecLabelsFromfile(bid: string, readSecLabFromFileMenuEntry: JQuery) {
		// TODO: set allowed extensions in the file selection dialog
		jsxc.gui.euccis.showFileSelection(bid, file => this.readSecLabelsFromfile(bid, file));
	}
	private async readSecLabelsFromfile(bid: string, file: File) {
		// TODO: provides feedback to the user as an autohide notification when the labels catalog is updated (and when the update fails)
		// TODO: Test behaviour when the file selected is not a catalog
		const text = await AsyncAdapter.readFileAsTextAsync(file);
		const catalog$ = $(text);
		const catalog = SecurityLabelsUtils.parser.parseCatalogStanza(catalog$.get(0));
		if (catalog) {
			this.useSecuriyLabelsCatalog(bid, catalog);
		}
	}
	private OnClickRefrehSecLabelsMenu(bid: string, refreshSecLabCat: JQuery) {
		return this.fillSecurityLabelsAvailable(bid);
	}
	private useSecuriyLabelsCatalog(bid: string, catalog: SecurityCatalog) {
		const win = jsxc.gui.window.get(bid);
		if (win && win.length === 0) {
			return;
		}
		// TODO: The security label should be mantained if possible among refreshes (reload).
		// TODO: This would mean persisting The security label for this window (jsxc.storage.getUserItem('window', bid))
		// TODO: Security Labels could come from the server or a file
		const selectedSecurityLabel = SecurityLabelsUtils.getDefaultSecurityLabel(catalog);
		win.data('selectedSecurityLabel', selectedSecurityLabel);
		const securityLabelsMenuTemplate = SecurityLabelsUtils.menubuilderforsecuritylabelselector.createCatalogMenu(catalog);
		win.data('securityLabelsMenuTemplate', securityLabelsMenuTemplate);
	}
	private async refreshSecurityLabelCatalog(bid: string) {
		let catalog: SecurityCatalog;
		try {
			catalog = await SecurityLabelsUtils.requestSecurityLabelsCatalogToXmppServer(this.connection.jid, bid);
		} catch (error) {
			SecurityLabelsUtils.error(`Security Catalog download failed: ${error}`);
			jsxc.gui.euccis.showAlert('Security labels catalog donwload from server failed');
			catalog = SecurityLabelsUtils.getDefaultCatalog();
		}
		this.useSecuriyLabelsCatalog(bid, catalog);
	}

	public shouldInitializeSecurityLabelsGui(bid: string) {
		if (this.isDisabled()) {
			return false;
		}
		const win = jsxc.gui.window.get(bid);
		if (!win || win.length === 0 || !jsxc.xmpp.conn) {
			return false;
		}
		// Check if this window has already been initialized
		const securityLabelsGuiInitialized = win.data('securityLabelsGuiInitialized');
		if (securityLabelsGuiInitialized) {
			return false;
		}
		win.data('securityLabelsGuiInitialized', true);

		// TODO: For testing we always enable security labels gui but we should check it with the server and service
		return true;

		// TODO: check if security labels should be enabled for this window depending on server and service
		const caps = jsxc.xmpp.conn.caps;
		const domain = jsxc.xmpp.conn.domain;
		return caps.hasFeatureByJid(domain, Strophe.NS[SecurityLabels.SEC_LABELS_CATALOG]);
	}
	private getTooltipTextForSecurityLabelsIcon(win: JQuery) {
		const selectedSecurityLabel = win.data('selectedSecurityLabel');
		// TODO: Localize this string
		return `Current Sec. Label: ${selectedSecurityLabel.securityLabelDisplayText}`;
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
			container: 'body',
			title: () => {
				return this.getTooltipTextForSecurityLabelsIcon(win);
			}
		});
		securityLabelsIcon.on('click', () => {
			return this.onSecurityLabelsIconClicked(win, iconsContainer, securityLabelsIcon);
		});

		iconsContainer.prepend(securityLabelsIcon);
	}
	private onSecurityLabelsIconClicked(win: JQuery, iconsContainer: JQuery, securityLabelsIcon: JQuery) {
		win.trigger('extra.jsxc');
		$('body').trigger('click');
		const securityLabelsMenuTemplate = win.data('securityLabelsMenuTemplate');
		if (!securityLabelsMenuTemplate) {
			return false;
		}
		const previousMenu = win.find(`.${SecurityLabelsUtils.menubuilderforsecuritylabelselector.jsxc_security_labels_menu}`);
		if (previousMenu.length > 0) {
			return false;
		}
		let menu = securityLabelsMenuTemplate.clone(true, true);
		iconsContainer.append(menu);
		menu.menu();
		menu.on('menuselect', (menuEvent, ui: { item: JQuery }) => {
			const selectedSecurityLabel = ui.item.data(
				SecurityLabelsUtils.menubuilderforsecuritylabelselector.securityLabelDescriptionDataKey
			) as SecurityLabelDescription;
			SecurityLabelsUtils.info(`selected security label is ${selectedSecurityLabel}`);
			win.data('selectedSecurityLabel', selectedSecurityLabel);
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

	private buildDisplayMarkingAttributesForStanza(displayMarking: DisplayMarking) {
		const res = {};
		if (displayMarking.fgColor) {
			res['fgColor'] = displayMarking.fgColor;
		}
		if (displayMarking.bgColor) {
			res['bgColor'] = displayMarking.bgColor;
		}
		return res;
	}
	public drawSecurityLabelsForRenderedMessages(bid: string) {
		const win = jsxc.gui.window.get(bid);

		if (!win || win.length === 0 || !jsxc.xmpp.conn) {
			return;
		}
		const history = jsxc.storage.getUserItem('history', bid);
		while (history !== null && history.length > 0) {
			const uid = history.pop();
			const message = new jsxc.Message(uid);
			const id = uid.replace(/:/g, '-');
			const msgDiv = win.find(`[id="${id}"]`);
			this.drawSecurityLabels(msgDiv, message as any);
		}
	}
	public drawSecurityLabelsWhenMessageIsRendered(bid: string) {
		const win = jsxc.gui.window.get(bid);

		if (!win || win.length === 0 || !jsxc.xmpp.conn) {
			return;
		}
		win.on(jsxc.gui.window.messageRenderEvent, (event, message: jsxc.MessageProperties, msg: string, msgDiv: JQuery) => {
			this.drawSecurityLabels(msgDiv, message);
		});
	}
	private drawSecurityLabels(msgDiv: JQuery, message: jsxc.MessageProperties) {
		if (message.direction === 'sys') {
			return;
		}
		let tooltipText = 'No security label';
		if (message.securityLabel) {
			if (message.securityLabel.displayMarking) {
				tooltipText = message.securityLabel.displayMarking.text;
			} else {
				return '<No name provided for the security Label>';
			}
		}
		msgDiv.find('.jsxc_textmsg,.jsxc_attachment').tooltip({ title: tooltipText, container: 'body' });
	}

	private registerReceptionHandler() {
		// when the incoming XMPP stanza is being received, the security labels elements are passed from the stanza to the message properties
		const kk  = $(document)
			.on(jsxc.xmpp.incomingBuildMessagePropertiesEvent, (event, message: Element, messageProperties: jsxc.MessageProperties) => {
			SecurityLabelsUtils.info('Handling incoming message in security labels plugin');
			this.addSecurityLabelToMessageProperties(message, messageProperties);
		});
	}

	private addSecurityLabelToMessageProperties(message: Element, messageProperties: jsxc.MessageProperties) {
		const stanza = $(message);
		const securityLabelStanza = $(stanza).find('securitylabel[xmlns="' + Strophe.NS[SecurityLabels.SEC_LABELS] + '"]');
		if (securityLabelStanza) {
			if (securityLabelStanza.length === 1) {
				const securityLabel: SecurityLabel = SecurityLabelsUtils.parser.parseSecurityLabelStanza(securityLabelStanza[0]);
				messageProperties.securityLabel = securityLabel;
			}
			if (securityLabelStanza.length > 1) {
				SecurityLabelsUtils.warn('we have received a stanza with more than one security label');
			}
		}
	}
	private registerSendingHandler() {
		// when the outgoing XMPP stanza is being created, the security labels elements are passed from the message properties to the stanza
		$(document)
			.on(jsxc.xmpp.outgoingBuildStanzaEvent, (event, stanza: Strophe.Builder, message: jsxc.MessageProperties) => {
			this.addSecurityLabelsToStanza(stanza, message);
		});
	}
	/**
	 * Add the security Labels to an outgping stanza that is being built
	 *
	 *
	 * @param {Strophe.Builder} stanza
	 * @param {jsxc.MessageProperties} message
	 * @memberof SecurityLabels
	 */
	private addSecurityLabelsToStanza(stanza: Strophe.Builder, message: jsxc.MessageProperties) {
		if (!this.isDisabled() && message.securityLabel) {
			SecurityLabelsUtils.info(`Adding Security labels to outgoing stanza for ${message._uid}`);
			const securityLabel = message.securityLabel;
			// we start as child of body (or a sibling of body)
			stanza
				.up() // message is current node
				.c('securitylabel', { xmlns: Strophe.NS[SecurityLabels.SEC_LABELS] });
			if (securityLabel.displayMarking) {
				const displayMarking = securityLabel.displayMarking;
				const displayMarkingAttributes = this.buildDisplayMarkingAttributesForStanza(displayMarking);
				stanza.c('displaymarking', displayMarkingAttributes, displayMarking.text); // no up since we are adding text
			}
			const labelbody = Strophe.xmlHtmlNode(securityLabel.label.labelbody).children[0];
			stanza
				.c('label')
				.cnode(labelbody)
				.up() // label
				.up(); // labelbody
			const equivalentlabels = securityLabel.equivalentlabels;
			if (equivalentlabels) {
				equivalentlabels.forEach(equivalentLabel => {
					const equivalentLabelBody = Strophe.xmlHtmlNode(equivalentLabel.labelbody).children[0];
					stanza
						.c('equivalentLabel')
						.cnode(equivalentLabelBody)
						.up() // equivalentLabel
						.up(); // equivalentLabelBody
				});
			}
		}
	}
}

jsxc.xmpp.securityLabels = new SecurityLabels();
// $(document).on('connected.jsxc', () => jsxc.xmpp.securityLabels.initialize());

$(document).on('stateUIChange.jsxc', function (ev, state) {
	if (state === jsxc.CONST.UISTATE.INITIATING) {
		jsxc.xmpp.securityLabels.init();
	}
});

$(document).on('update.gui.jsxc', async (ev, bid) => {
	if (jsxc.xmpp.securityLabels.shouldInitializeSecurityLabelsGui(bid)) {
		jsxc.xmpp.securityLabels.drawSecurityLabelsForRenderedMessages(bid);
		jsxc.xmpp.securityLabels.drawSecurityLabelsWhenMessageIsRendered(bid);
		jsxc.xmpp.securityLabels.addSecurityLabelsWhenMessageIsSent(bid);
		jsxc.xmpp.securityLabels.addMenuOptionsForSecurityLabels(bid);
		jsxc.xmpp.securityLabels.addSecurityLabelSelectionIcon(bid);
		await jsxc.xmpp.securityLabels.fillSecurityLabelsAvailable(bid);
	}
});
