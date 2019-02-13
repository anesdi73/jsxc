declare interface DiscoPlugin { 
    /**
     *
     *
     * @param {string} var_name feature name (like jabber:iq:version)
     * @returns {boolean} true if the feature was added
     * @memberof DiscoPlugin
     */
    addFeature(var_name: string): boolean;
    /**
     * 
     *
     * @param {string} var_name feature name (like jabber:iq:version)
     * @returns {boolean} true if the feature was removed
     * @memberof DiscoPlugin
     */
    removeFeature(var_name: string): boolean;
    items(jid: string, node: string, success: Function, error?: Function, timeout?: number);
    info(jid: string, node: string, success: Function, error?: Function, timeout?: number);
}