frappe.pages['my-drive'].on_page_load = function (wrapper) {
	new MyDrive(wrapper);
};

class MyDrive {
	constructor(wrapper) {
		this.wrapper = wrapper;
		this.folder_history = []
		this.current_folder = "Home"
		this.drive_access = []
		this.permissions = []
		this.ParentfolderPermissions = []
		// this.selectedFiles = [];
		this.tags = null
		this.init();
	}

	init() {
		this.page = frappe.ui.make_app_page({
			parent: this.wrapper,
			title: 'My Drive',
			single_column: true
		});
		// this.fileUpload();
		// frappe.msgprint(JSON.stringify(frappe.session.user))
		console.log(frappe.session.user, "user");
		frappe.db.get_value("Drive Access", { "user": frappe.session.user }, ['view_only', 'upload_only', 'all'])
			.then(r => {
				console.log("Drive Access", r.message);
				this.drive_access = r.message
				this.fileUpload();
			})
		this.renderTemplate(this.current_folder);
		this.PDFpreview();
		this.bindCheckboxEvents();
		this.openShared()
		this.openMedia()
		this.openDocuments()
		this.goHome();
		this.Exelpreview()
	}

	renderTemplate(folder) {
		console.log("current_folder", this.current_folder, "window location", window.location.pathname);
		folder = folder || this.current_folder;
		// $(".page-wrapper").html("")

		if (window.location.pathname !== "/app/my-drive") {
			console.log("window.location was ", window.location.pathname);
			history.pushState({ folder: "Home" }, "", "/app/my-drive");
		}

		frappe.call({
			method: "photos.my_drive.page.my_drive.my_drive.render_template_context",
			args: { owner: frappe.session.user, folder: folder },
			callback: (r) => {
				if (r.message) {
					console.log("renderTemplate responce", r.message);
					let permissions = r.message.files.map(file => ({
						drive_id: file.drive_id,
						file_id: file.file_id,
						read: file.read ?? 0,
						write: file.write ?? 0,
						delete: file.delete_file ?? 0,
						download: file.download ?? 0,
						share: file.share ? 1 : 0,
						create: frappe.session.user === file.created_by ? 1 : 0,
					}));
					// this.drive_access = r.message.drive_access;
					this.permissions = permissions
					this.tags = r.message.tags || {};
					console.log("renderTemplate this.permissions", this.permissions);
					let filess = r.message.files.filter(file => !file.is_folder);
					let folders = r.message.files.filter(file => file.is_folder);

					// if (filess.length === 0 && folders.length ===0) {
					// 	let fileDisplayArea = document.querySelector(".ibox-content");
					// 	fileDisplayArea.innerHTML = "";
					// 	fileDisplayArea.innerHTML = `<p class="center"> No Files Uploaded. Upload files here. </p>`;
					// 	return;
					// }
					console.log("files", filess);
					console.log("folders", folders);
					let context = {
						"user_details": r.message.user_details,
						"files": filess,
						"folders": folders,
					}
					console.log("renderTemplate ends here...");

					$(this.page.main).empty();
					$(frappe.render_template("my_drive", context)).appendTo(this.page.main);
					if (filess.length === 0 && folders.length === 0) {
						addEmptyState();
						return;
					}
					this.current_folder = folder;
					this.openFolder();
					this.imagePreview()
				}
			}
		});
	}

	// share(selectedFiles) {
	// 	let usersData = [];

	// 	let shareDialog = new frappe.ui.Dialog({
	// 		title: __('Share Files'),
	// 		fields: [
	// 			{
	// 				fieldtype: "HTML",
	// 				fieldname: "users_html",
	// 				options: `
	// 					<div class="users-permissions-table">
	// 						<table class="table table-bordered">
	// 						<thead>
	// 							<tr>
	// 								<th width="40%">User</th>
	// 								<th width="15%">Read</th>
	// 								<th width="15%">Write</th>
	// 								<th width="15%">Download</th>
	// 								<th width="15%">Delete</th>
	// 							</tr>
	// 						</thead>
	// 						<tbody id="users-table-body">
	// 							<!-- Users will be added here -->
	// 						</tbody>
	// 					</table>
	// 					<button type="button" class="btn btn-xs btn-default" id="add-user-btn">
	// 						<i class="fa fa-plus"></i> Add User
	// 					</button>
	// 				</div>
	// 				<style>
	// 					.users-permissions-table {
	// 						margin: 10px 0;
	// 					}
	// 					.users-permissions-table table {
	// 						margin-bottom: 10px;
	// 					}
	// 					.users-permissions-table th, 
	// 					.users-permissions-table td {
	// 						text-align: center;
	// 						vertical-align: middle;
	// 					}
	// 					.users-permissions-table th:first-child,
	// 					.users-permissions-table td:first-child {
	// 						text-align: left;
	// 					}
	// 					.user-field-container {
	// 						width: 100%;
	// 					}
	// 					.user-field-container .control-input-wrapper {
	// 						margin-bottom: 0;
	// 					}
	// 					.permission-checkbox {
	// 						transform: scale(1.2);
	// 						cursor: pointer;
	// 						margin: 0;
	// 						position: relative;
	// 						z-index: 999;
	// 					}
	// 					.permission-checkbox:focus {
	// 						outline: 2px solid #007bff;
	// 					}
	// 					.remove-user-btn {
	// 						color: #d1ecf1;
	// 						border: none;
	// 						background: none;
	// 						font-size: 16px;
	// 					}
	// 					.remove-user-btn:hover {
	// 						color: #721c24;
	// 					}
	// 				</style>
	// 			`
	// 		}
	// 	],
	// 	primary_action_label: __('Share'),
	// 	primary_action: (values) => {
	// 		console.log("Files to share:", selectedFiles);
	// 		console.log("Users data:", usersData);

	// 		// Validate that at least one user is added
	// 		if (usersData.length === 0) {
	// 			frappe.msgprint({
	// 				title: __('No Users Selected'),
	// 				message: __('Please add at least one user to share files with.'),
	// 				indicator: 'orange'
	// 			});
	// 			return;
	// 		}

	// 		// Validate that each user has at least one permission
	// 		let invalidUsers = [];
	// 		usersData.forEach((userData, index) => {
	// 			if (!userData.read && !userData.write && !userData.download && !userData.delete_file) {
	// 				invalidUsers.push(`${userData.user || 'Row ' + (index + 1)}`);
	// 			}
	// 		});

	// 		if (invalidUsers.length > 0) {
	// 			frappe.msgprint({
	// 				title: __('Invalid Permissions'),
	// 				message: __('Please select at least one permission for: ') + invalidUsers.join(', '),
	// 				indicator: 'orange'
	// 			});
	// 			return;
	// 		}


	// 		let fileUserMappings = selectedFiles.map(file => {
	// 			return {
	// 				file: file,
	// 				child_data: usersData.map(userData => ({
	// 					user: userData.user,
	// 					permissions: {
	// 						read: userData.read ? 1 : 0,
	// 						write: userData.write ? 1 : 0,
	// 						download: userData.download ? 1 : 0,
	// 						delete_file: userData.delete_file ? 1 : 0
	// 					}
	// 				}))
	// 			};
	// 		});

	// 		// Call backend method
	// 		frappe.call({
	// 			method: "photos.my_drive.page.my_drive.my_drive.share_files",
	// 			args: {
	// 				file_permissions: fileUserMappings
	// 			},
	// 			callback: (r) => {
	// 				if (r.message) {
	// 					frappe.msgprint({
	// 						title: __('Success'),
	// 						message: __('Files shared successfully with {0} user(s)', [usersData.length]),
	// 						indicator: 'green'
	// 					});
	// 					shareDialog.hide();
	// 					this.renderTemplate(this.current_folder);
	// 				}
	// 			},
	// 			error: (r) => {
	// 				frappe.msgprint({
	// 					title: __('Error'),
	// 					message: __('Failed to share files. Please try again.'),
	// 					indicator: 'red'
	// 				});
	// 			}
	// 		});
	// 	}
	// });

	// // Function to add a new user row
	// function addUserRow(userData = {}) {
	// 	let index = usersData.length;
	// 	let defaultData = {
	// 		user: userData.user || '',
	// 		read: userData.read !== undefined ? userData.read : true,
	// 		write: userData.write || false,
	// 		download: userData.download || false,
	// 		delete_file: userData.delete_file || false
	// 	};

	// 	usersData.push(defaultData);

	// 	let row = `
	// 		<tr data-index="${index}">
	// 			<td>
	// 				<div class="user-field-container" data-index="${index}"></div>
	// 			</td>
	// 			<td>
	// 				<input type="checkbox" class="permission-checkbox" 
	// 					   data-permission="read" data-index="${index}" 
	// 					   ${defaultData.read ? 'checked' : ''}
	// 					   onclick="window.updatePermission(${index}, 'read', this.checked)">
	// 			</td>
	// 			<td>
	// 				<input type="checkbox" class="permission-checkbox" 
	// 					   data-permission="write" data-index="${index}" 
	// 					   ${defaultData.write ? 'checked' : ''}
	// 					   onclick="window.updatePermission(${index}, 'write', this.checked)">
	// 			</td>
	// 			<td>
	// 				<input type="checkbox" class="permission-checkbox" 
	// 					   data-permission="download" data-index="${index}" 
	// 					   ${defaultData.download ? 'checked' : ''}
	// 					   onclick="window.updatePermission(${index}, 'download', this.checked)">
	// 			</td>
	// 			<td>
	// 				<input type="checkbox" class="permission-checkbox" 
	// 					   data-permission="delete_file" data-index="${index}" 
	// 					   ${defaultData.delete_file ? 'checked' : ''}
	// 					   onclick="window.updatePermission(${index}, 'delete_file', this.checked)">
	// 				<button type="button" class="remove-user-btn float-right" 
	// 						data-index="${index}" title="Remove User"
	// 						onclick="window.removeUser(${index})">
	// 					<i class="fa fa-times"></i>
	// 				</button>
	// 			</td>
	// 		</tr>
	// 	`;

	// 	$('#users-table-body').append(row);

	// 	// Create Frappe Link field for user selection
	// 	let userFieldContainer = $(`.user-field-container[data-index="${index}"]`)[0];
	// 	let userField = frappe.ui.form.make_control({
	// 		parent: userFieldContainer,
	// 		df: {
	// 			fieldtype: "Link",
	// 			fieldname: "user",
	// 			options: "User",
	// 			placeholder: "Select User",
	// 			// reqd: 1,
	// 			change: function () {
	// 				usersData[index].user = userField.get_value();
	// 			}
	// 		},
	// 		render_input: true
	// 	});
	// }

	// // Function to remove user row
	// function removeUserRow(index) {
	// 	usersData.splice(index, 1);
	// 	$(`tr[data-index="${index}"]`).remove();

	// 	// Update indices for remaining rows
	// 	$('#users-table-body tr').each(function(newIndex) {
	// 		$(this).attr('data-index', newIndex);
	// 		$(this).find('input, button').each(function() {
	// 			$(this).attr('data-index', newIndex);
	// 		});
	// 	});
	// }

	// if (selectedFiles.length > 0) {
	// 	shareDialog.show();

	// 	// Create global functions for inline event handlers
	// 	window.updatePermission = function(index, permission, checked) {
	// 		if (usersData[index]) {
	// 			usersData[index][permission] = checked;
	// 			console.log(`Updated ${permission} for user ${index}:`, checked);
	// 		}
	// 	};

	// 	window.removeUser = function(index) {
	// 		removeUserRow(index);
	// 	};

	// 	// setTimeout(() => {
	// 	// 	// Add event handlers for add button
	// 	// 	$(shareDialog.$wrapper).on('click', '#add-user-btn', function() {
	// 	// 		addUserRow();
	// 	// 	});
	// 	// 	// Add first row
	// 	// 	addUserRow();
	// 	// }, 300);

	// 	shareDialog.$wrapper.on('click', '#add-user-btn', function () {
	// 		addUserRow();
	// 	});

	// 	// Rebind global functions every time
	// 	window.updatePermission = function (index, permission, checked) {
	// 		if (usersData[index]) {
	// 			usersData[index][permission] = checked;
	// 		}
	// 	};

	// 	window.removeUser = function (index) {
	// 		removeUserRow(index);
	// 	};

	// 	// Add first row initially
	// 	addUserRow();


	// } else {
	// 	frappe.msgprint({
	// 		title: __('No Files Selected'),
	// 		message: __('Please select files to share.'),
	// 		indicator: 'orange'
	// 	});
	// }

	// }

	bindCheckboxEvents() {
		let shareButton = null; // Keep reference to the button
		let deleteButton = null;
		$(document).on("change", ".checkbox", () => {
			const anyChecked = $(".checkbox:checked").length > 0;
			if (anyChecked) {
				let selectedFiles = this.getSelectedFiles();
				console.log("selected fils permissions :",this.permissions);
				let matchedPermissions = this.permissions.filter(p => selectedFiles.some(itemA => itemA.file_id === p.file_id));
				console.log("matched ", matchedPermissions);
				if (!shareButton && matchedPermissions.some(p => p.create === 1 || p.share === 1)) {
					shareButton = this.page.add_inner_button(__('Share'), () => {
						if (selectedFiles.length > 0) {
							this.share(selectedFiles);
						} else {
							frappe.msgprint({
								title: __('No Files Selected'),
								message: __('Please select files to share.'),
								indicator: 'orange'
							});
						}
					});

				}else if (!deleteButton && matchedPermissions.some(p => p.create === 1 || p.delete === 1)) {
					deleteButton = this.page.add_inner_button(__('Delete'), () => {
						if (selectedFiles.length > 0) {
							this.deleteFiles(selectedFiles);
						} else {
							frappe.msgprint({
								title: __('No Files Selected'),
								message: __('Please select files to share.'),
								indicator: 'orange'
							});
						}
					});
				}

			} else {
				// Remove share button when no checkboxes are selected
				if (shareButton || deleteButton) {
					shareButton.remove();
					deleteButton.remove();
					shareButton = null;
					deleteButton = null;
				}
			}
		});
	}

	getSelectedFiles() {
		let selectedFiles = [];
		$('input[type="checkbox"]:checked.checkbox').each(function () {
			let filename = $(this).data('file-id');
			let docname = $(this).data('docname');
			console.log("docname", docname);
			console.log("filename", filename);
			var fileData = {
				"file_id": filename,
				"drive_id": docname,
			};
			selectedFiles.push(fileData);
		});
		console.log("Selected files:", selectedFiles);
		return selectedFiles;
	}

