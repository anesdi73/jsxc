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

	export function fakeSecurityLabelsCatalogRequest(): Promise<SecurityCatalog> {
		const catalog = SecurityLabelsUtils.getDefaultCatalog();
		const promise = new Promise<SecurityCatalog>((resolve, reject) => {
			setTimeout(() => resolve(catalog), 6000);
		});
		return promise;
	}
	export function parseCatalogStanza(stanza: Element): SecurityCatalog {
		// TODO: we have to parse a received security labels catalog
		const stanza$ = $(stanza);
		const catalog = stanza$.find('catalog[xmlns="' + Strophe.NS[SecurityLabels.SEC_LABELS_CATALOG] + '"]');
		return { to: '', desc: '', name: '', items: [] };
	}
	export async function requestSecurityLabelsCatalogToXmppServer(ownServer: string, bid: string): Promise<SecurityCatalog> {
		// TODO: For testing we always return the same hardcoded security labels catalog but we should ask the server
		return SecurityLabelsUtils.fakeSecurityLabelsCatalogRequest();

		SecurityLabelsUtils.info(`Start Requesting SecurityLabels Catalog for ${bid} to Xmpp server`);

		const iq = $iq({
			to: ownServer,
			type: 'get'
		}).c('catalog', {
			xmlns: Strophe.NS[SecurityLabels.SEC_LABELS],
			to: bid
		});

		const stanza = await AsyncAdapter.strophe.sendIQAsync(iq);
		SecurityLabelsUtils.info(`End Requesting SecurityLabels Catalog for ${bid}`);
		const catalog = SecurityLabelsUtils.parseCatalogStanza(stanza);
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
	export namespace MenuBuilder {
		export function getDisplayTextFor(item: CatalogItem) {
			if (item.securitylabel && item.securitylabel.displayMarking) {
				return item.securitylabel.displayMarking.text;
			}
			if (item.selector) {
				const selectors = item.selector.split('|');
				return selectors[selectors.length - 1];
			}
			return '<No name provided>';
		}
		export const securitylabelDescriptionDataKey = 'securitylabelDescription';
		export function createSelectableCatalogMenuEntry(securitylabelDescription: SecurityLabelDescription): JQuery<HTMLElement> {
			// TODO: Use same font as other menu, and also center text
			let fgColor = 'black';
			let bgColor = 'white';
			const securityDescription = securitylabelDescription.securityLabel;
			if (securityDescription && securityDescription.displayMarking) {
				fgColor = securityDescription.displayMarking.fgColor || fgColor;
				bgColor = securityDescription.displayMarking.bgColor || bgColor;
			}
			const menuEntry = $('<li>').data(securitylabelDescriptionDataKey, securitylabelDescription);
			$('<div>')
				.text(securitylabelDescription.securityLabelDisplayText)
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
			const securityMenu = $('<ul>').addClass(SecurityLabelsUtils.MenuBuilder.jsxc_security_labels_menu);
			const items = catalog.items || [];
			// TODO: Use the selectors to create a hierarchy
			items.forEach(item => {
				const name = SecurityLabelsUtils.MenuBuilder.getDisplayTextFor(item);
				const securityLabelDescription: SecurityLabelDescription = { securityLabel: item.securitylabel, securityLabelDisplayText: name };
				const menuEntry = SecurityLabelsUtils.MenuBuilder.createSelectableCatalogMenuEntry(securityLabelDescription);
				securityMenu.append(menuEntry);
			});
			// If it is a non restricted catalog and there is no empty label option, we add one
			if (!catalog.restrict) {
				const emptyItem = items.find(item => !item.securitylabel);
				if (!emptyItem) {
					const menuEntry = SecurityLabelsUtils.MenuBuilder.createSelectableCatalogMenuEntry(noSecurityLabel);
					securityMenu.append(menuEntry);
				}
			}
            return securityMenu;
        }

    }
	export const noSecurityLabel: SecurityLabelDescription = {
		securityLabel: null,
		securityLabelDisplayText: '<No Security Label>'
	};
	/**
	 * return the a default label description to be used with a security labels catalog
	 *
	 * @export
	 * @param {SecurityCatalog} catalog
	 * @returns {SecurityLabelDescription}
	 */
	export function getDefaultSecurityLabel(catalog: SecurityCatalog): SecurityLabelDescription {
		let defaultSecurityLabel: SecurityLabelDescription;

		// Locate the default element
		const defaultItem = catalog.items.find(item => item.default);
		if (defaultItem) {
			defaultSecurityLabel = {
				securityLabel: defaultItem.securitylabel,
				securityLabelDisplayText: SecurityLabelsUtils.MenuBuilder.getDisplayTextFor(defaultItem)
			};
		} else {
			if (!catalog.restrict) {
				// If the catalog is not restriced we can use an empty security label
				defaultSecurityLabel = noSecurityLabel;
			} else {
				// If the catalog includes an empty security label we can use it
				const emptyItem = catalog.items.find(item => item.securitylabel == null);
				if (emptyItem) {
					// If the catalog includes an empty security label we can use it
					defaultSecurityLabel = {
						securityLabel: emptyItem.securitylabel,
						securityLabelDisplayText: SecurityLabelsUtils.MenuBuilder.getDisplayTextFor(emptyItem)
					};
				} else {
					if (catalog.items.length > 0) {
						// If the catalog includes any security label we use the first one
						const firstItem = catalog.items[0];
						defaultSecurityLabel = {
							securityLabel: firstItem.securitylabel,
							securityLabelDisplayText: SecurityLabelsUtils.MenuBuilder.getDisplayTextFor(firstItem)
						};
					} else {
						// No entry in the catalog!! return no security Label
						defaultSecurityLabel = noSecurityLabel;
					}
				}
			}
		}
		return defaultSecurityLabel;
	}
}
