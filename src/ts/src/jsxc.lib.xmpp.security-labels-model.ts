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
	 * Restrictive. If true only security labels included in this catalog can be used
	 * The client SHOULD restrict the user to choosing one of the items from the catalog
	 * and use the label of that item (or no label if the selected item is empty)
	 * When false the client SHOULD offer a choice of sending a stanza without a label.
	 *
	 * @type {boolean}
	 * @memberof SecurityCatalog
	 */
	restrict?: boolean;
	items: CatalogItem[];
}
interface CatalogItem {
	/**
	 * The value of this attribute represents the item's placement in a hierarchical organization of the items.
	 *  If one item has a selector, all items should have a selector.
	 *
	 * A value of "X|Y|Z" indicates that this item is "Z" in the the "Y" subset of the "X" subset of items.
	 * This information may be used, for instance, in generating label selection menus in graphical user interfaces.
	 *
	 * @type {string}
	 * @memberof CatalogItem
	 */
	selector?: string;
	/**
	 * It carries the security label metadata
	 *
	 * @type {SecurityLabel}
	 * @memberof CatalogItem
	 */
	securityLabel?: SecurityLabel;
	/**
	 * One and only one of the items may have a default attribute with value of true.
	 * The client should default the label selection to this item in cases where the user has not selected an item
	 *
	 * @type {boolean}
	 * @memberof CatalogItem
	 */
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
interface SecurityLabelDescription {
	securityLabel?: SecurityLabel;
	securityLabelDisplayText: string;
}

interface ChatWindowSettingsMenuProperties {
	textKey: string;
	cssClass?: string;
	onClick: (menuItem: JQuery) => void|Promise<void>;
}
