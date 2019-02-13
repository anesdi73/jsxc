namespace SecurityLabelsUtils {
	export function getDefaultCatalog(): SecurityCatalog {
		// This is the default security label catalog included in the specification https://xmpp.org/extensions/xep-0258.html v1.1.1 (Example 9)
		const defaultCatalog: SecurityCatalog = {
			to: 'example.com',
			name: 'Default',
			desc: 'an example set of labels',
			restrict: false,
			items: [
				{
					selector: 'Classified|SECRET',
					securityLabel: {
						label: { labelbody: '<esssecurityLabel xmlns="urn:xmpp:sec-label:ess:0">MQYCAQQGASk=</esssecurityLabel>' },
						displayMarking: {
							text: 'SECRET',
							fgColor: 'black',
							bgColor: 'red'
						}
					}
				},
				{
					selector: 'Classified|CONFIDENTIAL',
					securityLabel: {
						label: { labelbody: '<esssecurityLabel xmlns="urn:xmpp:sec-label:ess:0">MQYCAQMGASk</esssecurityLabel>' },
						displayMarking: {
							text: 'CONFIDENTIAL',
							fgColor: 'black',
							bgColor: 'navy'
						},
						equivalentlabels: [
							{ labelbody: '<esssecurityLabel xmlns="urn:xmpp:sec-label:ess:0">98765</esssecurityLabel>' },
							{ labelbody: '<esssecurityLabel xmlns="urn:xmpp:sec-label:ess:0">123456</esssecurityLabel>' }
						]
					}
				},
				{
					selector: 'Classified|RESTRICTED',
					securityLabel: {
						label: { labelbody: '<esssecurityLabel xmlns="urn:xmpp:sec-label:ess:0">MQYCAQIGASk=</esssecurityLabel>' },
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

	export function fakeSecurityLabelsCatalogRequest(): Promise<SecurityCatalog> {
		const catalog = SecurityLabelsUtils.getDefaultCatalog();
		const promise = new Promise<SecurityCatalog>((resolve, reject) => {
			setTimeout(() => resolve(catalog), 1000);
		});
		return promise;
	}
	export namespace parser {
		export function parseCatalogStanza(stanza: Element): SecurityCatalog {
			const stanza$ = $(stanza);
			const catalogSelector = 'catalog[xmlns="' + Strophe.NS[SecurityLabels.SEC_LABELS_CATALOG] + '"]';
			let catalog = stanza$.filter(catalogSelector);
			if (catalog.length === 0) {
				catalog = stanza$.find(catalogSelector);
			}
			if (catalog.length === 0) {
				return null;
			}
			if (catalog.length > 1 ) {
				SecurityLabelsUtils.warn(`More than one security labels catalog found`);
			}
			const to = catalog.attr('to');
			const desc = catalog.attr('desc');
			const name = catalog.attr('name');
			const restrict = catalog.attr('restrict') === 'true';
			const items$ = catalog.find('item');
			const items = items$.map((index, item) => parseCatalogItem(item)).get();
			const res: SecurityCatalog = { to, desc, name, restrict,  items };
			return res;
		}
		export function parseCatalogItem(item: Element) {
			const item$ = $(item);
			const selector = item$.attr('selector');
			const securityLabelSelector = 'securityLabel[xmlns="' + Strophe.NS[SecurityLabels.SEC_LABELS] + '"]';
			const securityLabels$ = item$.find(securityLabelSelector);
			const securityLabels = securityLabels$.map((index, securityLabel$) => parseSecurityLabelStanza(securityLabel$));
			let securityLabel = null;
			if (securityLabels.length === 1) {
				securityLabel = securityLabels.get(0);
			} else {
				SecurityLabelsUtils.warn(`unexpected number of securityLabels found. Expected 1 but found ${securityLabels.length}`);
			}
			const catalogItem: CatalogItem = {selector, securityLabel };
			return catalogItem;
		}
		export function parseSecurityLabelStanza(stanza: Element): SecurityLabel {
			const securityLabelStanza = $(stanza);
			const label = securityLabelStanza.find('label');
			if (!label || label.length !== 1) {
				SecurityLabelsUtils.warn('A security label should have one and only one label element');
				return;
			}
			const labelContent = {
				labelbody: label[0].innerHTML
			};

			let displayMarkingContent: DisplayMarking = null;
			const displaymarking = securityLabelStanza.find('displaymarking');
			if (displaymarking.length > 0) {
				const fgColor = displaymarking.attr('fgColor');
				const bgColor = displaymarking.attr('bgColor');
				const text = displaymarking.text();
				displayMarkingContent = {
					bgColor,
					fgColor,
					text
				};
			}
			const equivalentLabels = securityLabelStanza.find('equivalentlabel');
			const equivalentLabelsContent$ = equivalentLabels.map((index, equivalentLabel) => {
				return { labelbody: equivalentLabel.innerHTML };
			});
			const securityLabel = {
				label: labelContent,
				displayMarking: displayMarkingContent,
				equivalentlabels: equivalentLabelsContent$.get()
			};

			return securityLabel;
		}
	}
	export async function requestSecurityLabelsCatalogToXmppServer(ownServer: string, bid: string): Promise<SecurityCatalog> {
		// TODO: For testing we always return the same hardcoded security labels catalog but we should ask the server
		return SecurityLabelsUtils.fakeSecurityLabelsCatalogRequest();

		SecurityLabelsUtils.info(`Start Requesting securityLabels Catalog for ${bid} to Xmpp server`);

		const iq = $iq({
			to: ownServer,
			type: 'get'
		}).c('catalog', {
			xmlns: Strophe.NS[SecurityLabels.SEC_LABELS],
			to: bid
		});

		const stanza = await AsyncAdapter.strophe.sendIQAsync(iq);
		SecurityLabelsUtils.info(`End Requesting securityLabels Catalog for ${bid}`);
		const catalog = SecurityLabelsUtils.parser.parseCatalogStanza(stanza);
		return catalog;
	}
	const traceHeader = 'XEP-0258 [Security labels]:';
	export function debug(msg: string, data?: object): void {
		jsxc.debug(`${traceHeader} ${msg}`, data);
	}
	export function info(msg: string, data?: object): void {
		jsxc.debug(`${traceHeader} ${msg}`, data);
	}
	export function error(msg: string, data?: object): void {
		jsxc.error(`${traceHeader} ${msg}`, data);
	}
	export function warn(msg: string, data?: object): void {
		jsxc.warn(`${traceHeader} ${msg}`, data);
	}
	export namespace menubuilderforsecuritylabelselector {
		export function getDisplayTextFor(item: CatalogItem) {
			if (item.securityLabel && item.securityLabel.displayMarking) {
				return item.securityLabel.displayMarking.text;
			}
			if (item.selector) {
				const selectors = item.selector.split('|');
				return selectors[selectors.length - 1];
			}
			return '<No name provided>';
		}
		export const securityLabelDescriptionDataKey = 'securityLabelDescription';
		export function createSelectableCatalogMenuEntry(securityLabelDescription: SecurityLabelDescription): JQuery<HTMLElement> {
			// TODO: Use same font as other menu, and also center text
			let fgColor = 'black';
			let bgColor = 'white';
			const securityDescription = securityLabelDescription.securityLabel;
			if (securityDescription && securityDescription.displayMarking) {
				fgColor = securityDescription.displayMarking.fgColor || fgColor;
				bgColor = securityDescription.displayMarking.bgColor || bgColor;
			}
			const menuEntry = $('<li>').data(securityLabelDescriptionDataKey, securityLabelDescription);
			$('<div>')
				.text(securityLabelDescription.securityLabelDisplayText)
				.css('background-color', bgColor)
				.css('color', fgColor)
				.appendTo(menuEntry);
			return menuEntry;
		}

		export function createNonSelectableCatalogMenuEntry(menuText: string): JQuery<HTMLElement> {
			const menuEntry = $('<li>');
			$('<div>')
				.text(menuText)
				.appendTo(menuEntry);
			return menuEntry;
		}
		export const jsxc_security_labels_menu = 'jsxc_security_labels_menu';
		export function createCatalogMenu(catalog: SecurityCatalog) {
			const securityMenu = $('<ul>').addClass(SecurityLabelsUtils.menubuilderforsecuritylabelselector.jsxc_security_labels_menu);
			const items = catalog.items || [];
			// TODO: Use the selectors in each item to create a hierarchy
			items.forEach(item => {
				const name = SecurityLabelsUtils.menubuilderforsecuritylabelselector.getDisplayTextFor(item);
				const securityLabelDescription: SecurityLabelDescription = { securityLabel: item.securityLabel, securityLabelDisplayText: name };
				const menuEntry = SecurityLabelsUtils.menubuilderforsecuritylabelselector.createSelectableCatalogMenuEntry(securityLabelDescription);
				securityMenu.append(menuEntry);
			});
			// If it is a non restricted catalog and there is no empty label option, we add one
			if (!catalog.restrict) {
				const emptyItem = items.find(item => !item.securityLabel);
				if (!emptyItem) {
					const menuEntry = SecurityLabelsUtils.menubuilderforsecuritylabelselector.createSelectableCatalogMenuEntry(nosecurityLabel);
					securityMenu.append(menuEntry);
				}
			}
			return securityMenu;
		}
	}
	export const nosecurityLabel: SecurityLabelDescription = {
		securityLabel: null,
		securityLabelDisplayText: '<No Security Label>'
	};
	/**
	 * return the default label description to be used with a security labels catalog
	 *
	 * @export
	 * @param {SecurityCatalog} catalog
	 * @returns {securityLabelDescription}
	 */
	export function getDefaultSecurityLabel(catalog: SecurityCatalog): SecurityLabelDescription {
		let defaultsecurityLabel: SecurityLabelDescription;

		// Locate the default element
		const defaultItem = catalog.items.find(item => item.default);
		if (defaultItem) {
			defaultsecurityLabel = {
				securityLabel: defaultItem.securityLabel,
				securityLabelDisplayText: SecurityLabelsUtils.menubuilderforsecuritylabelselector.getDisplayTextFor(defaultItem)
			};
		} else {
			if (!catalog.restrict) {
				// If the catalog is not restriced we can use an empty security label as default one
				defaultsecurityLabel = nosecurityLabel;
			} else {
				const emptyItem = catalog.items.find(item => item.securityLabel == null);
				if (emptyItem) {
					// If the catalog includes an empty security label use it. This is not formally stated in the specification but seems a good approach
					defaultsecurityLabel = {
						securityLabel: emptyItem.securityLabel,
						securityLabelDisplayText: SecurityLabelsUtils.menubuilderforsecuritylabelselector.getDisplayTextFor(emptyItem)
					};
				} else {
					if (catalog.items.length > 0) {
						// If the catalog includes any security label we use the first one.
						// This is not formally stated in the specification but seems a good approach
						const firstItem = catalog.items[0];
						defaultsecurityLabel = {
							securityLabel: firstItem.securityLabel,
							securityLabelDisplayText: SecurityLabelsUtils.menubuilderforsecuritylabelselector.getDisplayTextFor(firstItem)
						};
					} else {
						// No entry in the catalog!! return no security Label
						SecurityLabelsUtils.warn(`The security labels catalog has no entries!!`);
						defaultsecurityLabel = nosecurityLabel;
					}
				}
			}
		}
		return defaultsecurityLabel;
	}
	/**
	 * Add a menu option in the setting menu of a chat window
	 *
	 * @export
	 * @param {string} bid
	 * @param {ChatWindowSettingsMenuProperties} menuProperties
	 * @returns
	 */
	export function addSettingsMenuEntry(bid: string, menuProperties: ChatWindowSettingsMenuProperties) {
		const win = jsxc.gui.window.get(bid);

		if (!win || win.length === 0 || !jsxc.xmpp.conn) {
			return;
		}

		const menuEntry = $('<a>');
		menuEntry.attr('href', '#');
		menuEntry.text($.t(menuProperties.textKey));
		if (menuProperties.cssClass) {
			menuEntry.addClass(menuProperties.cssClass);
		}

		menuEntry.click(async () => {
			try {
				// Copied from Ln 2123 in jsxc.lib.gui.js (Dont really know why we need the following call)
				$('body').click();

				// Do nothing if the menu is disabled
				if (menuEntry.hasClass('jsxc_disabled')) {
					return;
				}
				// Disable the menu to avoid reentrant code
				menuEntry.addClass('jsxc_disabled');
				await menuProperties.onClick(menuEntry);
				// reenable the menu
				menuEntry.removeClass('jsxc_disabled');
			} catch (error) {
				SecurityLabelsUtils.error(`Error executing ${$.t(menuProperties.textKey)}: ${error}`);
			}
		});
		win.find('.jsxc_settings ul').append($('<li>').append(menuEntry));
	}
}
