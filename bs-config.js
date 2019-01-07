module.exports = {
	// Switch off inter browser sync
	ghostMode: false,
	// Serve files from the app directory, with a specific index filename
	server: {
		routes: {
			"/": "example"
		}
	}
};