	deleteFiles(selectedFiles){
		frappe.confirm("Are you sure you want to delete this file?", function () {
			frappe.call({
				method: "photos.my_drive.page.my_drive.my_drive.delete_bulk_items",
				args: { bulk_files: selectedFiles },
				callback: function (r) {
					console.log("r.message", r.message);
					if (r.message.status === "Success") {
						$(`.image-preview[data-drive-id="${r.message.drive_id}"]`).closest(".file-box").remove();
						frappe.show_alert({
							message: "File deleted successfully.",
							indicator: "green"
						});
						// $(`.image-preview[data-name="${file_name}"]`).closest(".file-box").fadeOut(300, function() {
						// 	$(this).remove();
						// });
					} else {
						frappe.msgprint("Error deleting file.");
					}
				}
			});
		});
	}

	share(selectedFiles) {
		let usersData = [];

		let shareDialog = new frappe.ui.Dialog({
			title: __('Share Files'),
			fields: [
				{
					fieldtype: "HTML",
					fieldname: "users_html",
					options: `
						<div class="users-permissions-table">
							<table class="table table-bordered">
							<thead>
								<tr>
									<th width="40%">User</th>
									<th width="15%">Read</th>
									<th width="15%">Write</th>
									<th width="15%">Download</th>
									<th width="15%">Delete</th>
								</tr>
							</thead>
							<tbody id="users-table-body">
								<!-- Users will be added here -->
							</tbody>
						</table>
						<button type="button" class="btn btn-xs btn-default" id="add-user-btn">
							<i class="fa fa-plus"></i> Add User
						</button>
					</div>
					<style>
						.users-permissions-table {
							margin: 10px 0;
						}
						.users-permissions-table table {
							margin-bottom: 10px;
						}
						.users-permissions-table th, 
						.users-permissions-table td {
							text-align: center;
							vertical-align: middle;
						}
						.users-permissions-table th:first-child,
						.users-permissions-table td:first-child {
							text-align: left;
						}
						.user-field-container {
							width: 100%;
						}
						.user-field-container .control-input-wrapper {
							margin-bottom: 0;
						}
						.permission-checkbox {
							transform: scale(1.2);
							cursor: pointer;
							margin: 0;
							position: relative;
							z-index: 999;
						}
						.permission-checkbox:focus {
							outline: 2px solid #007bff;
						}
						.remove-user-btn {
							color: #d1ecf1;
							border: none;
							background: none;
							font-size: 16px;
						}
						.remove-user-btn:hover {
							color: #721c24;
						}
					</style>
				`
				}
			],
			primary_action_label: __('Share'),
			primary_action: (values) => {
				console.log("Files to share:", selectedFiles, typeof selectedFiles);
				console.log("Users data:", usersData);

				// Validate that at least one user is added

				usersData.map((user) => {
					if (user.user == ' ') {
						console.log("user.user", user.user);
						frappe.msgprint({
							title: __('No User Selected'),
							message: __('Please select a user to share files with.'),
							indicator: 'orange'
						});
						return;
					}
				})
				if (usersData.user === '') {
					frappe.msgprint({
						title: __('No Users Selected'),
						message: __('Please add at least one user to share files with.'),
						indicator: 'orange'
					});
					return;
				}
				// Validate that each user has at least one permission
				let invalidUsers = [];
				usersData.forEach((userData, index) => {
					if (!userData.read && !userData.write && !userData.download && !userData.delete_file) {
						invalidUsers.push(`${userData.user || 'Row ' + (index + 1)}`);
					}
				});

				let fileUserMappings = selectedFiles.map(file => {
					console.log("file", file);

					return {
						docname: file.doctype,
						file: file.file_id,
						shared_by: frappe.session.user,
						child_data: usersData.map(userData => ({
							for_user: userData.user,
							read: userData.read ? 1 : 0,
							write: userData.write ? 1 : 0,
							download: userData.download ? 1 : 0,
							delete: userData.delete_file ? 1 : 0
						}))
					};
				});

				console.log("fileUserMappings", fileUserMappings);
				// Call backend method
				frappe.call({
					method: "photos.my_drive.page.my_drive.my_drive.share_files",
					args: {
						file_permissions: fileUserMappings
					},
					callback: (r) => {
						if (r.message) {
							frappe.msgprint({
								title: __('Success'),
								message: __('Files shared successfully with {0} user(s)', [usersData.length]),
								indicator: 'green'
							});
							frappe.show_alert({
								message: "Files shared successfully.",
								indicator: "green"
							});
							shareDialog.hide();
							this.renderTemplate(this.current_folder);
						}
					},
					error: (r) => {
						frappe.msgprint({
							title: __('Error'),
							message: __('Failed to share files. Please try again.'),
							indicator: 'red'
						});
					}
				});
			}
		});

		// Function to add a new user row
		function addUserRow(userData = {}) {
			let index = usersData.length;
			let defaultData = {
				user: userData.user || '',
				read: userData.read !== undefined ? userData.read : true,
				write: userData.write || false,
				download: userData.download || false,
				delete_file: userData.delete_file || false
			};

			usersData.push(defaultData);

			let row = `
				<tr data-index="${index}">
					<td>
						<div class="user-field-container" data-index="${index}"></div>
					</td>
					<td>
						<input type="checkbox" class="permission-checkbox" 
							data-permission="read" data-index="${index}" 
							${defaultData.read ? 'checked' : ''}>
					</td>
					<td>
						<input type="checkbox" class="permission-checkbox" 
							data-permission="write" data-index="${index}" 
							${defaultData.write ? 'checked' : ''}>
					</td>
					<td>
						<input type="checkbox" class="permission-checkbox" 
							data-permission="download" data-index="${index}" 
							${defaultData.download ? 'checked' : ''}>
					</td>
					<td>
						<input type="checkbox" class="permission-checkbox" 
							data-permission="delete_file" data-index="${index}" 
							${defaultData.delete_file ? 'checked' : ''}>
						<button type="button" class="remove-user-btn float-right" 
								data-index="${index}" title="Remove User">
							<i class="fa fa-times"></i>
						</button>
					</td>
				</tr>
			`;

			$(shareDialog.$wrapper).find('#users-table-body').append(row);

			// Create Frappe Link field for user selection
			let userFieldContainer = $(shareDialog.$wrapper).find(`.user-field-container[data-index="${index}"]`)[0];
			let userField = frappe.ui.form.make_control({
				parent: userFieldContainer,
				df: {
					fieldtype: "Link",
					fieldname: "user",
					options: "User",
					placeholder: "Select User",
					change: function () {
						usersData[index].user = userField.get_value();
					}
				},
				render_input: true
			});

			// Set initial value if provided
			if (defaultData.user) {
				userField.set_value(defaultData.user);
			}
		}

		// Function to remove user row
		function removeUserRow(index) {
			usersData.splice(index, 1);
			$(shareDialog.$wrapper).find(`tr[data-index="${index}"]`).remove();

			// Update indices for remaining rows
			$(shareDialog.$wrapper).find('#users-table-body tr').each(function (newIndex) {
				$(this).attr('data-index', newIndex);
				$(this).find('input, button').each(function () {
					let currentAttr = $(this).attr('data-index');
					if (currentAttr !== undefined) {
						$(this).attr('data-index', newIndex);
					}
				});
			});
		}

		// Function to update permission
		function updatePermission(index, permission, checked) {
			if (usersData[index]) {
				usersData[index][permission] = checked;
				console.log(`Updated ${permission} for user ${index}:`, checked);
			}
		}

		// Function to setup event handlers
		function setupEventHandlers() {
			// Remove any existing event handlers to prevent duplicates
			$(shareDialog.$wrapper).off('click.shareDialog');

			// Add event handler for add user button
			$(shareDialog.$wrapper).on('click.shareDialog', '#add-user-btn', function () {
				addUserRow();
			});

			// Add event handler for permission checkboxes
			$(shareDialog.$wrapper).on('change.shareDialog', '.permission-checkbox', function () {
				let index = parseInt($(this).attr('data-index'));
				let permission = $(this).attr('data-permission');
				let checked = $(this).is(':checked');
				updatePermission(index, permission, checked);
			});

			// Add event handler for remove user buttons
			$(shareDialog.$wrapper).on('click.shareDialog', '.remove-user-btn', function () {
				let index = parseInt($(this).attr('data-index'));
				removeUserRow(index);
			});
		}

		if (selectedFiles.length > 0) {
			shareDialog.show();

			// Setup event handlers after dialog is shown
			setTimeout(() => {
				setupEventHandlers();
				// Add first row initially
				addUserRow();
			}, 100);

		} else {
			frappe.msgprint({
				title: __('No Files Selected'),
				message: __('Please select files to share.'),
				indicator: 'orange'
			});
		}
	}

