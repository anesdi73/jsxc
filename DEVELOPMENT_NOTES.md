(done) XEP-0077: In-Band Registration should be included to allow to register a client with the XMPP server
we use jquery-ui internally but it is not bundle with jsxc but loaded from the main page (security labels menu)
we use bootstrap internally but it is not bundle with jsxc but loaded from the main page (security label tooltip)
it would be better to just use bootstrap or jquery-ui but not both
we have to add the images folder from jquery-ui
we ave modified the index.d.ts included in the npm package to be able to use ES6. @types/strophe.js is added as a local dependencies instead as a regular npm package because we need to modify the definition to be able to use ES6. Line 1098 is modified to replace import "." by import "strophe.js"
Should we include security labels in the si-file messages. Are we doing it?
Review MAM (message archive managemenet). Activate it in the server and see how it integrates with file transfer an security labels
Review integration between Security Labels and httpUpload
Review integration between Security Labels and webrtc
Review OTR
Review integration between Security Labels and otr
