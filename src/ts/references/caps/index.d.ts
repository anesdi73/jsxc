
interface CapsPlugin{
    
    /**
     * A hashtable containing
     * version-strings and their capabilities, serialized as string.
     *
     * @type {{ [indexer: string]: any }}
     * @memberof CapsPlugin
     */
    _knownCapabilities: { [indexer: string]: any }
    /**
     * A hashtable containing
     * version-strings and their capabilities, serialized as string.
     *
     * @type {{[indexer: string] : string}}
     * @memberof CapsPlugin
     */
    _jidVerIndex: { [indexer: string]: string }
    
    /**
     *
     *
     * @param {string} jid
     * @param {string} feature
     * @memberof CapsPlugin
     */
    hasFeatureByJid(jid:string, feature:string);
}