	fileUpload() {
		let self = this
		console.log("fileUpload - ", self.drive_access.all)
		if (self.drive_access.all == 1) {

			this.page.add_action_item(__('<i class="fa fa-file"></i> Upload File'), function () {
				var file_input = document.createElement("input");
				file_input.type = "file";
				file_input.accept = ".pdf, .xls, .xlsx, .doc, .docx, .png, .jpg, .jpeg, .gif";
				console.log("current folder = ", self.current_folder);
				
				file_input.onchange = function () {
					var file = file_input.files[0];
					let folderName = self.current_folder;
					console.log("Uploading file to ...", folderName);
					console.table(file);
					
					var xhr = new XMLHttpRequest();
					// Update the endpoint to your custom upload handler
					xhr.open("POST", "/api/method/photos.my_drive.page.my_drive.my_drive.upload_file_to_my_drive", true);
					xhr.setRequestHeader("Accept", "application/json");
					xhr.setRequestHeader("X-Frappe-CSRF-Token", frappe.csrf_token);
					
					let form_data = new FormData();
					form_data.append("file", file, file.name);
					form_data.append("folder", folderName);
					
					xhr.onload = function () {
						if (xhr.status === 200) {
							$(".empty-state-1").remove();
							console.log("File uploaded successfully:", xhr.responseText);
							let response = JSON.parse(xhr.responseText);
							let file_url = response.message.file_url;
							let file_name = response.message.file_name;
							let file_id = response.message.file_id;
							let drive_id = response.message.drive_id;


							
							let permissions = {
								drive_id: drive_id,
								file_id: file_id,
								read:1,
								write:1,
								delete:1,
								download:1,
								share:1,
								create:1,
							}

							self.permissions.push(permissions)
							console.log("File and Drive Manager created successfully: Permissions : ",self.permissions);

							let fileContainer = document.querySelector(".col-lg-16");
							let newFileBox = document.createElement("div");
							const allowedTypes = ["pdf", "xls", "xlsx", "doc", "docx"];
							
							if (allowedTypes.includes(file.name.split('.').pop().toLowerCase())) {
								newFileBox.className = "file-box";
								newFileBox.innerHTML = `
									<div class="file">
									 	<div class="file-header">
                                            <input class="level-item checkbox hidden-xs" type="checkbox" data-file-id=${file_id} data-docname=${drive_id}>
                                        </div>
										<a href="#" class="open-spreadsheet" data-file-url="${file_url}" data-name="${file_id}">
											<span class="corner"></span>
											<div class="file-body">
												<svg class="icon" style="width: 71px; height: 75px" aria-hidden="true">
													<use href="#icon-file-large"></use>
												</svg>
											</div>
											<div class="file-name">
												${file_name}
												<br>
												<small>Just now</small>
											</div>
										</a>
									</div>`;
							} else {
								newFileBox.className = "file-box";
								newFileBox.innerHTML = `
								<div class="file">
									<div class="file-header">
										<input class="level-item checkbox hidden-xs" type="checkbox" data-file-id="${file_id}" data-docname="${drive_id}">
									</div>
									<a href="#" class="image-preview" data-file-url="${file_url}" data-file-id="${file_id}">
										<span class="corner"></span>
										<div class="image">
											<img alt="image" class="img-responsive" src="${file_url}">
										</div>
										<div class="file-name">
											${file_name}
											<br>
											<small>Just now</small>
										</div>
									</a>
								</div>`;
							}
							fileContainer.prepend(newFileBox);
						} else {
							console.error("Upload failed:", xhr.statusText);
							frappe.msgprint(__("Error uploading file: {0}", [xhr.statusText]));
						}
					};
					
					xhr.onerror = function() {
						console.error("Upload failed:", xhr.statusText);
						frappe.msgprint(__("Error uploading file"));
					};
					
					xhr.send(form_data);
					console.log("Uploading file:", file.name);
				};
				
				file_input.click();
			});


			// this.page.add_action_item(__('<i class="fa fa-file"></i> Upload File'), function () {
			// 	var file_input = document.createElement("input");
			// 	file_input.type = "file";
			// 	file_input.accept = ".pdf, .xls, .xlsx, .doc, .docx, .png, .jpg, .jpeg, .gif";
			// 	console.log("current folder = ", self.current_folder);
				
			// 	file_input.onchange = function () {
			// 		var file = file_input.files[0];
			// 		let folderName = self.current_folder;
			// 		console.log("Uploading file to ...", folderName);
			// 		console.table(file);
					
			// 		var xhr = new XMLHttpRequest();
			// 		// Update the endpoint to your custom upload handler
			// 		xhr.open("POST", "/api/method/photos.my_drive.page.my_drive.my_drive.upload_file_to_my_drive", true);
			// 		xhr.setRequestHeader("Accept", "application/json");
			// 		xhr.setRequestHeader("X-Frappe-CSRF-Token", frappe.csrf_token);
					
			// 		let form_data = new FormData();
			// 		form_data.append("file", file, file.name);
			// 		form_data.append("folder", folderName);
					
			// 		xhr.onload = function () {
			// 			if (xhr.status === 200) {
			// 				$(".empty-state-1").remove();
			// 				console.log("File uploaded successfully:", xhr.responseText);
			// 				let response = JSON.parse(xhr.responseText);
			// 				let file_url = response.message.file_url;
			// 				let file_type = response.message.file_type;
			// 				let file_id = response.message.file_id;

			// 				frappe.call({
			// 					method: "photos.my_drive.page.my_drive.my_drive.create_drive_files",
			// 					args: { 
			// 						folder: folderName, 
			// 						filename: response.message.file_name,
			// 						attached_to_name: response.message.name 
			// 					},
			// 					callback: function (r) {
			// 						if (r.message) {
			// 							console.log("File added successfully:", r.message);
			// 						}
			// 					}
			// 				});

			// 				let fileContainer = document.querySelector(".col-lg-16");
			// 				let newFileBox = document.createElement("div");
			// 				const allowedTypes = ["pdf", "xls", "xlsx", "doc", "docx"];
							
			// 				if (allowedTypes.includes(file.name.split('.').pop().toLowerCase())) {
			// 					newFileBox.className = "file-box";
			// 					newFileBox.innerHTML = `
			// 						<div class="file">
			// 							<a href="#" class="open-spreadsheet" data-file-url="${file_url}" data-name="${response.message.name}">
			// 								<span class="corner"></span>
			// 								<div class="file-body">
			// 									<svg class="icon" style="width: 71px; height: 75px" aria-hidden="true">
			// 										<use href="#icon-file-large"></use>
			// 									</svg>
			// 								</div>
			// 								<div class="file-name">
			// 									${response.message.file_name}
			// 									<br>
			// 									<small>Just now</small>
			// 								</div>
			// 							</a>
			// 						</div>`;
			// 				} else {
			// 					newFileBox.className = "file-box";
			// 					newFileBox.innerHTML = `
			// 						<div class="file">
			// 							<div class="file-header">
			// 								<input class="level-item checkbox hidden-xs" type="checkbox" data-file-id="${file_id}" data-docname="${response.message.name}">
			// 							</div>
			// 							<a href="#" class="image-preview" data-file-url="${file_url}" data-file-id="${file_id}">
			// 								<span class="corner"></span>
			// 								<div class="image">
			// 									<img alt="image" class="img-responsive" src="${file_url}">
			// 								</div>
			// 								<div class="file-name">
			// 									${response.message.file_name}
			// 									<br>
			// 									<small>Just now</small>
			// 								</div>
			// 							</a>
			// 						</div>`;
			// 				}
			// 				fileContainer.prepend(newFileBox);
			// 			} else {
			// 				console.error("Upload failed:", xhr.statusText);
			// 				frappe.msgprint(__("Error uploading file: {0}", [xhr.statusText]));
			// 			}
			// 		};
					
			// 		xhr.onerror = function() {
			// 			console.error("Upload failed:", xhr.statusText);
			// 			frappe.msgprint(__("Error uploading file"));
			// 		};
					
			// 		xhr.send(form_data);
			// 		console.log("Uploading file:", file.name);
			// 	};
				
			// 	file_input.click();
			// });

			

			this.page.add_action_item(__(' <i class="fa fa-plus"></i> New Folder'), function () {
				// frappe.msgprint("Create New folder");
				frappe.prompt(
					__("Name"),
					(values) => {
						if (values.value.includes("/")) {
							create_new_folder
							frappe.throw(__("Folder name should not include '/' (slash)"));
						}

						const data = {
							file_name: values.value,
							folder: self.current_folder || "Home", // Default folder
						};

						frappe.call({
							method: "frappe.core.api.file.create_new_folder",
							args: data,
							callback: function (response) {
								if ("response", response.message) {

									let fileContainer = document.querySelector(".col-lg-16"); // Adjust selector as needed
									let newFileBox = document.createElement("div");
									newFileBox.className = "file-box";
									newFileBox.innerHTML = `
										<div class="file">
										<a href="#" class="open-folder" data-folder-name="${values.value}">
											<span class="corner"></span>
												<div class="file-body">
													<svg class="icon" style="width: 71px; height: 75px" aria-hidden="true">
														<use href="#icon-folder-normal-large"></use>
													</svg>
									
													</div>
											<div class="file-name">
												${values.value}
												<br>
												<small>Added: Jan 22, 2014</small>
											</div>
										</a>
									</div>
									`;
									fileContainer.prepend(newFileBox);

									frappe.call({
										method: "frappe.client.insert",
										args: {
											doc: {
												doctype: "Drive Manager",
												file_name: values.value,
												attached_to_name: response.message.name,
												is_folder: 1,
												folder: self.current_folder || "Home",
												created_by: frappe.session.user,

												// add other fields if needed
											}
										},
										callback: function (res) {
											frappe.msgprint(__("Folder '{0}' created and saved in Drive Manager", [values.value]));
										}
									});

									frappe.msgprint(__("Folder '{0}' created successfully", [values.value]));
								}
							},
							error: function (err) {
								frappe.msgprint(__("Error creating folder: {0}", [err.message]));
							},
						});
					},
					__("Enter folder name"),
					__("Create")
				);
			});


		
		} else if (self.drive_access.upload_only == 1) {
			this.page.add_action_item(__('<i class="fa fa-file"></i> Upload File'), function () {
				var file_input = document.createElement("input");
				file_input.type = "file";
				// file_input.accept = "image/*";
				file_input.accept = ".pdf, .xls, .xlsx, .doc, .docx, .png, .jpg, .jpeg, .gif";
				console.log("current folder = ", self.current_folder);
				file_input.onchange = function () {
					var file = file_input.files[0];
					let folderName = self.current_folder; // ✅ Get from current_folder
					console.log("Uploading file to ...", folderName);
					// var reader = new FileReader();
					console.table(file);
					var xhr = new XMLHttpRequest();
					xhr.open("POST", "/api/method/upload_file", true);
					xhr.setRequestHeader("Accept", "application/json");
					xhr.setRequestHeader("X-Frappe-CSRF-Token", frappe.csrf_token);
					let form_data = new FormData();
					form_data.append("file", file, file.name);
					form_data.append("folder", folderName)
					xhr.send(form_data);
					console.log("success", file.name);

					xhr.onload = function () {
						if (xhr.status === 200) {
							console.table("File uploaded successfully:", xhr.responseText);
							let response = JSON.parse(xhr.responseText);
							let file_url = response.message.file_url;
							let file_type = response.message.file_type;

							frappe.call({
								method: "photos.my_drive.page.my_drive.my_drive.create_drive_files",
								args: { folder: folderName, filename: file.name, attached_to_name: response.message.name },
								callback: function (r) {
									if (r.message) {
										console.log("File added successfully:", r.message);
									}
								}
							});

							let fileContainer = document.querySelector(".col-lg-16"); // Adjust selector as needed
							let newFileBox = document.createElement("div");
							const allowedTypes = ["pdf", "xls", "xlsx", "doc", "docx"];
							if (allowedTypes.includes(file.name.split('.').pop().toLowerCase())) {
								newFileBox.className = "file-box";
								newFileBox.innerHTML = `
									<div class="file">
										<a href="#" class="open-spreadsheet"  data-file-url="${file.file_url}" data-name="${response.message.name}">
											<span class="corner"></span>
											<div class="file-body">
												<svg class="icon" style="width: 71px; height: 75px" aria-hidden="true">
													<use href="#icon-file-large"></use>
												</svg>
											</div>
											<div class="file-name">
												${file.name}
												<br>
												<small>Just now</small>
											</div>
										</a>
									</div>`
							} else {
								newFileBox.className = "file-box";
								newFileBox.innerHTML = `
									<div class="file">
										<a href="#" class="image-preview" data-file-url="${file_url}" data-name="${response.message.name}">
											<span class="corner"></span>
											<div class="image">
												<img alt="image" class="img-responsive" src="${file_url}">
											</div>
											<div class="file-name">
												${file.name}
												<br>
												<small>Just now</small>
											</div>
										</a>
									</div>`;
							}
							fileContainer.prepend(newFileBox);
						} else {
							console.error("Upload failed:", xhr.statusText);
						}
					};
				};
				file_input.click();
			});
		}
	}

