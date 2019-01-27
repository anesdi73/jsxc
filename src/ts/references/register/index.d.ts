declare interface RegisterPlugin{
        /** Function: connect
     *  Starts the registration process.
     *
     *  As the registration process proceeds, the user supplied callback will
     *  be triggered multiple times with status updates.  The callback
     *  should take two arguments - the status code and the error condition.
     *
     *  The status code will be one of the values in the Strophe.Status
     *  constants.  The error condition will be one of the conditions
     *  defined in RFC 3920 or the condition 'strophe-parsererror'.
     *
     *  Please see XEP 77 for a more detailed explanation of the optional
     *  parameters below.
     *
     *  Parameters:
     *    (String) domain - The xmpp server's Domain.  This will be the server,
     *      which will be contacted to register a new JID.
     *      The server has to provide and allow In-Band Registration (XEP-0077).
     *    (Function) callback The connect callback function.
     *    (Integer) wait - The optional HTTPBIND wait value.  This is the
     *      time the server will wait before returning an empty result for
     *      a request.  The default setting of 60 seconds is recommended.
     *      Other settings will require tweaks to the Strophe.TIMEOUT value.
     *    (Integer) hold - The optional HTTPBIND hold value.  This is the
     *      number of connections the server will hold at one time.  This
     *      should almost always be set to 1 (the default).
     */
    connect(domain:string, callback:(status:Strophe.Status,condition:string,element)=>void, wait?:number, hold?:number, route?):void;
     /** Function: submit
     *  Submits Registration data.
     *
     *  As the registration process proceeds, the user supplied callback will
     *  be triggered with status code Strophe.Status.REGISTER. At this point
     *  the user should fill all required fields in connection.register.fields
     *  and invoke this function to procceed in the registration process.
     */
    submit();
    
    fields: any;
}

