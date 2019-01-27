namespace jsxc {
	export namespace gui {
		export namespace euccis {
			/**
             * Creates and shows an info box
             *
             * @export
             * @param {string} msg Message to display
             * @returns {Promise<void>} A promise that resolves when the box is closed
             */
            export function showInfo(msg: string): Promise<void> {
				const promise = new Promise<void>((resolve, reject) => {
					jsxc.gui.dialog.open(jsxc.gui.template.get('infoEuccis', null, msg));
					$(document).one('close.dialog.jsxc', () => {
						resolve();
					});
				});
				return promise;
			}

			/**
             * Creates and shows in band registration box where a new details of a new xmpp account can be defined
             *
             * @export
             * @param {*} registryfields params that should be defined
             * @returns {Promise<boolean>} A promise that resolves to true when the submit button is pressed
             *  and to false if the box is closed in any other way
             */
            export function showInBandRegistryBox(registryfields: any): Promise<boolean> {
				const result = new Promise<boolean>((resolve, reject) => {
					// Set focus to username or password field
					$(document).one('complete.dialog.jsxc', function() {
						setTimeout(function() {
							const username = $('#jsxc_username').val() as string;
							if (username.length === 0) {
								$('#jsxc_username').focus();
							} else {
								$('#jsxc_password').focus();
							}
						}, 50);
					});
					// Resolve the returned promise when the dialog is closed. Include if the registration process should continue
					let registrationSubmitted = false;
					$(document).one('close.dialog.jsxc', () => {
						resolve(registrationSubmitted);
					});

					// TODO: We are reusing the login box.
					// TODO: We should tailor it with the details needed for the registration process(included in the fields object)
					const name = 'registerBox';
					const options = { name };
					jsxc.gui.dialog.open(jsxc.gui.template.get('registerBoxEuccis'), options);

					// Hide an alert that is included in the dialog
					const alert = $('#jsxc_dialog').find('.jsxc_alert');
					alert.hide();

					// Handle submit button by filling the registryfields with the user input
					const dialog = $('#jsxc_dialog');
					dialog.find('form').submit(ev => {
						ev.preventDefault();
						// Show that we are sending messages to the server
						dialog.find('button[data-jsxc-loading-text]').trigger('btnloading.jsxc');

						// Update the registry info with data from the dialog
						const username = dialog.find('#jsxc_username').val();
						const password = dialog.find('#jsxc_password').val();
						registryfields.username = username;
						registryfields.password = password;

						// We want to submit the registration
						registrationSubmitted = true;

						jsxc.gui.dialog.close(name);
					});
				});
				return result;
            }

            /**
             *  Creates and shows an alert box
             *
             * @export
             * @param {string} msg Message to display
             * @returns {Promise<void>} A promise that resolves when the box is closed
             */
            export function showAlert(msg: string): Promise<void> {
                const promise = new Promise<void>((resolve, reject) => {
                    jsxc.gui.dialog.open(jsxc.gui.template.get('alertEuccis', null, msg));
                    $(document).one('close.dialog.jsxc', () => {
                        resolve();
                    });
                });
                return promise;
            }
		}
	}
}