	openShared() {
		let self = this;
		$(document).on("click", ".open-shared", function (event) {
			event.preventDefault(); // ✅ stops browser from appending #

			self.current_folder = "shared";

			let base_url = window.location.pathname
			let newUrl = base_url.split("my-drive")[0] + "my-drive/" + self.current_folder;
			history.pushState({ folder: self.current_folder }, "", newUrl);

			self.page.set_title(__("Shared"));
			let fileDisplayArea = document.querySelector(".col-md-9 .ibox-content .col-lg-16");
			let firstElementChild = document.querySelector(".col-lg-16");
			fileDisplayArea.innerHTML = "";



			frappe.call({
				method: "photos.my_drive.page.my_drive.my_drive.get_shared_files",
				args: {
					user: frappe.session.user,
				},
				callback: (r) => {
					console.log("callback return Shared files response:", r.message);

					// Create the table structure once, outside the loop
					let add_ui = `
						<div class="table-responsive">
							<table class="table align-middle table-nowrap table-hover mb-0">
								<thead class="table-light">
									<tr>
									<th scope="col">Name</th>
									<th scope="col">Shared By</th>
									<th scope="col">Date</th>
									<th scope="col">Size</th>
									<th scope="col" colspan="2">Members</th>
									</tr>
								</thead>
								<tbody>
								</tbody>
							</table>
						</div>`

					firstElementChild.innerHTML = add_ui;
					let tbody = document.querySelector("tbody");

					// Now iterate through the array and add rows
					r.message.forEach((item) => {
						// console.log("responce",item);

						if (item && Object.keys(item).length > 0) {
							let permissions = item.user_permissions.map(p => ({
								file_id: p.drive_id,
								read: p.read,
								write: p.write,
								download: p.download,
								delete: p.delete,
								create: p.created_by
							}));

							this.permissions = permissions;

							// console.log("after update the Permissions:",this.permissions);

							let sizeInBytes = parseInt(item.size);  // Use item.size instead of r.message.size
							let readableSize = formatBytes(sizeInBytes);

							// Generate avatar HTML for members
							let avatarHTML = '';
							item.members_group.forEach(member => {
								// console.log("Member:", member);
								let initials = (member.first_name[0] + member.last_name[0]).toUpperCase();
								// console.log("Member initials:", initials);
								avatarHTML += `
									<div class="avatar1-group-item">
										<a href="javascript: void(0);" class="d-inline-block" title="${member.full_name}">
											<div class="avatar1-sm">
											<span class="avatar1-title rounded-circle bg-success text-white font-size-16">
												${initials}
											</span>
											</div>
										</a>
									</div>`;
							});
							// Add row to existing tbody
							if (item.is_folder) {
								// console.log("item is folder", item);
								tbody.innerHTML += `<tr>
									<td>
										<a href="javascript: void(0);"
											class="text-dark fw-medium open-folder"
											data-folder-name="${item.file_id}"
											data-drive-id="${item.drive_id}">
											<i class="mdi mdi-file-document font-size-16 align-middle text-primary me-2"></i> ${item.file_name}
										</a>
									</td>
									<td>${item.shared_by}</td>
									<td>${item.creation}</td>
									<td>${item.size}</td>
									<td>
										<div class="avatar1-group">
											${avatarHTML}
										</div>
									</td>
									<td>
										<div class="dropdown">
											<a class="font-size-16 text-muted" role="button" data-bs-toggle="dropdown" aria-haspopup="true">
												<i class="mdi mdi-dots-horizontal"></i>
											</a>
											<div class="dropdown-menu dropdown-menu-end">
												<a class="dropdown-item" href="#">Open</a>
												<a class="dropdown-item" href="#">Edit</a>
												<a class="dropdown-item" href="#">Rename</a>
												<div class="dropdown-divider"></div>
												<a class="dropdown-item" href="#">Remove</a>
											</div>
										</div>
									</td>
							</tr>`
							} else {
								if (item.file_type === "PDF") {
									tbody.innerHTML += `<tr>
									<td>
										<a href="javascript: void(0); "
											class="text-dark fw-medium open-pdf"
											data-file-url="${item.file_url}"
											data-drive-id="${item.drive_id}">
											<i class="mdi mdi-file-document font-size-16 align-middle text-primary me-2"></i> ${item.file_name}
										</a>
									</td>
									<td>${item.shared_by}</td>
									<td>${item.creation}</td>
									<td>${item.size}</td>
									<td>
										<div class="avatar1-group">
											${avatarHTML}
										</div>
									</td>
									<td>
										<div class="dropdown">
											<a class="font-size-16 text-muted" role="button" data-bs-toggle="dropdown" aria-haspopup="true">
												<i class="mdi mdi-dots-horizontal"></i>
											</a>
											<div class="dropdown-menu dropdown-menu-end">
												<a class="dropdown-item" href="#">Open</a>
												<a class="dropdown-item" href="#">Edit</a>
												<a class="dropdown-item" href="#">Rename</a>
												<div class="dropdown-divider"></div>
												<a class="dropdown-item" href="#">Remove</a>
											</div>
										</div>
									</td>
								</tr>`
								} else if (item.file_type === "XLSX") {
									tbody.innerHTML += `<tr>
									<td>
										<a href="javascript: void(0); "
											class="text-dark fw-medium open-spreadsheet"
											data-file-url="${item.file_url}"
											data-drive-id="${item.drive_id}">
											<i class="mdi mdi-file-document font-size-16 align-middle text-primary me-2"></i> ${item.file_name}
										</a>
									</td>
									<td>${item.shared_by}</td>
									<td>${item.creation}</td>
									<td>${item.size}</td>
									<td>
										<div class="avatar-group">
											${avatarHTML}
										</div>
									</td>
									<td>
										<div class="dropdown">
											<a class="font-size-16 text-muted" role="button" data-bs-toggle="dropdown" aria-haspopup="true">
												<i class="mdi mdi-dots-horizontal"></i>
											</a>
											<div class="dropdown-menu dropdown-menu-end">
												<a class="dropdown-item" href="#">Open</a>
												<a class="dropdown-item" href="#">Edit</a>
												<a class="dropdown-item" href="#">Rename</a>
												<div class="dropdown-divider"></div>
												<a class="dropdown-item" href="#">Remove</a>
											</div>
										</div>
									</td>
								</tr>`
								} else if (item.file_type === "png" || item.file_type === "jpg" || item.file_type === "jpeg") {
									tbody.innerHTML += `<tr>
									<td>
										<a href="javascript: void(0); "
											class="text-dark fw-medium image-preview"
											data-file-url="${item.file_url}"
											data-drive-id="${item.drive_id}">
											<i class="mdi mdi-file-document font-size-16 align-middle text-primary me-2"></i> ${item.file_name}
										</a>
									</td>
									<td>${item.shared_by}</td>
									<td>${item.creation}</td>
									<td>${item.size}</td>
									<td>
										<div class="avatar1-group">
											${avatarHTML}
										</div>
									</td>
									<td>
										<div class="dropdown">
											<a class="font-size-16 text-muted" role="button" data-bs-toggle="dropdown" aria-haspopup="true">
												<i class="mdi mdi-dots-horizontal"></i>
											</a>
											
											<div class="dropdown-menu dropdown-menu-end">
												<a class="dropdown-item" href="#">Open</a>
												<a class="dropdown-item" href="#">Edit</a>
												<a class="dropdown-item" href="#">Rename</a>
												<div class="dropdown-divider"></div>
												<a class="dropdown-item" href="#">Remove</a>
											</div>
										</div>
									</td>
								</tr>`
								} else {

									tbody.innerHTML += `<tr>
									<td>
										<a href="javascript: void(0); "
											class="text-dark fw-medium open-folder"
											data-folder-name="${item.file_id}">
											<i class="mdi mdi-file-document font-size-16 align-middle text-primary me-2"></i> ${item.file_name}
										</a>
									</td>
									<td>${item.creation}</td>
									<td>${item.size}</td>
									<td>
										<div class="avatar1-group">
											${avatarHTML}
										</div>
									</td>
									<td>
										<div class="dropdown">
											<a class="font-size-16 text-muted" role="button" data-bs-toggle="dropdown" aria-haspopup="true">
												<i class="mdi mdi-dots-horizontal"></i>
											</a>
											
											<div class="dropdown-menu dropdown-menu-end">
												<a class="dropdown-item" href="#">Open</a>
												<a class="dropdown-item" href="#">Edit</a>
												<a class="dropdown-item" href="#">Rename</a>
												<div class="dropdown-divider"></div>
												<a class="dropdown-item" href="#">Remove</a>
											</div>
										</div>
									</td>
								</tr>`

								}
							}
						}
					});

					// Handle empty case outside the loop
					if (r.message.length === 0 || r.message.every(item => !item || Object.keys(item).length === 0)) {
						// firstElementChild.innerHTML = `<p class="center">This folder is empty. Upload files here.</p>`;
						addEmptyState()
					}
					// r.message.forEach((item) => {
					// 	console.log(item);

					// 	if(item && Object.keys(item).length > 0){
					// 		let permissions = item.user_permissions.map(p => ({
					// 			file_id: p.drive_id,
					// 			read: p.read,
					// 			write: p.write,
					// 			download: p.download,
					// 			delete: p.delete,
					// 			create: p.created_by
					// 		}));

					// 		this.permissions = permissions;

					// 		console.log("after update the Permissions:",this.permissions);

					// 		let add_ui = `
					// 			<div class="table-responsive">
					// 				<table class="table align-middle table-nowrap table-hover mb-0">
					// 					<thead class="table-light">
					// 						<tr>
					// 						<th scope="col">Name</th>
					// 						<th scope="col">Date modified</th>
					// 						<th scope="col">Size</th>
					// 						<th scope="col" colspan="2">Members</th>
					// 						</tr>
					// 					</thead>
					// 					<tbody>

					// 					</tbody>
					// 				</table>
					// 			</div>`
					// 		firstElementChild.innerHTML = add_ui;
					// 		// fileDisplayArea.appendChild(add_ui);

					// 		let tbody = document.querySelector("tbody");
					// 		let sizeInBytes = parseInt(r.message.size);  // assuming file.size = "23334"
					// 		let readableSize = formatBytes(sizeInBytes);

					// 		console.log("Shared files data:", item);


					// 			// console.log("File data:", file);
					// 			let avatarHTML = '';
					// 			item.members_group.forEach(member => {
					// 			// Get initials (e.g., "PS")
					// 				let initials = (member.first_name[0] + member.last_name[0]).toUpperCase();


					// 				console.log("Member initials:", initials);

					// 				avatarHTML += `
					// 					<div class="avatar-group-item">
					// 					<a href="javascript: void(0);" class="d-inline-block" title="${member.full_name}">
					// 						<div class="avatar-sm">
					// 						<span class="avatar-title rounded-circle bg-success text-white font-size-16">
					// 							${initials}
					// 						</span>
					// 						</div>
					// 					</a>
					// 					</div>`;
					// 			});

					// 			tbody.innerHTML+=`<tr>
					// 				<td>
					// 					<a href="javascript: void(0);"
					// 						class="text-dark fw-medium image-preview"
					// 						data-file-url="${item.file_url}"
					// 						data-drive-id="${item.drive_id}">
					// 						<i class="mdi mdi-file-document font-size-16 align-middle text-primary me-2"></i> ${item.file_name}
					// 					</a>
					// 				</td>
					// 				<td>${item.creation}</td>
					// 				<td>${item.size}</td>
					// 				<td>
					// 					<div class="avatar-group">
					// 						${avatarHTML}
					// 					</div>
					// 				</td>
					// 				<td>
					// 					<div class="dropdown">
					// 						<a class="font-size-16 text-muted" role="button" data-bs-toggle="dropdown" aria-haspopup="true">
					// 							<i class="mdi mdi-dots-horizontal"></i>
					// 						</a>

					// 						<div class="dropdown-menu dropdown-menu-end">
					// 							<a class="dropdown-item" href="#">Open</a>
					// 							<a class="dropdown-item" href="#">Edit</a>
					// 							<a class="dropdown-item" href="#">Rename</a>
					// 							<div class="dropdown-divider"></div>
					// 							<a class="dropdown-item" href="#">Remove</a>
					// 						</div>
					// 					</div>
					// 				</td>
					// 			</tr>`
					// 	}else {
					// 		fileDisplayArea.innerHTML = `<p class="center">This folder is empty. Upload files here.</p>`;
					// 	}
					// });
				}
			})

			if (folderName !== "Home") {
				self.page.get_inner_group_button(__('Back')).toggle(true);
			} else {
				self.page.get_inner_group_button(__('Back')).toggle(false);
			}

			// frappe.call({
			// 	method: "photos.my_drive.page.my_drive.my_drive.get_shared_contents",
			// 	args: { folder_name: folderName, owner: frappe.session.user },
			// 	callback: function (r) {``
			// 		if (r.message) {
			// 			// console.log(`Folder ${folderName} Opened: with permissions${r.message.files}`);

			// 			// let permissions = r.message.files.map(file => ({
			// 			// 	filename: file.file_id,
			// 			// 	read: file.read,
			// 			// 	write: file.write,
			// 			// 	download: file.download,
			// 			// 	delete: file.delete_file,
			// 			// 	create: frappe.session.user === file.created_by ? 1 : 0
			// 			// }));

			// 			let permissions = r.message.files.map(file => {
			// 				// Check if user is not creator AND all permissions are null
			// 				if (frappe.session.user !== file.created_by && file.read === null && file.write === null && file.delete_file === null && file.download === null) {

			// 					// Get parent folder permissions
			// 					// You need to store parent folder permissions somewhere
			// 					// This assumes you have a self.folderPermissions object available
			// 					// console.log(`file - ${file.file_id} No files permissions found getting parent permission,${r.message.parent_folder_permission}`);

			// 					const isCreator = frappe.session.user === file.created_by;

			// 					// self.ParentfolderPermissions = r.message.parent_folder_permission

			// 					const ParentfolderPermissions = r.message.parent_folder_permission

			// 					const getpermissions =  ParentfolderPermissions.map(per=>{
			// 						console.log(per.write);
			// 							return {
			// 								filename: file.file_id,
			// 								read: per.read || 0,
			// 								write: per.write || 0,
			// 								download: per.download || 0,
			// 								delete: per.delete_file || 0,
			// 								create: isCreator
			// 							};
			// 					})

			// 					console.log("getpermission",getpermissions);

			// 					return getpermissions[0]
			// 					// return {
			// 					// 	filename: file.file_id,
			// 					// 	// Inherit from parent folder permissions if available, otherwise set to 0
			// 					// 	read: 1,
			// 					// 	write: 1,
			// 					// 	download:  0,
			// 					// 	delete_file: 0,
			// 					// 	create: 0 // User is not the creator
			// 					// };
			// 				} else {
			// 					// Use existing file permissions
			// 					return {
			// 						filename: file.file_id,
			// 						read: file.read,
			// 						write: file.write,
			// 						download: file.download,
			// 						delete_file: file.delete_file,
			// 						create: frappe.session.user === file.created_by ? 1 : 0
			// 					};
			// 				}
			// 			});

			// 			self.permissions = permissions

			// 			console.log("Permissions set to",self.permissions)

			// 			let files = r.message.files;
			// 			let fileDisplayArea = document.querySelector(".col-md-9 .ibox-content .col-lg-16");
			// 			fileDisplayArea.innerHTML = "";

			// 			console.log(files);

			// 			if (files.length === 0) {
			// 				fileDisplayArea.innerHTML = "<p>This folder is empty. Upload files here.</p>";
			// 			} else {
			// 				files.forEach(file => {
			// 					if (file.is_folder) {
			// 						console.log("if part its a folder");
			// 						console.log(file);
			// 						let fileElement = document.createElement("div");
			// 						fileElement.classList.add("file-box");
			// 						fileElement.innerHTML = `
			// 							<div class="file">
			// 							<a href="#" class="open-folder" data-folder-name="${file.file_id}">
			// 								<span class="corner"></span>
			// 									<div class="file-body">
			// 										<svg class="icon" style="width: 71px; height: 75px" aria-hidden="true">
			// 											<use href="#icon-folder-normal-large"></use>
			// 										</svg>
			// 									</div>
			// 								<div class="file-name">
			// 									${file.file_name}
			// 									<br>
			// 									<small>${file.creation}</small>
			// 								</div>
			// 							</a>
			// 						</div>
			// 						`;
			// 						fileDisplayArea.appendChild(fileElement);
			// 					} else {
			// 						console.log("else part its a file");
			// 						console.log(file.file_url);
			// 						let fileElement = document.createElement("div");
			// 						fileElement.classList.add("file-box");
			// 						fileElement.innerHTML = `
			// 							<div class="file">
			// 								<a href="#" class="image-preview" data-file-url="${file.file_url}" data-name=${file.file_id}>
			// 									<span class="corner"></span>
			// 									<div class="image">
			// 										<img alt="image" class="img-responsive" src=${file.file_url}>
			// 									</div>
			// 									<div class="file-name">
			// 										${file.file_name}
			// 										<br>
			// 										<small>${file.creation}</small>
			// 									</div>
			// 								</a>
			// 							</div>
			// 						`;
			// 						fileDisplayArea.appendChild(fileElement);
			// 					}
			// 				});
			// 			}
			// 		}
			// 	}
			// });

		})

	}

	openDocuments() {
		let self = this;
		$(document).on("click", ".open-documents", function (event) {
			event.preventDefault();  // ✅ stops browser from appending #
			self.current_folder = "documents";
			self.page.set_title(__("Documents"));
			console.log("clicked open documents");

			let base_url = window.location.pathname
			let newUrl = base_url.split("my-drive")[0] + "my-drive/" + self.current_folder;
			history.pushState({ folder: self.current_folder }, "", newUrl);


			frappe.call({
				method: "photos.my_drive.page.my_drive.my_drive.get_documents_files",
				args: { owner: frappe.session.user },
				callback: function (r) {
					if (r.message) {
						let permissions = r.message.files.map(file => {
							if (frappe.session.user !== file.created_by && file.read === null && file.write === null && file.delete_file === null && file.download === null) {

								const isCreator = frappe.session.user === file.created_by;
								const ParentfolderPermissions = r.message.parent_folder_permission

								const getpermissions = ParentfolderPermissions.map(per => {
									console.log(per.write);
									return {
										filename: file.file_id,
										read: per.read || 0,
										write: per.write || 0,
										download: per.download || 0,
										delete: per.delete_file || 0,
										create: isCreator
									};
								})
								return getpermissions[0]

							} else {
								// Use existing file permissions
								return {
									filename: file.file_id,
									read: file.read,
									write: file.write,
									download: file.download,
									delete: file.delete_file,
									create: frappe.session.user === file.created_by ? 1 : 0
								};
							}
						});
						self.permissions = permissions
						let files = r.message.files;
						let fileDisplayArea = document.querySelector(".col-md-9 .ibox-content .col-lg-16");
						fileDisplayArea.innerHTML = "";

						if (files.length === 0) {
							addEmptyState()
							// fileDisplayArea.innerHTML = `<p class="center">This folder is empty. Upload files here.</p>`;
						} else {
							files.forEach(file => {
								console.log("documents files", file);
								// let fileElement = document.createElement("div");
								// fileElement.classList.add("file-box");
								// fileElement.innerHTML = `
								// 	<div class="file">
								// 		<a href="#" class="image-preview" data-file-url="${file.file_url}" data-drive-id=${file.name}>
								// 			<span class="corner"></span>
								// 			<div class="image">
								// 				<img alt="image" class="img-responsive" src=${file.file_url}>
								// 			</div>
								// 			<div class="file-name">
								// 				${file.filename}
								// 				<br>
								// 				<small>${file.creation}</small>
								// 			</div>
								// 		</a>
								// 	</div>
								// `;

								let fileElement = document.createElement("div");
								fileElement.classList.add("file-box");

								if (file.file_type === "PDF") {

									fileElement.innerHTML = `
									<div class="file">
										<div class="file-header">
											<input class="level-item checkbox hidden-xs" type="checkbox" data-file-id=${file.file_id} data-docname=${file.drive_id}>
										</div>
										<a href="#" class="open-pdf" data-file-url="${file.file_url}" data-name=${file.file_id}>
											<span class="corner"></span>

											<div class="file-body">
												<img alt="File Icon" style="width: 77px; height: 90px" class="icon" src="/files/file.png">
											</div>
											<div class="file-name">
												${file.filename}
												<br>
												<small>${file.creation}</small>
											</div>
										</a>
									</div>`
									fileDisplayArea.appendChild(fileElement);

								} else if (file.file_type === "XLSX" || file.file_type === "XLS") {
									fileElement.innerHTML = `
										<div class="file">
											<div class="file-header">
												<input class="level-item checkbox hidden-xs" type="checkbox" data-file-id=${file.file_id} data-docname=${file.drive_id}>
											</div>
											<a href="#" class="open-spreadsheet" data-file-url="${file.file_url}" data-name=${file.file_id}>
												<span class="corner"></span>
												<div class="file-body">
													<img alt="File Icon" style="width: 77px; height: 90px" class="icon" src="/files/file.png">
												</div>
												<div class="file-name">
													${file.filename}
													<br>
													<small>${file.creation}</small>
												</div>
											</a>
										</div>`
									fileDisplayArea.appendChild(fileElement);
								}

							});
						}
					}
				}
			});
		})

	}

	openMedia() {
		let self = this;
		$(document).on("click", ".open-media", function (event) {
			event.preventDefault();  // ✅ stops browser from appending #
			self.current_folder = "media";
			self.page.set_title(__("Media"));

			let base_url = window.location.pathname

			console.log("base_url -", base_url, ", splited base_url - ", base_url.split("media")[0]);
			let newUrl = base_url.split("my-drive")[0] + "my-drive/" + self.current_folder;
			newUrl = newUrl.split('#')[0];
			console.log("openMdia newUrl ", newUrl, "current folder is", self.current_folder);
			history.pushState({ folder: self.current_folder }, "", newUrl);


			frappe.call({
				method: "photos.my_drive.page.my_drive.my_drive.get_media_files",
				args: { owner: frappe.session.user },
				callback: function (r) {
					if (r.message) {
						// console.log("media files response", r.message.files);
						let permissions = r.message.files.map(file => {
							if (file.created_by !== frappe.session.user) {
								console.log("user not same ");

								const isCreator = frappe.session.user === file.created_by;

								const getpermissions = r.message.files.map(per => {
									// console.log(file);
									return {
										drive_id: file.drive_id,
										file_id: file.file_id,
										read: per.read || 0,
										write: per.write || 0,
										download: per.download || 0,
										delete: per.delete_file || 0,
										create: isCreator
									};
								})
								console.log("getpermissions", getpermissions);
								return getpermissions[0]

							} else {
								// Use existing file permissions
								return {
									drive_id: file.drive_id,
									file_id: file.file_id,
									read: file.read,
									write: file.write,
									download: file.download,
									delete: file.delete_file,
									create: frappe.session.user === file.created_by ? 1 : 0
								};
							}
						});
						self.permissions = permissions
						console.log("media permissions", self.permissions);
						let files = r.message.files;
						let fileDisplayArea = document.querySelector(".col-md-9 .ibox-content .col-lg-16");
						fileDisplayArea.innerHTML = "";

						if (files.length === 0) {
							addEmptyState()
							// fileDisplayArea.innerHTML = `<p class="center">This folder is empty. Upload files here.</p>`;
						} else {
							files.forEach(file => {
								// console.log("media files", file.file_id);
								let fileElement = document.createElement("div");
								fileElement.classList.add("file-box");
								fileElement.innerHTML = `
									<div class="file">
										<div class="file-header">
												<input class="level-item checkbox hidden-xs" type="checkbox" data-file-id="${file.file_id}" data-docname="${file.drive_id}">
										</div>
										<a href="#" class="image-preview" data-file-url="${file.file_url}" data-file-id="${file.file_id}">
											<span class="corner"></span>
											<div class="image">
												<img alt="image" class="img-responsive" src="${file.file_url}">
											</div>
											<div class="file-name">
												${file.filename}
												<br>
												<small>${file.creation}</small>
											</div>
										</a>
									</div>
								`;
								fileDisplayArea.appendChild(fileElement);

							});
						}
					}
				}
			});

		})

	}

	openFolder() {
		console.log("openFolder Started");
		this.goFolders();
		let self = this;
		// Use event delegation - attach one listener to a parent element
		$(document).off("click", ".open-folder").on("click", ".open-folder", function (event) {
			event.preventDefault();  // Prevent default behavior
			$('.ellipsis').show();
			let folderName = $(this).data("folder-name");
			console.log("openingFolder()=>", folderName);
			console.log("data-folder-name", folderName);
			self.current_folder = folderName
			console.log("current_folder", self.current_folder);
			self.page.set_title(__(folderName));
			self.current_folder = folderName; // Store the current folder name

			let base_url = window.location.pathname

			console.log("base_url", base_url);


			let newUrl = base_url.split("my-drive")[0] + "my-drive/" + folderName;

			console.log("openFolder newUrl ", newUrl);
			history.pushState({ folder: folderName }, "", newUrl);
			console.log("openFolder pushed url", newUrl);

			if (!self.backButtonAdded) {
				self.page.add_inner_button(__('Back'), () => {
					console.log("Back button clicked");
					// self.page.get_inner_group_button(__('Back')).hide();
					self.goBack();
				});
				self.backButtonAdded = true;
			}

			frappe.call({
				method: "photos.my_drive.page.my_drive.my_drive.get_folder_contents",
				args: { folder_name: folderName, owner: frappe.session.user },
				callback: function (r) {
					if (r.message) {
						// console.log(`Folder ${folderName} Opened: with permissions${r.message.files}`);

						let permissions = r.message.files.map(file => {
							// Check if user is not creator AND all permissions are null
							if (frappe.session.user !== file.created_by && file.read === null && file.write === null && file.delete_file === null && file.download === null) {

								// Get parent folder permissions
								// You need to store parent folder permissions somewhere
								// This assumes you have a self.folderPermissions object available
								// console.log(`file - ${file.file_id} No files permissions found getting parent permission,${r.message.parent_folder_permission}`);

								const isCreator = frappe.session.user === file.created_by;

								// self.ParentfolderPermissions = r.message.parent_folder_permission

								const ParentfolderPermissions = r.message.parent_folder_permission

								const getpermissions = ParentfolderPermissions.map(per => {
									console.log(per.write);
									return {
										file_id: file.file_id,
										drive_id: file.drive_id,
										read: per.read || 0,
										write: per.write || 0,
										download: per.download || 0,
										delete: per.delete_file || 0,
										create: isCreator
									};
								})
								return getpermissions[0]

							} else {
								// Use existing file permissions
								return {
									file_id: file.file_id,
									drive_id: file.drive_id,
									read: file.read,
									write: file.write,
									download: file.download,
									delete_file: file.delete_file,
									create: frappe.session.user === file.created_by ? 1 : 0
								};
							}
						});

						self.permissions = permissions

						// console.log("Permissions set to",self.permissions)



						let files = r.message.files;
						let fileDisplayArea = document.querySelector(".col-md-9 .ibox-content .col-lg-16");
						fileDisplayArea.innerHTML = "";

						// console.log(files);

						if (files.length === 0) {
							addEmptyState()
							// fileDisplayArea.innerHTML = `<p class="center">This folder is empty. Upload files here.</p>`;
						} else {
							files.forEach(file => {
								if (file.is_folder) {
									console.log("if part its a folder");
									let fileElement = document.createElement("div");
									fileElement.classList.add("file-box");
									fileElement.innerHTML = `
										<div class="file">
										<div class="file-header">
                                                <input class="level-item checkbox hidden-xs" type="checkbox" data-file-id=${file.file_id} data-docname=${file.drive_id}>
                                        </div>
										<a href="#" class="open-folder" data-folder-name="${file.file_id}">
											<span class="corner"></span>
												<div class="file-body">
													<svg class="icon" style="width: 71px; height: 75px" aria-hidden="true">
														<use href="#icon-folder-normal-large"></use>
													</svg>
												</div>
											<div class="file-name">
												${file.file_name}
												<br>
												<small>${file.creation}</small>
											</div>
										</a>
									</div>
									`;
									fileDisplayArea.appendChild(fileElement);
								} else {
									if (file.file_type === "XLSX" || file.file_type === "XLS" || file.file_type === "CSV") {
										let fileElement = document.createElement("div");
										fileElement.classList.add("file-box");
										fileElement.innerHTML = `
												<div class="file">
													<div class="file-header">
															<input class="level-item checkbox hidden-xs" type="checkbox" data-file-id=${file.file_id} data-docname=${file.drive_id}>
													</div>
													<a href="#" class="open-spreadsheet" data-file-url="${file.file_url}" data-file-id=${file.file_id}>
														<span class="corner"></span>
														
														<div class="file-body">
                                                        	<img alt="File Icon" style="width: 75px; height: 90px" class="icon" src="/files/xls.png">
                                                		</div>
														<div class="file-name">
															${file.file_name}
															<br>
															<small>${file.creation}</small>
														</div>
													</a>
												</div>
											`;
										fileDisplayArea.appendChild(fileElement);
									} else if (file.file_type === "PDF") {
										let fileElement = document.createElement("div");
										fileElement.classList.add("file-box");
										fileElement.innerHTML = `
												<div class="file">
													<div class="file-header">
														<input class="level-item checkbox hidden-xs" type="checkbox" data-file-id=${file.file_id} data-docname=${file.drive_id}>
													</div>
													<a href="#" class="open-pdf" data-file-url="${file.file_url}" data-file-id=${file.file_id}>
														<span class="corner"></span>

														<div class="file-body">
															<img alt="File Icon" style="width: 77px; height: 90px" class="icon" src="/files/file.png">
														</div>
														<div class="file-name">
															${file.file_name}
															<br>
															<small>${file.creation}</small>
														</div>
													</a>
												</div>
											`;
										fileDisplayArea.appendChild(fileElement);
									} else {
										console.log("else part in open folder and image file id", file.file_id);
										let fileElement = document.createElement("div");
										fileElement.classList.add("file-box");
										fileElement.innerHTML = `
											<div class="file">
												<div class="file-header">
													<input class="level-item checkbox hidden-xs" type="checkbox" data-file-id=${file.file_id} data-docname=${file.drive_id}>
												</div>
												<a href="#" class="image-preview" data-file-url="${file.file_url}" data-file-id=${file.file_id} data-drive-id=${file.drive_id} data-tags="${file.persons}">
													<span class="corner"></span>
													<div class="image">
														<img alt="image" class="img-responsive" src=${file.file_url}>
													</div>
													<div class="file-name">
														${file.file_name}
														<br>
														<small>${file.creation}</small>
													</div>
												</a>
											</div>
											`;
										fileDisplayArea.appendChild(fileElement);
									}
								}
							});
						}
					}
				}
			});
			console.log("openFolder ENDS HERE...");

		});
	}

	imagePreview() {
		let self = this
		console.log("Permissions before click image preview", this.permissions);
		$(document).off("click", ".image-preview").on("click", ".image-preview", function (event) {
			event.preventDefault();
			let file_url = $(this).data("file-url");
			let drive_id = $(this).data("drive-id");
			let file_id = $(this).data("file-id");
			let tags = $(this).data("tags");

			console.log("file_url", file_url);
			console.log("drive_id", drive_id);
			console.log("file_id", file_id);
			console.log("tags", tags);


			let tag_list = [];
			let tag_html = ''

			let filename = $(this).find(".file-name").contents().first().text().trim();
			let creation_date = $(this).find("small").text().trim();
			let fileType = file_url.split('.').pop().toUpperCase() || "Unknown type";



			if(tags){
				tag_list = tags.split(",")
				console.log("tag_list :", tag_list);
				
			}


			if (tag_list.length > 0) {
				// Create a container for tags with proper styling
				tag_html = `<div class="tag-container" style="margin-top: 8px;">
					<div class="tag-wrapper" style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">`

				tag_list.forEach((tag, index) => {
					console.log("tag", tag, "index", index);
					tag_html += `
						<span class="tag-pill2" style="
							display: inline-flex;
							align-items: center;
							background-color: var(--dark-green-avatar-bg, #e8f5e8);
							color: var(--dark-green-avatar-color, #2d5a2d);
							padding: 4px 8px;
							border-radius: 12px;
							font-size: 12px;
							font-weight: 500;
							border: 1px solid var(--border-color, #d1d5db);
							max-width: 120px;
						">
							<span class="tag-label" style="
								white-space: nowrap;
							">${tag}</span>
							<span class="tag-remove" style="
								margin-left: 6px;
								cursor: pointer;
								opacity: 0.7;
								transition: opacity 0.2s;
								display: flex;
								align-items: center;
							" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
								<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<line x1="18" y1="6" x2="6" y2="18"></line>
									<line x1="6" y1="6" x2="18" y2="18"></line>
								</svg>
							</span>
						</span>
					`
				})

				tag_html += `
					</div>
				</div>`
			} else {
				console.log("taglist is empty");
			}


			

			self.permissions.forEach(permission => {
				console.log("permission.file_id", permission.file_id, "file_id", file_id);
				if (permission.file_id === file_id) {
					console.log("Mtached file_id:", file_id);
					console.log("Permission details:", permission);
				} else {
					console.log("No permission found for file_id:", file_id);
				}

			});
			let userPermission = self.permissions.find(permission => permission.file_id === file_id);

			console.log("create", userPermission.create, "read", userPermission.read, "write", userPermission.write, "delete", userPermission.delete, "download", userPermission.download);
			if (!userPermission.create && !userPermission.read && !userPermission.write) {
				console.log("create", userPermission.create, ".read", userPermission.read, "write", userPermission.write, "delete", userPermission.delete, "download", userPermission.download);
				frappe.msgprint("You do not have permission to view this file");
				return; // Stop execution if no permission
			}

			
			

			let d = new frappe.ui.Dialog({
				title: "Image Preview",
				size: "large",
				fields: [
					{
						fieldtype: "HTML",
						fieldname: "image_preview",
					}
				],
				primary_action_label: "Download",
				primary_action: function () {
					let a = document.createElement("a");
					a.href = file_url;
					a.download = file_url.split("/").pop();
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
				}
			});

			d.show();

			setTimeout(function () {
				const footerElement = d.$wrapper.find('.modal-footer');
				if (footerElement.length) {
					footerElement.prepend(`
						<div class="image-details-container" style="
							margin-right: auto; 
							flex-grow: 1; 
							padding: 10px 15px;
							max-width: 70%;">

							<!-- Dropdown Toggle Button -->
							<button class="details-toggle" style="
								background: none;
								border: none;
								padding: 0;
								font-size: 14px;
								font-weight: 500;
								color: var(--text-color, #333);
								cursor: pointer;
								display: flex;
								align-items: center;
								gap: 6px;
								transition: color 0.2s;
							"onclick="toggleImageDetails(this)">
								<svg class="dropdown-arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="
									transition: transform 0.2s ease;">
									<polyline points="6,9 12,15 18,9"></polyline>
								</svg>
								<span>Show Details</span>
							</button>

							<div class="image-details" style="text-align: left; max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out, padding 0.3s ease-out; padding: 0;">
								<div style="padding-top: 10px;">
									<div style="margin-bottom: 4px;">
										<strong>File Name:</strong> ${filename || file_id}
									</div>
									${creation_date ? `<div style="margin-bottom: 4px;"><strong>Created:</strong> ${creation_date}</div>` : ''}
									${tag_list.length > 0 ? `<div style="margin-bottom: 4px; display: flex; flex-wrap: wrap; align-items: center; gap: 0;"><strong style="margin-right: 8px;">Tags:</strong>${tag_html}</div>` : ''}
								</div>
							</div>
						</div>
					`);

					// Make the footer a flex container to align items properly
					footerElement.css({
						'display': 'flex',
						'align-items': 'flex-start',
						'justify-content': 'space-between'
					});
				}

				const modelHeader = d.$wrapper.find('.modal-header');
				modelHeader.css({
					'padding': 'bottom: 5px'
				});


			}, 100);

			// Toggle function for dropdown
			window.toggleImageDetails = function (button) {
				const detailsDiv = button.nextElementSibling;
				const arrow = button.querySelector('.dropdown-arrow');
				const buttonText = button.querySelector('span');

				if (detailsDiv.style.maxHeight === '0px' || detailsDiv.style.maxHeight === '') {
					// Open dropdown
					detailsDiv.style.maxHeight = '500px'; // Adjust based on your content
					detailsDiv.style.padding = '0';
					arrow.style.transform = 'rotate(180deg)';
					buttonText.textContent = 'Hide Details';
				} else {
					// Close dropdown
					detailsDiv.style.maxHeight = '0px';
					detailsDiv.style.padding = '0';
					arrow.style.transform = 'rotate(0deg)';
					buttonText.textContent = 'Show Details';
				}
			};

			// Optional: Add click handler for tag removal
			$(document).on('click', '.tag-remove', function (e) {
				e.stopPropagation();
				const tagElement = $(this).closest('.tag-pill');
				const tagName = tagElement.find('.tag-label').text();

				// Add your tag removal logic here
				console.log('Removing tag:', tagName);

				// Remove the tag element with animation
				tagElement.fadeOut(200, function () {
					$(this).remove();
				});
			});



			// let d = new frappe.ui.Dialog({
			// 	title: tag_html1,
			// 	size: "large",
			// 	fields: [
			// 		{
			// 			fieldtype: "HTML",
			// 			fieldname: "image_preview",
			// 		}
			// 	],
			// 	primary_action_label: "Download",
			// 	primary_action: function () {
			// 		// window.open(file_url, "_blank"); 
			// 		let a = document.createElement("a");
			// 		a.href = file_url;
			// 		a.download = file_url.split("/").pop(); // Extracts the filename from URL
			// 		document.body.appendChild(a);
			// 		a.click();
			// 		document.body.removeChild(a);
			// 	}
			// });
			if (userPermission.delete || userPermission.create) {
				d.set_secondary_action_label("Delete");
				d.set_secondary_action(function () {
					frappe.confirm("Are you sure you want to delete this file?", function () {
						frappe.call({
							method: "photos.my_drive.page.my_drive.my_drive.delete_items",
							args: { doctype: "File", name: drive_id },
							callback: function (r) {
								console.log("r.message", r.message);
								if (r.message.status === "Success") {
									d.hide(); // Close dialog after deletion
									$(`.image-preview[data-drive-id="${drive_id}"]`).closest(".file-box").remove();

									frappe.show_alert({
										message: "File deleted successfully.",
										indicator: "green"
									});
									// $(`.image-preview[data-name="${file_name}"]`).closest(".file-box").fadeOut(300, function() {
									// 	$(this).remove();
									// });
								} else {
									frappe.msgprint("Error deleting file.");
								}
							}
						});
					});
				});
			} else {
				d.get_secondary_btn().addClass("hide");
				console.log("delete hide");
			}

			if (!userPermission.create && !userPermission.download) {
				d.get_primary_btn().addClass("hide");
				console.log("download hide ");
			}

			d.$wrapper.find('.preview-image').css({
				"max-width": "100%",
				"height": "auto",
				"padding-left": "30px",
				"align-items": "center",
				"justify-content": "center"
			});
			d.set_values({
				image_preview: `<div class="image-container">
					<img src="${file_url}" class="preview-image">
				</div>`
			});

			$(document).on('click', '.tag-remove', function (e) {
				e.stopPropagation();
				const tagElement = $(this).closest('.tag-pill');
				const tagName = tagElement.find('.tag-label').text();

				// Add your tag removal logic here
				console.log('Removing tag:', tagName);

				// Remove the tag element with animation
				tagElement.fadeOut(200, function () {
					$(this).remove();
				});
			});

		});



	}

	PDFpreview() {
		let self = this
		$(document).on("click", ".open-pdf", function (event) {
			event.preventDefault();

			let file_url = $(this).data("file-url");
			let filename = $(this).data("name");
			let file_ext = file_url.split('.').pop().toLowerCase();

			if (file_ext === "pdf") {
				console.log(file_ext);
				// Only show preview for PDF (you can add others later if needed)
				// self.previewFile(file_url, file_ext);
				self.filpviewPDF(file_url, file_ext);
			} else {
				// Open or download for XLS, CSV, etc.
				// window.open(file_url, "_blank");
			}
		});
	}

	filpviewPDF(file_url, file_type) {
		let self = this;
		let $preview = "";
		file_type = file_type.toLowerCase();

		console.log("file_url", file_url);

		if (file_type === "pdf") {
			// Create hidden magazine structure
			$('.page-container').append(`
				<div class="magazine-viewport" style="display: none;">
					<div class="container">
						<div class="magazine">
							<div class="thumbnails">
								<div><ul id="thumbnail-list"></ul></div>
							</div>
							<div ignore="1" class="next-button"></div>
							<div ignore="1" class="previous-button"></div>
						</div>
					</div>
				</div>
			`);

			$(".col-md-3").html("");
			$(".col-md-9").html("");
			$(".col-lg-16").html("");

			$('.magazine').html('');

			// Add loading spinner CSS and HTML
			const loadingSpinnerCSS = `
				<style id="pdf-loading-styles">
					.pdf-loading-overlay {
						position: fixed;
						top: 0;
						left: 0;
						width: 100%;
						height: 100%;
						background-color: rgba(0, 0, 0, 0.7);
						display: flex;
						justify-content: center;
						align-items: center;
						z-index: 9999;
						flex-direction: column;
					}
					
					.pdf-loading-spinner {
						width: 60px;
						height: 60px;
						border: 6px solid #f3f3f3;
						border-top: 6px solid #3498db;
						border-radius: 50%;
						animation: pdf-spin 1s linear infinite;
						margin-bottom: 20px;
					}
					
					@keyframes pdf-spin {
						0% { transform: rotate(0deg); }
						100% { transform: rotate(360deg); }
					}
					
					.pdf-loading-text {
						color: white;
						font-size: 18px;
						font-weight: bold;
						text-align: center;
					}
					
					.pdf-loading-progress {
						color: #3498db;
						font-size: 14px;
						margin-top: 10px;
					}
					.navbar-expand{
						display: none !important;
					}
				</style>
			`;

			// Add CSS to head if not already added
			if (!$('#pdf-loading-styles').length) {
				$('head').append(loadingSpinnerCSS);
			}

			// Add loading overlay
			const loadingOverlay = `
				<div class="pdf-loading-overlay" id="pdf-loading-overlay">
					<div class="pdf-loading-spinner"></div>
					<div class="pdf-loading-text">Loading PDF...</div>
					<div class="pdf-loading-progress" id="pdf-loading-progress">Preparing document...</div>
				</div>
			`;

			$('body').append(loadingOverlay);

			frappe.require([
				"/assets/frappe_addons/js/flip_book/extras/jquery.min.1.7.js",
				"/assets/frappe_addons/js/flip_book/extras/modernizr.2.5.3.min.js",
				"/assets/frappe_addons/js/flip_book/extras/jquery.mousewheel.min.js",
				"/assets/frappe_addons/js/flip_book/lib/hash.js",
				"/assets/frappe_addons/js/flip_book/js/magazine.js",
				"/assets/frappe_addons/js/flip_book/lib/turn.min.js",
				"/assets/frappe_addons/js/flip_book/lib/zoom.min.js",
				"/assets/frappe_addons/js/flip_book/css/magazine.css",
				"assets/frappe_addons/js/flip_book/pdf_viewer/pdf.min.js",
				"assets/frappe_addons/js/flip_book/pdf_viewer/pdf_min.js",
				"assets/frappe_addons/js/flip_book/pdf_viewer/pdf_worker_min.js",
				"assets/frappe_addons/js/flip_book/pdf_viewer/jspdf_umd_min.js",
				'/assets/frappe_addons/js/pdf_viewer/pdf.js',
				'https://unpkg.com/pdf-lib@1.4.0/dist/pdf-lib.min.js'

			], async () => {
				try {

					if (!window.PDFLib) throw new Error("PDF-Lib failed to load");
					// if (typeof PDFViewer !== 'function') throw new Error("PDFViewer class not found");

					let { degrees, PDFDocument, rgb, StandardFonts } = window.PDFLib;

					// Generate a unique filename
					const original_filename = file_url.split("/").pop();
					const watermarked_filename = `watermarked_${frappe.session.user}_${original_filename}`;

					// Check if watermarked file already exists
					const existingUrl = await checkIfFileExists(watermarked_filename);
					let watermarkedUrl;

					if (existingUrl) {
						console.log("Reusing existing watermarked file:", existingUrl);
						watermarkedUrl = existingUrl;
					} else {
						// Fetch and watermark PDF
						const existingPdfBytes = await fetch(file_url).then(res => {
							if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.statusText}`);
							return res.arrayBuffer();
						});

						const pdfDoc = await PDFDocument.load(existingPdfBytes);
						const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

						const pages = pdfDoc.getPages();
						for (let i = 0; i < pages.length; i++) {
							const page = pages[i];
							const { width, height } = page.getSize();
							for (let x = 50; x < width; x += width / 2) {
								for (let y = 50; y < height; y += height / 2) {
									page.drawText(`Confidential - ${frappe.session.user}`, {
										x, y, size: 40, font,
										color: rgb(0.95, 0.1, 0.1),
										rotate: degrees(-30),
										opacity: 0.2,
									});
								}
							}
						}
						const pdfBytes = await pdfDoc.save();
						const blob = new Blob([pdfBytes], { type: "application/pdf" });

						// Upload once
						watermarkedUrl = await uploadModifiedPDF(blob, watermarked_filename);
						console.log("Uploaded new watermarked PDF:", watermarkedUrl);
					}



					const fullpdfpath = watermarkedUrl;
					console.log("Loading PDF from:", fullpdfpath);

					// Update loading text
					$('#pdf-loading-progress').text('Loading PDF document...');

					const pdf = await pdfjsLib.getDocument(fullpdfpath).promise;
					const numPages = pdf.numPages;
					window.imageFolderPath = file_url;
					console.log("globalpath", imageFolderPath);

					// Update progress
					$('#pdf-loading-progress').text(`Processing ${numPages} pages...`);

					// Destroy old zoom plugin completely
					if ($('.magazine-viewport').data('zoom')) {
						$('.magazine-viewport').off();
						$('.magazine-viewport').triggerHandler('zoomOut');
						$('.magazine-viewport').each(function () {
							$(this)[0].zoom = null;
						});
					}

					// Process pages with progress updates
					for (let i = 1; i <= numPages; i++) {
						// Update progress for each page
						$('#pdf-loading-progress').text(`Processing page ${i} of ${numPages}...`);

						const page = await pdf.getPage(i);
						const viewport = page.getViewport({ scale: 1.5 });
						const canvas = document.createElement('canvas');
						const context = canvas.getContext('2d');
						canvas.height = viewport.height;
						canvas.width = viewport.width;

						await page.render({ canvasContext: context, viewport: viewport }).promise;
						const imgData = canvas.toDataURL('image/jpeg');
						console.log(`Loaded page: ${i}`);
						let pageDiv = $(`<div><img src="${imgData}" style="width:100%; height:100%"/></div>`);
						$('.magazine').append(pageDiv);
					}

					// Update progress before initializing flipbook
					$('#pdf-loading-progress').text('Initializing flipbook...');

					$('.magazine').turn({
						width: 922,
						height: 600,
						elevation: 50,
						acceleration: !isChrome(),
						gradients: true,
						autoCenter: true,
						pages: numPages,
						when: {
							turning: function (event, page, view) {
								var book = $(this),
									currentPage = book.turn('page'),
									pages = book.turn('pages');

								window.currentBookPage = page;
								disableControls(page);
								$('.thumbnails .page-' + currentPage).
									parent().
									removeClass('current');

								$('.thumbnails .page-' + page).
									parent().
									addClass('current');
							},

							turned: function (event, page, view) {
								disableControls(page);
								$(this).turn('center');
								if (page == 1) {
									$(this).turn('peel', 'br');
								}
							},

							missing: function (event, pages) {
								for (var i = 0; i < pages.length; i++) {
									console.log("addpage function");
									addPage(pages[i], $(this));
								}
							}
						}
					});

					// Initialize zoom functionality
					$('.magazine-viewport').zoom({
						flipbook: $('.magazine'),
						max: function () {
							return largeMagazineWidth() / $('.magazine').width();
						},
						when: {
							tap: function (event) {
								if ($(this).zoom('value') == 1) {
									$('.magazine').
										removeClass('animated').
										addClass('zoom-in');
									$(this).zoom('zoomIn', event);
								} else {
									$(this).zoom('zoomOut');
								}
							},

							// resize: function(event, scale, page, pageElement) {
							// 	if (scale==1)
							// 		loadSmallPage(page, pageElement);
							// 	else
							// 		loadLargePage(page, pageElement);
							// },

							zoomIn: function () {
								$('.thumbnails').hide();
								$('.made').hide();
								$('.magazine').addClass('zoom-in');

								if (!window.escTip && !$.isTouch) {
									window.escTip = true;
									$('<div />', { 'class': 'esc' }).
										html('<div>Press ESC to exit</div>').
										appendTo($('body')).
										delay(2000).
										animate({ opacity: 0 }, 500, function () {
											$(this).remove();
										});
								}
							},

							zoomOut: function () {
								$('.esc').hide();
								$('.thumbnails').fadeIn();
								$('.made').fadeIn();

								setTimeout(function () {
									$('.magazine').addClass('animated').removeClass('zoom-in');
									resizeViewport();
								}, 0);
							},

							swipeLeft: function () {
								$('.magazine').turn('next');
							},

							swipeRight: function () {
								$('.magazine').turn('previous');
							}
						}
					});

					// Add all event listeners
					$(document).keydown(function (e) {
						var previous = 37, next = 39, esc = 27;
						switch (e.keyCode) {
							case previous:
								$('.magazine').turn('previous');
								e.preventDefault();
								break;
							case next:
								$('.magazine').turn('next');
								e.preventDefault();
								break;
							case esc:
								$('.magazine-viewport').zoom('zoomOut');
								e.preventDefault();
								break;
						}
					});

					Hash.on('^page\/([0-9]*)$', {
						yep: function (path, parts) {
							var page = parts[1];
							if (page !== undefined) {
								if ($('.magazine').turn('is'))
									$('.magazine').turn('page', page);
							}
						},
						nop: function (path) {
							if ($('.magazine').turn('is'))
								$('.magazine').turn('page', 1);
						}
					});

					$(window).resize(function () {
						resizeViewport();
					}).bind('orientationchange', function () {
						resizeViewport();
					});

					// Events for thumbnails and buttons
					$('.thumbnails').click(function (event) {
						var page;
						if (event.target && (page = /page-([0-9]+)/.exec($(event.target).attr('class')))) {
							$('.magazine').turn('page', page[1]);
						}
					});

					$('.thumbnails li').
						bind($.mouseEvents.over, function () {
							$(this).addClass('thumb-hover');
						}).bind($.mouseEvents.out, function () {
							$(this).removeClass('thumb-hover');
						});

					if ($.isTouch) {
						$('.thumbnails').
							addClass('thumbanils-touch').
							bind($.mouseEvents.move, function (event) {
								event.preventDefault();
							});
					} else {
						$('.thumbnails ul').mouseover(function () {
							$('.thumbnails').addClass('thumbnails-hover');
						}).mousedown(function () {
							return false;
						}).mouseout(function () {
							$('.thumbnails').removeClass('thumbnails-hover');
						});
					}

					// Regions
					if ($.isTouch) {
						$('.magazine').bind('touchstart', regionClick);
					} else {
						$('.magazine').click(regionClick);
					}

					// Events for navigation buttons
					$('.next-button').bind($.mouseEvents.over, function () {
						$(this).addClass('next-button-hover');
					}).bind($.mouseEvents.out, function () {
						$(this).removeClass('next-button-hover');
					}).bind($.mouseEvents.down, function () {
						$(this).addClass('next-button-down');
					}).bind($.mouseEvents.up, function () {
						$(this).removeClass('next-button-down');
					}).click(function () {
						$('.magazine').turn('next');
					});

					$('.previous-button').bind($.mouseEvents.over, function () {
						$(this).addClass('previous-button-hover');
					}).bind($.mouseEvents.out, function () {
						$(this).removeClass('previous-button-hover');
					}).bind($.mouseEvents.down, function () {
						$(this).addClass('previous-button-down');
					}).bind($.mouseEvents.up, function () {
						$(this).removeClass('previous-button-down');
					}).click(function () {
						$('.magazine').turn('previous');
					});

					resizeViewport();
					$('.magazine').addClass('animated');

					// Final update and show the magazine
					$('#pdf-loading-progress').text('Complete!');

					// Remove loading overlay and show magazine with fade effect
					setTimeout(() => {
						$('#pdf-loading-overlay').fadeOut(500, function () {
							$(this).remove();
							// Show the magazine viewport after loading is complete
							$('.magazine-viewport').fadeIn(800);
						});
					}, 500);

					self.page.add_inner_button(__('Back'), () => location.reload());

					self.page.add_action_item(__('<i class="fa fa-download"></i> Download Original'), () => {
						window.open(file_url, '_blank');
					});

					self.page.add_action_item(__('<i class="fa fa-download"></i> Download Watermarked'), () => {
						window.open(watermarkedUrl, '_blank');
					});

				} catch (error) {
					console.error('Error loading PDF:', error);

					// Update loading overlay to show error
					$('#pdf-loading-overlay').html(`
						<div style="text-align: center; color: white;">
							<div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
							<div style="font-size: 18px; margin-bottom: 10px;">Error Loading PDF</div>
							<div style="font-size: 14px; color: #ff6b6b;">${error.message}</div>
							<button onclick="$('#pdf-loading-overlay').fadeOut(500, function(){ $(this).remove(); })" 
									style="margin-top: 20px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
								Close
							</button>
						</div>
					`);

					// Hide the magazine viewport on error
					$('.magazine-viewport').hide();
				}
			});
		}



	}

	Exelpreview() {
		let self = this;
		$(document).on("click", ".open-spreadsheet", function (event) {
			event.preventDefault();
			let file_url = $(this).data("file-url");
			let file_id = $(this).data("name");
			let file_ext = file_url.split('.').pop().toLowerCase();


			console.log(file_url);
			console.log("file_ext", file_ext);
			console.log("filename", file_id);

			// Check if file extension is supported

			// Append Excel viewer to page container
			$("body").empty().append(`
				<div class="container-2">
					
					<div class="toolbar">
						
						<button class="btn btn-success load-sample-data">
							📋 Sample Data
						</button>
						
						<div id="sheetTabs" class="sheet-tabs"></div>

						<div class="toolbar-right">
							<button class="btn btn-secondary back-to-home">
								🏠 Home
							</button>
						</div>
					</div>

					<div id="infoPanel" class="info-panel" style="display: none;">
						<strong>File:</strong> <span id="fileInfo"></span>
					</div>

					<div id="controls" class="controls" style="display: none;">
						<div class="pagination">
							<span>Rows:</span>
							<input type="number" id="startRow" value="1" min="1" />
							<span>to</span>
							<input type="number" id="endRow" value="100" min="1" />
							<button class="btn btn-primary update-view">Update</button>
						</div>
						<div class="stats">
							<span id="statsInfo">Showing rows 1-100</span>
						</div>
					</div>

					<div id="loadingMessage" class="loading" style="display: none;">
						<div>Loading...</div>
					</div>

					<div id="errorMessage" class="error" style="display: none;"></div>

					<div id="emptyState" class="empty-state">
						<div style="font-size: 36px; margin-bottom: 15px;">📋</div>
						<h3>No file selected</h3>
						<p>Choose an Excel file or load sample data</p>
					</div>

					<div id="spreadsheetContainer" class="spreadsheet-container" style="display: none;">
						<table id="excelTable" class="excel-table"></table>
					</div>
				</div>

				<style>

				 body {
						font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
						background-color: #f8f9fa;
						padding: 10px;
					}					

					.container-2 {
						max-width: 97%;
						margin: 0 auto;
						background: white;
						border-radius: 8px;
						box-shadow: 0 2px 10px rgba(0,0,0,0.1);
						overflow: hidden;
					}

					.toolbar {
						background: #f8f9fa;
						padding: 10px 15px;
						border-bottom: 1px solid #dee2e6;
						display: flex;
						gap: 10px;
						align-items: center;
						flex-wrap: wrap;
					}

					

					.btn {
						padding: 8px 15px;
						border: none;
						border-radius: 4px;
						cursor: pointer;
						font-size: 13px;
						font-weight: 500;
						transition: background-color 0.2s ease;
					}

					.btn-primary {
						background: #007bff;
						color: white;
					}

					.btn-primary:hover {
						background: #0056b3;
					}

					.btn-success {
						background: #28a745;
						color: white;
					}

					.btn-success:hover {
						background: #1e7e34;
					}

					.sheet-tabs {
						display: flex;
						gap: 5px;
						flex-wrap: wrap;
					}

					.sheet-tab {
						padding: 6px 12px;
						background: #e9ecef;
						border: none;
						border-radius: 4px;
						cursor: pointer;
						font-size: 12px;
						transition: all 0.2s ease;
					}

					.sheet-tab.active {
						background: #007bff;
						color: white;
					}

					.sheet-tab:hover {
						background: #007bff;
						color: white;
					}

					.info-panel {
						background: #e8f4fd;
						padding: 10px 15px;
						border-left: 3px solid #007bff;
						margin: 10px;
						border-radius: 4px;
						font-size: 13px;
					}

					.controls {
						padding: 10px 15px;
						background: #f8f9fa;
						border-bottom: 1px solid #dee2e6;
						display: flex;
						gap: 10px;
						align-items: center;
						flex-wrap: wrap;
					}

					.pagination {
						display: flex;
						align-items: center;
						gap: 10px;
					}
					.toolbar-right {
						margin-left: auto;
					}

					.pagination input {
						width: 60px;
						padding: 4px 8px;
						border: 1px solid #ced4da;
						border-radius: 4px;
						text-align: center;
					}

					.spreadsheet-container {
						overflow: auto;
						max-height: 70vh;
						border: 1px solid #dee2e6;
						margin: 10px;
						border-radius: 4px;
					}

					.excel-table {
						width: 100%;
						border-collapse: collapse;
						font-size: 12px;
						background: white;
					}

					.excel-table th {
						background: #f8f9fa;
						color: #495057;
						font-weight: 600;
						padding: 8px 6px;
						border: 1px solid #dee2e6;
						text-align: left;
						position: sticky;
						top: 0;
						z-index: 10;
						white-space: nowrap;
						font-size: 11px;
					}

					.excel-table td {
						padding: 6px;
						border: 1px solid #dee2e6;
						vertical-align: top;
						max-width: 150px;
						word-wrap: break-word;
						overflow: hidden;
						text-overflow: ellipsis;
					}

					.excel-table tr:nth-child(even) {
						background-color: #f8f9fa;
					}

					.excel-table tr:hover {
						background-color: #e3f2fd;
					}

					.row-number {
						background: #e9ecef !important;
						font-weight: 600;
						text-align: center;
						width: 40px;
						position: sticky;
						left: 0;
						z-index: 5;
					}

					.excel-table th:first-child {
						position: sticky;
						left: 0;
						z-index: 15;
						background: #e9ecef;
					}

					.empty-state {
						text-align: center;
						padding: 40px 20px;
						color: #6c757d;
					}

					.loading {
						text-align: center;
						padding: 30px;
						color: #007bff;
					}

					.error {
						background: #f8d7da;
						color: #721c24;
						padding: 10px 15px;
						margin: 10px;
						border-radius: 4px;
						border-left: 3px solid #dc3545;
					}

					.stats {
						font-size: 12px;
						color: #6c757d;
					}

					@media (max-width: 768px) {
						.toolbar, .controls {
							flex-direction: column;
							align-items: stretch;
						}
						.toolbar-right {
							margin-left: 0;
							order: -1;
						}
						
						.sheet-tabs, .pagination {
							justify-content: center;
						}
					}
				</style>
			`);

			// Clear other content containers
			$(".col-md-3").html("");
			$(".col-md-9").html("");
			$(".col-lg-16").html("");

			// Show Excel viewer
			// $('.excel-viewport').show();

			// Load Excel file

			frappe.require([
				"https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
			], async () => {
				// self.loadExcelFile(file_url, file_id);

				const file_name = getFileName(file_url);
				console.log("File name extracted:", file_name);

				const the_file = await getFileFromURL(file_url, file_name);
				console.log("File object created:", the_file);

				let workbook = null;
				let currentSheet = null;
				let currentData = null;
				let maxRows = 0;
				const CHUNK_SIZE = 100;

				const elements = {
					fileInput: document.getElementById('fileInput'),
					sheetTabs: document.getElementById('sheetTabs'),
					infoPanel: document.getElementById('infoPanel'),
					fileInfo: document.getElementById('fileInfo'),
					controls: document.getElementById('controls'),
					startRow: document.getElementById('startRow'),
					endRow: document.getElementById('endRow'),
					statsInfo: document.getElementById('statsInfo'),
					loadingMessage: document.getElementById('loadingMessage'),
					errorMessage: document.getElementById('errorMessage'),
					emptyState: document.getElementById('emptyState'),
					spreadsheetContainer: document.getElementById('spreadsheetContainer'),
					excelTable: document.getElementById('excelTable')
				};

				// handleFile(the_file);
				// self.loadExcelFile(file_url, file_name)

				let file = the_file


				console.log("file", file);
				if (!file) return;

				console.log("file", file);

				clearError();
				show(elements.loadingMessage);
				hide(elements.emptyState);
				hide(elements.spreadsheetContainer);
				hide(elements.infoPanel);
				hide(elements.controls);
				// Load SheetJS if not already loaded
				loadSheetJS();

				const reader = new FileReader();
				reader.onload = function (e) {
					try {
						const data = new Uint8Array(e.target.result);
						workbook = XLSX.read(data, { type: 'array' });

						displayFileInfo(file);
						createSheetTabs();
						displaySheet(workbook.SheetNames[0]);

						hide(elements.loadingMessage);
						show(elements.spreadsheetContainer);
						show(elements.infoPanel);
						show(elements.controls);
					} catch (error) {
						showError('Error reading file: ' + error.message);
					}
				};

				reader.onerror = function () {
					showError('Error reading file. Please try again.');
				};

				reader.readAsArrayBuffer(file);
				// showError('Error loading Excel library: ' + error.message);



				function loadSheetJS() {
					return new Promise((resolve, reject) => {
						if (typeof XLSX !== 'undefined') {
							resolve();
						} else {
							reject(new Error('SheetJS library not loaded'));
						}
					});
				}
				function displayFileInfo(file) {
					const size = (file.size / 1024).toFixed(1);
					const sheets = workbook.SheetNames.length;
					elements.fileInfo.textContent = `${file.name} (${size} KB, ${sheets} sheet${sheets > 1 ? 's' : ''})`;
				}

				function clearError() {
					hide(elements.errorMessage);
				}

				function show(element) {
					if (element) element.style.display = 'block';
				}

				function hide(element) {
					if (element) element.style.display = 'none';
				}

				function showError(message) {
					if (elements.errorMessage) {
						elements.errorMessage.textContent = message;
						show(elements.errorMessage);
					}
					hide(elements.loadingMessage);
					hide(elements.spreadsheetContainer);
					hide(elements.controls);
				}

				function createSheetTabs() {
					if (!elements.sheetTabs) return;

					elements.sheetTabs.innerHTML = '';

					workbook.SheetNames.forEach((sheetName, index) => {
						const tab = document.createElement('button');
						tab.className = 'sheet-tab';
						tab.textContent = sheetName;
						tab.type = 'button'; // Explicitly set button type to prevent form submission

						// Use addEventListener instead of onclick to prevent conflicts
						tab.addEventListener('click', function (e) {
							e.preventDefault(); // Prevent any default behavior
							e.stopPropagation(); // Stop event bubbling
							displaySheet(sheetName);
						});

						if (index === 0) {
							tab.classList.add('active');
						}

						elements.sheetTabs.appendChild(tab);
					});
				}

				function displaySheet(sheetName) {
					try {
						console.log('Switching to sheet:', sheetName);
						currentSheet = sheetName;

						// Update active tab
						if (elements.sheetTabs) {
							const tabs = elements.sheetTabs.querySelectorAll('.sheet-tab');
							tabs.forEach(tab => {
								tab.classList.remove('active');
								if (tab.textContent === sheetName) {
									tab.classList.add('active');
								}
							});
						}

						const worksheet = workbook.Sheets[sheetName];
						if (!worksheet) {
							console.error('Worksheet not found:', sheetName);
							showError('Sheet not found: ' + sheetName);
							return;
						}

						currentData = XLSX.utils.sheet_to_json(worksheet, {
							header: 1,
							defval: '',
							raw: false
						});

						maxRows = currentData.length;
						console.log('Sheet loaded, rows:', maxRows);

						// Reset pagination
						if (elements.startRow) elements.startRow.value = 1;
						if (elements.endRow) elements.endRow.value = Math.min(CHUNK_SIZE, maxRows);

						updateView();
					} catch (error) {
						console.error('Error displaying sheet:', error);
						showError('Error displaying sheet: ' + error.message);
					}
				}

				function updateView() {
					try {
						if (!currentData) return;

						const startRow = Math.max(1, parseInt(elements.startRow?.value) || 1);
						const endRow = Math.min(maxRows, parseInt(elements.endRow?.value) || CHUNK_SIZE);

						// Update input values
						if (elements.startRow) elements.startRow.value = startRow;
						if (elements.endRow) elements.endRow.value = endRow;

						// Update stats
						if (elements.statsInfo) {
							elements.statsInfo.textContent = `Showing rows ${startRow}-${endRow} of ${maxRows}`;
						}

						// Get subset of data
						const dataSubset = currentData.slice(startRow - 1, endRow);

						renderTable(dataSubset, startRow);
					} catch (error) {
						console.error('Error updating view:', error);
						showError('Error updating view: ' + error.message);
					}
				}

				function renderTable(data, startRowNumber = 1) {
					if (!elements.excelTable) return;

					if (!data || data.length === 0) {
						elements.excelTable.innerHTML = '<tr><td colspan="100%" style="text-align: center; padding: 30px; color: #6c757d;">No data found</td></tr>';
						return;
					}

					let html = '';

					// Find maximum number of columns
					const maxCols = Math.max(...data.map(row => row ? row.length : 0));

					// Create header row with column letters
					html += '<tr>';
					html += '<th class="row-number">#</th>';
					for (let col = 0; col < maxCols; col++) {
						const colLetter = getColumnLetter(col);
						html += `<th>${colLetter}</th>`;
					}
					html += '</tr>';

					// Create data rows
					data.forEach((row, index) => {
						html += '<tr>';
						html += `<td class="row-number">${startRowNumber + index}</td>`;

						for (let col = 0; col < maxCols; col++) {
							const cellValue = (row && row[col]) ? row[col] : '';
							const displayValue = String(cellValue).length > 50 ?
								String(cellValue).substring(0, 50) + '...' :
								String(cellValue);
							html += `<td title="${String(cellValue).replace(/"/g, '&quot;')}">${displayValue}</td>`;
						}
						html += '</tr>';
					});

					elements.excelTable.innerHTML = html;
				}

				function getColumnLetter(col) {
					let letter = '';
					while (col >= 0) {
						letter = String.fromCharCode(65 + (col % 26)) + letter;
						col = Math.floor(col / 26) - 1;
					}
					return letter;
				}

				async function loadSampleData() {
					try {
						await loadSheetJS();

						const sampleData = [
							['Name', 'Age', 'Department', 'Salary', 'Join Date', 'Email', 'Phone'],
							['John Doe', 30, 'Engineering', 75000, '2020-01-15', 'john@company.com', '555-0101'],
							['Jane Smith', 28, 'Marketing', 65000, '2021-03-20', 'jane@company.com', '555-0102'],
							['Mike Johnson', 35, 'Sales', 70000, '2019-07-10', 'mike@company.com', '555-0103'],
							['Sarah Wilson', 32, 'HR', 60000, '2020-11-05', 'sarah@company.com', '555-0104'],
							['David Brown', 29, 'Engineering', 80000, '2021-01-12', 'david@company.com', '555-0105']
						];

						const ws = XLSX.utils.aoa_to_sheet(sampleData);
						workbook = XLSX.utils.book_new();
						XLSX.utils.book_append_sheet(workbook, ws, 'Sample Data');

						displayFileInfo({ name: 'Sample Data', size: 2048 });
						createSheetTabs();
						displaySheet('Sample Data');

						hide(elements.emptyState);
						hide(elements.loadingMessage);
						show(elements.spreadsheetContainer);
						show(elements.infoPanel);
						show(elements.controls);
					} catch (error) {
						showError('Error loading sample data: ' + error.message);
					}
				}

				document.removeEventListener('keydown', handleKeydown);
				document.addEventListener('keydown', handleKeydown);
				// document.addEventListener('.load-sample-data', loadSampleData);

				$(document).on('click', '.load-sample-data', loadSampleData);
				$(document).on('click', '.update-view', updateView);

				$(document).on('click', '.back-to-home', function () {
					location.reload();
				});



				function handleKeydown(e) {
					if (!currentData) return;

					if (e.ctrlKey && e.key === 'ArrowDown') {
						e.preventDefault();
						const currentStart = parseInt(elements.startRow?.value || 1);
						const newStart = Math.min(currentStart + CHUNK_SIZE, maxRows);
						if (elements.startRow) elements.startRow.value = newStart;
						if (elements.endRow) elements.endRow.value = Math.min(newStart + CHUNK_SIZE - 1, maxRows);
						updateView();
					} else if (e.ctrlKey && e.key === 'ArrowUp') {
						e.preventDefault();
						const currentStart = parseInt(elements.startRow?.value || 1);
						const newStart = Math.max(1, currentStart - CHUNK_SIZE);
						if (elements.startRow) elements.startRow.value = newStart;
						if (elements.endRow) elements.endRow.value = Math.min(newStart + CHUNK_SIZE - 1, maxRows);
						updateView();
					}
				}



			});
		});
	}

	goHome() {
		let self = this
		$(document).on("click", ".go-home", function (event) {
			console.log("home called");
			self.renderTemplate("Home");
			self.page.set_title(__('Home'));
			self.current_folder = "Home"; // Reset current folder to Home
			self.folder_history = []; // Clear folder history
			history.pushState({ folder: "Home" }, "", "/app/my-drive");
			$('.btn .ellipsis').hide();
			// document.querySelector('[data-label="Back"]').style.display = 'none';
		})
	}

	goFolders() {
		let self = this
		console.log("goFolders is active from openFolder");
		$(document).off("click", ".go-folders");
		$(document).on("click", ".go-folders", function (event) {
			self.page.set_title(__("Folders"));

			let fileDisplayArea = document.querySelector(".col-md-9 .ibox-content .col-lg-16");
			fileDisplayArea.innerHTML = "";
			$(".col-lg-16").html("");

			frappe.call({
				method: "photos.my_drive.page.my_drive.my_drive.get_only_folders",
				args: { is_folder: 1, owner: frappe.session.user },
				callback: function (r) {
					if (r.message) {
						console.log("Folders:", r.message.folders);

						if (r.message.folders.length === 0) {
							addEmptyState()
							// fileDisplayArea.innerHTML = `<p class="center"> No Folders Uploaded..</p>`;
						} else {
							r.message.folders.forEach(file => {
								console.log("if part its a folder");
								let fileElement = document.createElement("div");
								fileElement.classList.add("file-box");
								fileElement.innerHTML = `
								<div class="file">
								<a href="#" class="open-folder" data-folder-name="${file.file_id}">
									<span class="corner"></span>
										<div class="file-body">
											<svg class="icon" style="width: 71px; height: 75px" aria-hidden="true">
												<use href="#icon-folder-normal-large"></use>
											</svg>
										</div>
									<div class="file-name">
										${file.filename}
										<br>
										<small>${file.creation}</small>
									</div>
								</a>
							</div>
							`;
								fileDisplayArea.appendChild(fileElement);

							});
						}

					}
				}
			})

		})

	}

	goBack() {
		console.log("Back Started...");
		let self = this;
		// Get the current folder path
		let currentPath = self.current_folder;
		console.log("Current path before going back:", currentPath);

		// Split by "/" to get folder structure
		let pathParts = currentPath.split("/");

		console.log("self.current_folder split and remove the last one ", pathParts);
		// Remove the last folder to go up one level
		pathParts.pop();

		console.log("removed last folder now the parentFolder path is", pathParts);

		// Join remaining parts to get parent folder path
		let parentFolder = pathParts.join("/");
		self.current_folder = parentFolder; // Update current folder
		console.log("parentFolder[] joined path:", parentFolder);
		if (parentFolder === "") {
			parentFolder = "Home"; // Default to Home if we've gone all the way back
		}


		if (parentFolder === "Home") {
			console.log("goBack  home ");

			let basePath = "/app/my-drive";
			let newUrl = basePath
			$('.ellipsis').hide();
			console.log("newUrl", newUrl);

			history.pushState({ folder: parentFolder }, "", newUrl);
			// self.current_folder = newUrl;
			self.folder_history.pop();

			self.renderTemplate(parentFolder)
			self.page.set_title(__(parentFolder));


		} else {
			console.log("inside else its not Home");
			let create_url = window.location.pathname.split("/").slice(0, -1).join("/")
			console.log("after split create url", create_url);

			history.pushState({ folder: parentFolder }, "", create_url);
			self.page.set_title(__(parentFolder));
			self.current_folder = parentFolder;

			self.folder_history.pop();

			// Hide back button if we're at the root
			if (parentFolder === "Home" || self.folder_history.length === 0) {
				self.page.get_inner_group_button(__('Back')).toggle(false);
			}

			// Load the parent folder contents
			frappe.call({
				method: "photos.my_drive.page.my_drive.my_drive.get_folder_contents",
				args: { folder_name: parentFolder, owner: frappe.session.user },
				callback: function (response) {
					if (response.message) {
						// console.log("Folder contents:", response.message);
						let files = response.message.files;
						let fileDisplayArea = document.querySelector(".col-md-9 .ibox-content .col-lg-16");
						fileDisplayArea.innerHTML = "";

						if (files.length === 0) {
							fileDisplayArea.innerHTML = "<p>This folder is empty. Upload files here.</p>";
						} else {
							files.forEach(file => {
								// console.log("file", file);
								if (file.is_folder) {
									let fileElement = document.createElement("div");
									fileElement.classList.add("file-box");
									fileElement.innerHTML = `
										<div class="file">
											<a href="#" class="open-folder" data-folder-name="${file.name}">
												<span class="corner"></span>
													<div class="file-body">
														<svg class="icon" style="width: 71px; height: 75px" aria-hidden="true">
															<use href="#icon-folder-normal-large"></use>
														</svg>
													</div>
												<div class="file-name">
													${file.file_name}
													<br>
													<small>${file.creation}</small>
												</div>
											</a>
									</div>
									`;
									fileDisplayArea.appendChild(fileElement);
								} else {
									let fileElement = document.createElement("div");
									fileElement.classList.add("file-box");
									fileElement.innerHTML = `
										<div class="file">
											<a href="#" class="image-preview" data-file-url="${file.file_url}" data-name=${file.name}>
												<span class="corner"></span>
												<div class="image">
													<img alt="image" class="img-responsive" src=${file.file_url}>
												</div>
												<div class="file-name">
													${file.file_name}
													<br>
													<small>${file.creation}</small>
												</div>
											</a>
										</div>
									`;
									fileDisplayArea.appendChild(fileElement);
								}
							});
						}
					}
				}
			});
		}
	}
}

function getFileName(url) {
	return url.split('/').pop().split('?')[0]
}

async function getFileFromURL(file_url, filename) {
	try {
		const response = await fetch(file_url);
		if (!response.ok) throw new Error("Failed to fetch file");

		const blob = await response.blob();

		// Infer content type or fallback
		const contentType = blob.type || 'application/octet-stream';

		// Create JS File object (simulating upload)
		const file = new File([blob], filename, {
			type: contentType,
			lastModified: new Date().getTime()
		});

		return file;
	} catch (err) {
		console.error("Error creating File from URL:", err);
	}
}


// Remove any existing event listeners to prevent duplicates





function formatBytes(bytes) {
	const kb = 1024;
	const mb = kb * 1024;

	if (bytes >= mb) {
		return (bytes / mb).toFixed(2) + ' MB';
	} else if (bytes >= kb) {
		return (bytes / kb).toFixed(2) + ' KB';
	} else {
		return bytes + ' B';
	}
}

async function uploadModifiedPDF(blob, filename = "watermarked.pdf") {
	const file = new File([blob], filename, { type: "application/pdf" });
	const formData = new FormData();
	formData.append("file", file);
	formData.append("is_private", 0);
	const response = await fetch("/api/method/upload_file", {
		method: "POST",
		body: formData,
		headers: {
			"X-Frappe-CSRF-Token": frappe.csrf_token,
		},
	});
	const result = await response.json();
	if (result.message && result.message.file_url) {
		return result.message.file_url;
	} else {
		throw new Error("Failed to upload watermarked PDF.");
	}
}

async function checkIfFileExists(filename) {
	console.log("Checking if file exists:", filename);
	const res = await fetch(`/api/resource/File?fields=["file_url"]&filters=[["file_name", "=", "${filename}"]]`);
	const data = await res.json();
	if (data.data.length > 0) {
		console.log("File exists:", data.data[0].file_url);
		return data.data[0].file_url;
	}
	return null;
}


function copyToClipboard() {
	var aux = document.createElement("input");
	aux.setAttribute("value", "print screen disabled!");
	document.body.appendChild(aux);
	aux.select();
	document.execCommand("copy");
	// Remove it from the body
	document.body.removeChild(aux);
	alert("Print screen disabled!");
}

function addEmptyState() {
	let fileDisplayArea = document.querySelector(".col-lg-16");
	if (fileDisplayArea) {
		fileDisplayArea.innerHTML = `
		<div class="empty-state-1">
			<i class="fa fa-folder-open empty-icon"></i>
			<h3>No Files Uploaded</h3>
			<p>Drop or upload files here to get started.</p>
		</div>`;
	}

	
}