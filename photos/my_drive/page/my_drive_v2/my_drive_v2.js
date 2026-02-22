frappe.pages['my-drive-v2'].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'My Drive V2',
		single_column: true
		
	});


	const sidebar_button = `<button class="btn-reset sidebar-toggle-btn" aria-label="Toggle Sidebar" data-original-title="" title="">
					<svg class="es-icon icon-md sidebar-toggle-placeholder"><use href="#es-line-align-justify"></use></svg>
					<span class="sidebar-toggle-icon">
						<svg class="es-icon es-line icon-md" style="" aria-hidden="true">
							<use class="" href="#es-line-sidebar-expand"></use>
						</svg>
					</span>
				</button>`

	// if ($(".page-title .sidebar-toggle-btn").length === 0) {		
	// 	$(".page-title").prepend(sidebar_button);
	// }
	
	$(".page-title").prepend(sidebar_button);

	MyDriveV3.init(page);

	// $(wrapper).on('hide', function() {
	// 	$('.my-drive-sidebar-btn').remove();
	// 	$(document).off('click', '.my-drive-sidebar-btn');
	// 	$(document).off('dblclick', '.my-drive-sidebar-btn');
	// 	$('.file-view').off('mouseleave mouseenter');
		
	// 	// 🎯 IMPORTANT: Reset sidebar state for other pages
	// 	$('.layout-side-section').removeAttr('style'); // Remove inline styles
	// 	$('.list-sidebar').removeClass('opened');
	// });

	// $(wrapper).on('hide', function() {
	// 	$('.sidebar-toggle-btn').remove();
	// 	$(document).off('click', '.sidebar-toggle-btn');
	// 	$(document).off('dblclick', '.sidebar-toggle-btn');
	// 	$('.file-view').off('mouseleave mouseenter');
	// });
}
const MyDriveV3 = {
	
	init(page) {
		this.page = page
		this.permissions = []
		this.current_folder = "Home"
		this.folders_array = ["Home"]
		console.log(frappe.session.user, "user");
		frappe.db.get_value("Drive Access", { "user": frappe.session.user }, ['view_only', 'upload_only', 'all'])
			.then(r => {

				if (frappe.session.user == "Administrator"){
					this.drive_access = {"all":1,"upload_only":0,"view_only":0}
					this.driveAccess()
				}else{
					console.log("Drive Access", r.message);
					this.drive_access = r.message
					this.driveAccess()
				}
			})
		
		// this.render_template();
		this.imagePreview()
		this.videoPreview()
		this.PDFpreview();
		this.bindCheckboxEvents();
		this.Shared()
		this.Media()
		this.Documents()
		this.Notifications()
		this.Home();
		this.Exelpreview()
		this.search_engine()

		// this.sidebar_button();
		// this.user_info()

	},

	async driveAccess() {
		if (this.drive_access.all == 1) {
			// console.log("inside all drive access");
			await frappe.xcall("photos.file_utils.create_user_folder", {
				user: frappe.session.user
			});

			this.uploadFile()
			this.uploadFolder()
			// this.uploadLarge()
			this.newFolder()
			this.render_template(); // For checking i added here this line today Nov 17 at 6 pm
		} else if (this.drive_access.upload_only == 1) {
			this.uploadFile()
			this.uploadFolder()
			// this.uploadLarge()
			this.render_template();   // For checking i added here this line today Nov 17 at 6 pm
		}else if(this.drive_access.view_only == 1){
			this.render_template();

		}else {
			frappe.msgprint("Don't Have Access ! Please Contact Admin")
			// console.log("User Dont Have Drive Access");
			return
		}
	},


	render_template() {
		// this.page.set_title(__(this.current_folder));
		if (window.location.pathname !== "/app/my-drive-v2") {
			console.log("window.location was ", window.location.pathname);
			console.log("checking current folder ,",this.current_folder);
			history.pushState({ folder: this.current_folder }, "", "/app/my-drive-v2");
			this.page.set_title(__(this.current_folder));
			$('.custom-actions .ellipsis').hide();
		}

		// this.folders_array.push(this.current_folder)
		

		this.permissions.length = 0

		console.log(this.current_folder)
		let limit_start = 0;
		let limit_page_length = 20
		frappe.call({
			method: "photos.my_drive.page.my_drive_v2.my_drive_v2.render_template",
			args: { 
				owner: frappe.session.user,
				folder: this.current_folder,
				limit_start: limit_start,
				limit_page_length: limit_page_length

			},
			callback: (r) => {
				if (r.message) {
					console.log("renderTemplate responce", r.message);

					this.handlePermissions(r.message.files) // globel permissions

					$(".file-view").remove()
					$(".layout-side-section").remove()


					this.tags = r.message.tags || {};
					console.log("renderTemplate this.permissions", this.permissions);
					let filess = r.message.files.filter(file => !file.is_folder);
					let folders = r.message.files.filter(file => file.is_folder);

					console.log("files", filess);
					console.log("folders", folders);
					let context = {
						"user_details": r.message.user_details,
						"files": filess,
						"folders": folders,
					}
					console.log("renderTemplate ends here...");

					// $("#page-my-drive-v3").remove()

					// $(this.page.main).empty()
					// $(".row").empty()
					// $(".page-container").empty()
					// $('.layout-main-section-wrapper').remove();

					// $(frappe.render_template("my_drive", context)).appendTo(this.page.main);					

					$(frappe.render_template("my_drive_v2", context)).appendTo($(this.page.main).closest('.row.layout-main'));

					$(".standard-filter-section .level-item a").remove()
					let add_folder = `<a href="#" class="go-home">Home</a>`
					$(".standard-filter-section .level-item").append(add_folder)

					this.sidebar_button();

					if (filess.length === 0 && folders.length === 0) {
						emptyState();
						return;
					}
					if(r.message.total_notification > 0){
						console.log("inside if notification",r.message.total_notification);
						// let total_notification = `<span class="notification-badge">${r.message.total_notification}</span>`
						$(".open-notifications").append(`<span class="notification-badge">${r.message.total_notification}</span>`)
					}else{
						console.log("not notifications found",r.message.total_notification );
					}

					this.openFolder();
					this.pagination()
				}
			}
		});

		// $(frappe.render_template("my_drive_v3", context)).appendTo($(this.page.main).parent());     but this didnt work

	},

	search_engine() {
		let self = this

		$(document).on("keyup", "input[data-element='search']", frappe.utils.debounce(function () {

			let keyword = $(this).val().trim();

			let limit_start = 0
			let limit_page_length = 20

			if (!keyword) {

				frappe.call({
					method: "photos.my_drive.page.my_drive_v2.my_drive_v2.get_all_files",
					args: {
						owner: frappe.session.user,
						folder: self.current_folder,
						limit_start: limit_start,
						limit_page_length: limit_page_length
					},
					callback: (r) => {
						if (r.message) {
							console.log("renderTemplate responce", r.message);
							self.all_files(r.message)
							return;
						}
					}
				});
			}
			frappe.call({
				method: "photos.my_drive.page.my_drive_v2.my_drive_v2.search",
				args: {
					owner: frappe.session.user,
					folder: self.current_folder,
					keys: keyword,
				},
				callback: function (r) {
					if (r.message) {
						let filegrid = document.querySelector(".file-grid");
						filegrid.innerHTML = ""
						console.log("responce:", r.message);
						// let fileDisplayArea = document.querySelector(".col-md-9 .ibox-content .col-lg-16");
						// let firstElementChild = document.querySelector(".col-lg-16");
						// fileDisplayArea.innerHTML = "";
						self.all_files(r.message)
						// 👉 You can render the results here dynamically
						// e.g. update a div with file names
					}
				}
			});
		}, 300)); // debounce: run only after 300ms pause in typing


	},

	sidebar_button() {
		let self = this;
		let sidebarLocked = true; // 🔒 Locked by default

		// 🚀 Initialize: Show sidebar on page load
		$(".layout-side-section").show();
		$(".list-sidebar").addClass("opened");

		// 🖱️ Single click → toggle show/hide
		$(document).on("click", ".sidebar-toggle-btn", function () {
			if (sidebarLocked) return;
			let sidebar = $(".layout-side-section");
			let innerSidebar = $(".list-sidebar");

			if (sidebar.is(":visible")) {
				sidebar.hide();
				innerSidebar.removeClass("opened");
			} else {
				sidebar.show();
				innerSidebar.addClass("opened");
			}
		});

		// 🖱️ Double click → lock/unlock
		$(document).on("dblclick", ".sidebar-toggle-btn", function () {
			sidebarLocked = !sidebarLocked;
			let icon = $(".sidebar-toggle-btn .lock-icon");

			// Create icon if doesn't exist
			if (icon.length === 0) {
				$(".sidebar-toggle-btn").append(
					'<i class="lock-icon fa fa-unlock-alt" style="margin-left: 6px; cursor: pointer; transition: opacity 0.8s ease-out;"></i>'
				);
				icon = $(".sidebar-toggle-btn .lock-icon");
			}

			if (sidebarLocked) {
				// Show lock icon
				icon.removeClass("fa-unlock-alt").addClass("fa-lock")
					.css({ "color": "#22c55e", "opacity": "1" });
				frappe.show_alert({ message: __("Sidebar Locked"), indicator: "green" });

				// Fade out after 2 seconds
				setTimeout(() => {
					icon.css("opacity", "0");
					setTimeout(() => {
						icon.remove();
					}, 800);
				}, 2000);

			} else {
				// Show unlock icon
				icon.removeClass("fa-lock").addClass("fa-unlock-alt")
					.css({ "color": "#f97316", "opacity": "1" });
				frappe.show_alert({ message: __("Sidebar Unlocked"), indicator: "orange" });

				// Fade out after 2 seconds
				setTimeout(() => {
					icon.css("opacity", "0");
					setTimeout(() => {
						icon.remove();
					}, 800);
				}, 2000);
			}
		});

		// 🖱️ Auto toggle by mouse movement (only if not locked)
		$(".file-view").on("mouseleave", function (e) {
			if (sidebarLocked) return;
			if (e.pageX <= $(".file-view").offset().left) {
				$(".layout-side-section").show();
				$(".list-sidebar").addClass("opened");
			}
		});

		$(".file-view").on("mouseenter", function () {
			if (sidebarLocked) return;
			$(".layout-side-section").hide();
			$(".list-sidebar").removeClass("opened");
		});
	},

	// sidebar_button() {
	// 	let self = this;
	// 	let sidebarLocked = false; // 🔒 state flag

	// 	// Create lock icon dynamically (optional if not in HTML)

	// 	// 🖱️ Single click → toggle show/hide
	// 	$(document).on("click", ".sidebar-toggle-btn", function () {
	// 		if (sidebarLocked) return; // if locked, ignore manual clicks
	// 		let sidebar = $(".layout-side-section");
	// 		let innerSidebar = $(".list-sidebar");

	// 		if (sidebar.is(":visible")) {
	// 			sidebar.hide();
	// 			innerSidebar.removeClass("opened");
	// 		} else {
	// 			sidebar.show();
	// 			innerSidebar.addClass("opened");
	// 		}
	// 	});

	// 	// 🖱️ Double click → lock/unlock
	// 	$(document).on("dblclick", ".sidebar-toggle-btn", function () {
	// 		sidebarLocked = !sidebarLocked;
	// 		let icon = $(".sidebar-toggle-btn .lock-icon");

	// 		if ($(".sidebar-toggle-btn .lock-icon").length === 0) {
	// 			$(".sidebar-toggle-btn").append('<i class="lock-icon fa fa-unlock-alt" style="margin-left: 6px; cursor: pointer;"></i>');
	// 		}

	// 		// $('. sidebar-toggle-btn').remove()



	// 		if (sidebarLocked) {
	// 			icon.removeClass("fa-unlock-alt").addClass("fa-lock").css("color", "#22c55e"); // green lock
	// 			frappe.show_alert({ message: __("Sidebar Locked"), indicator: "green" });
	// 		} else {
	// 			icon.removeClass("fa-lock").addClass("fa-unlock-alt").css("color", "#f97316"); // orange unlock
	// 			frappe.show_alert({ message: __("Sidebar Unlocked"), indicator: "orange" });
	// 		}
	// 	});

	// 	// 🖱️ Auto toggle by mouse movement (only if not locked)
	// 	$(".file-view").on("mouseleave", function (e) {
	// 		if (sidebarLocked) return; // skip when locked
	// 		if (e.pageX <= $(".file-view").offset().left) {
	// 			$(".layout-side-section").show();
	// 			$(".list-sidebar").addClass("opened");
	// 		}
	// 	});

	// 	$(".file-view").on("mouseenter", function () {
	// 		if (sidebarLocked) return; // skip when locked
	// 		$(".layout-side-section").hide();
	// 		$(".list-sidebar").removeClass("opened");
	// 	});
	// },

	user_info() {

		// frappe.db.get_value("Drive Access", { "user": frappe.session.user}, ['view_only', 'upload_only', 'all'])
		// 	.then(r => {
		// 		console.log("Drive Access", r.message);
		// 		this.drive_access = r.message
		// 		this.driveAccess()
		// })

		let fileManager = document.createElement("div");
		fileManager.className = "file-manager";
		fileManager.innerHTML = `
				<div class="user-info-1">
					<ul class="list-unstyled sidebar-menu sidebar-image-section">
						<li class="sidebar-image-wrapper">
							<div class="sidebar-standard-image">    
								<div class="standard-image-1">{{user_details.standard_img}}</div>  
							</div>      
						</li> 
						<li class="name employee-name" id="user-info-1">{{user_details.employee_name}}</li>
						<li class="designation" id="user-info-1">
							<label class="label label-info">{{user_details.designation}}</label>
						</li>
					</ul>
				</div>

				<ul class="folder-list" id="folder-list"  style="padding: 0"><li></li></ul>

				<h5 class="go-home"><i class="fa fa-home me-2 icon-large"></i>Home</h5>

				<ul class="folder-list" id="folder-list"  style="padding: 0"><li></li></ul>

					<h5 class="shared-file open-media" data-media-files="Media"><i class="fa fa-film fa-sm"></i> Media</h5>

				<ul class="folder-list" id="folder-list"  style="padding: 0"><li></li></ul>

					<h5 class="go-folders"> <i class="fa fa-archive"></i>Folders</h5>

				<ul class="folder-list" id="folder-list"  style="padding: 0"><li></li></ul>
					
					<h5 class="shared-file open-shared" data-shared-files="Shared"><i class="fa fa-share-alt icon-large2"></i>Shared </h5>

				<ul class="folder-list" id="folder-list"  style="padding: 0"><li></li></ul>
				
					<h5 class="shared-file open-documents" data-documents-files="Documents"><i class="fa fa-file icon-large2"></i>Documents</h5>

				<ul class="folder-list" id="folder-list"  style="padding: 0"><li></li></ul>
					<h5 class="shared-file open-notification"><i class="fa fa-envelope"></i>Notifications</h5>
				<ul class="folder-list" id="folder-list"  style="padding: 0"><li></li></ul>


				<div class="clearfix-1">
					<ul class="meta list list-unstyled">
						<li class="activity"><small>Last Active:  {{user_details.last_login}}</small></li>
					</ul>
				</div>`

		// sidebarSection.prepend(fileManager);

		$(".sidebar-section.filter-section").prepend(fileManager);
	},

	bindCheckboxEvents() {
		let self = this
		let shareButton = null; // Keep reference to the button
		let deleteButton = null;
		let downloadBtn =null
		$(document).on("change", ".checkbox", () => {
			const anyChecked = $(".checkbox:checked").length > 0;
			if (anyChecked) {
				let selectedFiles = this.getSelectedFiles(); // Move this inside the if block
				console.log("selected fils", selectedFiles)
				console.log("permissions :", self.permissions);
				let matchedPermissions = self.permissions.filter(p => selectedFiles.some(f => f.drive_id === p.drive_id));
				console.log("matched ", matchedPermissions);

				if (!shareButton && matchedPermissions.some(p => p.create === 1 || p.share === 1)) {
					shareButton = self.page.add_inner_button(__('Share'), () => {
						let currentSelectedFiles = self.getSelectedFiles(); // Get fresh data when button is clicked
						if (currentSelectedFiles.length > 0) {
							this.share(currentSelectedFiles);
						} else {
							frappe.msgprint({
								title: __('No Files Selected'),
								message: __('Please select files to share.'),
								indicator: 'orange'
							});
						}
					});
				}

				// console.log("selected file", selectedFiles);


				if (!deleteButton && matchedPermissions.some(p => p.create === 1 || p.delete === 1)) {
					deleteButton = self.page.add_inner_button(__('Delete'), () => {
						let currentSelectedFiles = this.getSelectedFiles(); // Get fresh data when button is clicked
						if (currentSelectedFiles.length > 0) {
							this.deleteFile(currentSelectedFiles);
						} else {
							frappe.msgprint({
								title: __('No Files Selected'),
								message: __('Please select files to delete.'), // Fixed message
								indicator: 'orange'
							});
						}
					});

				}

				if (!downloadBtn && matchedPermissions.some(p => p.create === 1 || p.download === 1)) {
					downloadBtn = self.page.add_inner_button(__('Download'), () => {
						let currentSelectedFiles = this.getSelectedFiles(); // Get fresh data when button is clicked
						if (currentSelectedFiles.length > 0) {

							// this.deleteFile(currentSelectedFiles);
							this.downloadFile(currentSelectedFiles);
						} else {
							frappe.msgprint({
								title: __('No Files Selected'),
								message: __('Please select files to delete.'), // Fixed message
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
					downloadBtn.remove();
					shareButton = null;
					deleteButton = null;
					downloadBtn = null;
				}
			}
		});
	},

	getSelectedFiles() {
		let selectedFiles = [];
		$('input[type="checkbox"]:checked.checkbox').each(function () {
			let file_id = $(this).data('file-id');
			let drive_id = $(this).data('docname');
			// console.log("docname", docname);
			// console.log("filename", filename);
			var fileData = {
				"file_id": file_id,
				"drive_id": drive_id,
			};
			selectedFiles.push(fileData);
		});
		// console.log("Selected files:", selectedFiles);
		return selectedFiles;
	},

	downloadFile(selectedFiles) {
		window.open(`/api/method/photos.download.download?file_id=${selectedFiles[0].file_id}`);
		// console.log("yess lets Download",selectedFiles);
		// frappe.call({
		// 			method: "photos.download.download",
		// 			args: { bulk_files: JSON.stringify(selectedFiles) },
		// 			callback: function (r) {
		// 		}
		// })
		// function downloadFile(file_id) {
		// 	window.open(`/api/method/my_app.my_module.download_attached_file?file_id=${selectedFiles[0].file_id}`);
		// }
	},

	deleteFile(selectedFiles) {
		let self = this
		console.log("delete ? file id's : ", selectedFiles);
		if (selectedFiles.length !== 0) {
			frappe.confirm("Are you sure you want to delete this file?", function () {
				frappe.call({
					method: "photos.my_drive.page.my_drive_v2.my_drive_v2.delete_bulk_items",
					args: { bulk_files: JSON.stringify(selectedFiles) },
					callback: function (r) {

						console.log("delete_bulk_items responce :", r.message)

						if (r.message && Array.isArray(r.message)) {
							console.log("deleting file...", r.message[0])

							let successCount = 0;
							r.message.forEach((item, index) => {
								if (item.status === "Success" && item.is_folder) {

									setTimeout(() => {
										// Check what's actually in the DOM
										console.log("All checkboxes with data-drive-id:");
										$('input[data-drive-id]').each(function () {
											console.log("  -", $(this).attr('data-drive-id'));
										});

										console.log("All links with data-folder-name:");
										$('.open-folder[data-folder-name]').each(function () {
											console.log("  -", $(this).attr('data-folder-name'));
										});

										// Try to find the element
										const $fileBox = $(`input[data-file-id="${item.file_id}"]`).closest(".file");
										console.log("Found file box:", $fileBox.length);
										console.log("$fileBox element:", $fileBox);

										if ($fileBox.length > 0) {
											console.log("if");

											$fileBox.fadeOut(150, function () {
												$(this).remove();
											});

											if ($(".result.file-grid-view .file-grid.file").length === 0) {
												console.log("in if if");

												console.log(".file-grid has no files OR does not exist");
												// emptyState()
												// self.upload_button()
											} else {
												console.log("else part file still there");

												console.log($(".result.file-grid-view .file-grid"));
											}
										} else {
											console.error("Element not found!");
											console.log("else")


										}

									}, index * 300);
									console.log("hello im here first bcos of setTime out");



								} else if (item.status === "Success" && !item.is_folder) {

									console.log(("In the success "));
									

									setTimeout(() => {
										const $imagefileBox = $(`.image-preview[data-drive-id="${item.drive_id}"]`).closest(".file");
										const $pdffileBox = $(`.open-pdf[data-drive-id="${item.file_id}"]`).closest(".file");
										const $xlsxfileBox = $(`.open-spreadsheet[data-drive-id="${item.drive_id}"]`).closest(".file");
										const $videofileBox = $(`.video-preview[data-drive-id="${item.drive_id}"]`).closest(".file");





										$imagefileBox.fadeOut(150, function () {
											$(this).remove();
										});

										$pdffileBox.fadeOut(150, function () {
											$(this).remove();
										});

										$xlsxfileBox.fadeOut(150, function () {
											$(this).remove();
										});

										$videofileBox.fadeOut(150, function () {
											$(this).remove();
										});



									}, index * 500);
									successCount++;

									console.log("vanished... and it is not folder")

									if ($(".result.file-grid-view").length && $(".result.file-grid-view .file-grid .file").length === 0) {
										console.log(".file-grid has no files OR does not exist");
										emptyState()
										self.upload_button()
									}



								} else {
									frappe.msgprint(`Failed to delete drive_id: ${item.drive_id}`);
								}
							});

							// Show alert after all items are faded out
							setTimeout(() => {
								if (successCount > 0) {
									frappe.show_alert({
										message: `${successCount} file(s) deleted.`,
										indicator: "green"
									});
								}
							}, successCount * 100 + 200);  // wait for all fades + buffer
						} else {
							frappe.msgprint("Unexpected error occurred.");
						}
					}
				});
			});
		} else {
			frappe.throw("You havent selected files...")
			self.bindCheckboxEvents()
		}
	},

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
										<th width="10%">Read</th>
										<th width="10%">Write</th>
										<th width="10%">Upload</th>
										<th width="10%">Download</th>
										<th width="10%">Delete</th>
										
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

							/* Center the dialog + increase width */
							.modal .modal-header {
								padding-top: 5px !important;
								padding-bottom: 5px !important;
							}
							
							thead{
								background-color:#f3f3f3;
								border-top-left-radius :15px !important;
								border-top-right-radius : 15px !important;
								
							}
							
							.frappe-control .users-permissions-table{
								border-top-left-radius :15px !important;
								border-top-right-radius : 15px !important;
							}
							
							.form-group {
								margin-bottom: 5px !important;
								margin-top: 5px !important;
							}
							
							.clearfix{
								display: None !important;
							}
							
							.modal .modal-footer{
								padding-top: 8px !important;
								padding-bottom: 8px !important;
							}
							.modal-content {
								width: 800px !important;
								margin-left: auto !important;
								margin-right: auto !important;
							}

							/* Shrink table header text and row height */
							.users-permissions-table th {
								font-size: 0.6875rem !important;
								font-weight: 500 !important;
								padding: 6px 4px !important;
								text-align: center;
								vertical-align: middle;
							}

							/* Shrink table cell text */
							.users-permissions-table td {
							
								font-size: 0.6875rem !important;
								padding: 4px 6px !important;
								text-align: center;
								vertical-align: middle;
							}

							.users-permissions-table th:first-child,
							.users-permissions-table td:first-child {
								text-align: center;

							}

							.user-field-container {
								width: 100%;
							}
							.user-field-container .control-input-wrapper {
								margin-bottom: 0;
							}

							.permission-checkbox {
								transform: scale(1.1);
								cursor: pointer;
								margin: 0;
								position: relative;
								z-index: 999;
							}

							.permission-checkbox:focus {
								outline: 2px solid #007bff;
							}

							
								
							.remove-user-btn {
								color: #000000;
								position: relative;
								background: none;
								border: none;
								top: -5px;
								transform: translateY(10%);
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

				let share_files = selectedFiles.map(file => {
					console.log("file", file);

					return {
						drive_id: file.drive_id,
						file_id: file.file_id,
						shared_by: frappe.session.user,
						child_data: usersData.map(userData => ({
							for_user: userData.user,
							read: userData.read ? 1 : 0,
							write: userData.write ? 1 : 0,
							upload: userData.upload ? 1 : 0,
							download: userData.download ? 1 : 0,
							delete_file: userData.delete_file ? 1 : 0
						}))
					};
				});

				console.log("fileUserMappings", share_files);
				// Call backend method
				frappe.call({
					method: "photos.my_drive.page.my_drive_v2.my_drive_v2.share",
					args: {
						share_files: share_files
					},
					callback: (r) => {
						console.log("shared or not", r.message);

						if (r.message) {
							console.log("in if", r.message);

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
							// this.renderTemplate(this.current_folder);
						}
					},
					error: (r) => {
						console.log("is error", r);

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
	},

	handlePermissions(files) {

		console.log("Handling permission",files);
		
		let self = this
		// this.permissions.length = 0

		files.forEach(p => {

			let permissions = {
				file_id: p.file_id,
				drive_id: p.drive_id,
				read: p.read ?? 0,
				write: p.write ?? 0,
				upload: p.upload ?? 0,
				delete: p.delete_file ?? 0,
				download: p.download ?? 0,
				share: p.share ? 1 : 0,
				create: frappe.session.user === p.created_by ? 1 : 0,
			}

			self.permissions.push(permissions);
			
		});

		console.log("Handled the Permissions:", self.permissions)
	},

	// uploadFile() {
	// 	let self = this
	// 	this.page.add_action_item(__('<i class="fa fa-file"></i> Upload File'), function () {
	// 		var file_input = document.createElement("input");
	// 		console.log("file_input",file_input);
	// 		file_input.type = "file";
	// 		file_input.accept = ".pdf, .xls, .xlsx, .doc, .docx, .png, .jpg, .jpeg, .gif";
	// 		console.log("current folder = ", self.current_folder);

	// 		file_input.onchange = function () {
	// 			let file = file_input.files[0];
	// 			let folder = self.current_folder;

	// 			console.log("console file",file);
	// 			console.log("console folder",folder);

	// 			const MAX_SIZE = 4 * 1024 * 1024; // 4 MB in bytes
	// 			if (file.size > MAX_SIZE) {
	// 				console.log("file's size is max");
					
	// 				self.uploadBigFile(file,folder)
	// 				return
	// 			}

	// 			console.log("file's size is not more than 4 mb and it is",file.size);

				
	// 			// console.log("Uploading file to ...", folderName);
	// 			// console.table("file",file);

	// 			var xhr = new XMLHttpRequest();
	// 			// Update the endpoint to your custom upload handler
	// 			xhr.open("POST", "/api/method/photos.my_drive.page.my_drive_v2.my_drive_v2.upload_file", true);
	// 			xhr.setRequestHeader("Accept", "application/json");
	// 			xhr.setRequestHeader("X-Frappe-CSRF-Token", frappe.csrf_token);
	// 			xhr.setRequestHeader("Expect", "");

	// 			let form_data = new FormData();
	// 			form_data.append("file", file, file);
	// 			form_data.append("folder", folder);

	// 			xhr.onload = function () {
	// 				if (xhr.status === 200) {
	// 					console.log("File uploaded successfully:", xhr.responseText);
	// 					let response = JSON.parse(xhr.responseText);
	// 					// Add permissions

	// 					if (response.message.success) {
	// 						let files = response.message.uploaded_files
	// 						let folder = response.message.folder
	// 						self.handlePermissions(files)
	// 						// console.log("uploading files",response.message.uploaded_files);
	// 						// console.log(`response files :${files}`);
	// 						// console.log(`response folders : ${folder}`);
	// 						self.makeURL(folder)
	// 						self.BackButton()
	// 						self.fileGrid()
	// 						self.FileUI(files)
	// 					} else {
	// 						frappe.msgprint(__("File uploaded successfully! {0} files uploaded.", [response.message.total_uploaded]));
	// 					}

	// 				} else {
	// 					console.error("Upload failed:", xhr.statusText);
	// 					frappe.throw(__("Error uploading file: {0}", [xhr.statusText]));
	// 				}
	// 			};

	// 			xhr.onerror = function () {
	// 				console.error("Upload failed:", xhr.statusText);
	// 				frappe.msgprint(__("Error uploading file"));
	// 			};

	// 			xhr.send(form_data);
	// 			console.log("form data send to server", form_data);
	// 		};

	// 		file_input.click();
	// 	});
	// },


	// this below function was uploadLarge() => uploadFile because of error 
	
	uploadFile() {
		let self = this
		// button name was Upload Big File Upload File=>
		this.page.add_action_item(__('<i class="fa fa-file"></i> Upload File'), async function () {
			try {
				const input = document.createElement("input");
				input.type = "file";
				input.onchange = async function () {
					const file = input.files[0];
					const folder = self.current_folder;
					const chunkSize = 4 * 1024 * 1024; // 4MB
					const totalChunks = Math.ceil(file.size / chunkSize);
					const uploadId = frappe.utils.get_random(10);

					let finalResponse = null;

					for (let i = 0; i < totalChunks; i++) {
						const chunk = file.slice(
							i * chunkSize,
							(i + 1) * chunkSize
						);

						let formData = new FormData();
						formData.append("file", chunk);
						formData.append("file_name", file.name);
						formData.append("chunk_index", i);
						formData.append("total_chunks", totalChunks);
						formData.append("folder", folder);
						formData.append("upload_id", uploadId);

						const res = await fetch("/api/method/photos.my_drive.page.my_drive_v2.my_drive_v2.upload_file_chunk",
							{
								method: "POST",
								headers: {
									"X-Frappe-CSRF-Token": frappe.csrf_token
								},
								body: formData
							}
						);
						try {
							const json = await res.json();
							if (json?.message?.success) {
								finalResponse = json.message;
								console.log("finalResponse",finalResponse);
							}
						} catch (e) {
							console.log("error",e);
							// Non-final chunks won't return JSON → ignore
						}

						let percent = Math.round(((i + 1) / totalChunks) * 100);
						console.log(`Uploading ${percent}%`);

						frappe.show_progress(__("Uploading ") + file.name, percent);


						// frappe.show_progress(__("Uploading File"),percent,__(`Uploading ${percent}%`),true);
					}

					if (finalResponse && finalResponse.success) {
						const files = finalResponse.uploaded_files;
						const folder = finalResponse.folder;

						$(".empty-state-1").remove();

						self.handlePermissions(files);
						
						self.makeURL(folder);
						self.BackButton();
						self.FileUI(files);

						frappe.show_alert({
							message: __("File uploaded successfully"),
							indicator: "green"
						});
					}

					frappe.hide_progress();

					frappe.show_alert("Upload completed");
				};
				input.click();
			} catch (e) {
				frappe.hide_progress();
				frappe.msgprint({
					title: __("Upload Failed"),
					message: e.message || __("Something went wrong"),
					indicator: "red"
				});
			}
		});

		
	},


	async uploadBigFile(file,folder) {
		let self = this
			var file_data = file
			var current_folder = folder
			try {
				const file = file_data
				const folder = current_folder;
				const chunkSize = 4 * 1024 * 1024; // 4MB
				const totalChunks = Math.ceil(file.size / chunkSize);
				const uploadId = frappe.utils.get_random(10);

				var sizeofFile = formatBytes(file.size)

				let finalResponse = null;

				for (let i = 0; i < totalChunks; i++) {
					const chunk = file.slice(
						i * chunkSize,
						(i + 1) * chunkSize
					);

					let formData = new FormData();
					formData.append("file", chunk);
					formData.append("file_name", file.name);
					formData.append("chunk_index", i);
					formData.append("total_chunks", totalChunks);
					formData.append("folder", folder);
					formData.append("upload_id", uploadId);

					const res = await fetch("/api/method/photos.my_drive.page.my_drive_v2.my_drive_v2.upload_file_chunk",
						{
							method: "POST",
							headers: {
								"X-Frappe-CSRF-Token": frappe.csrf_token
							},
							body: formData
						}
					);
					try {
						const json = await res.json();
						if (json?.message?.success) {
							finalResponse = json.message;
							console.log("finalResponse",finalResponse);
						}
					} catch (e) {
						console.log("error",e);
						// Non-final chunks won't return JSON → ignore
					}

					let percent = Math.round(((i + 1) / totalChunks) * 100);
					console.log(`Uploading ${percent}%`);

					frappe.show_progress(__(`Uploading file ${file.name} ,${sizeofFile}`) + file.name, percent);


					// frappe.show_progress(__("Uploading File"),percent,__(`Uploading ${percent}%`),true);
				}

				if (finalResponse && finalResponse.success) {
					const files = finalResponse.uploaded_files;
					const folder = finalResponse.folder;

					$(".empty-state-1").remove();

					self.handlePermissions(files);
					
					self.makeURL(folder);
					self.BackButton();
					self.FileUI(files);

					frappe.show_alert({
						message: __("File uploaded successfully"),
						indicator: "green"
					});
				}

				frappe.hide_progress();

				frappe.show_alert("Upload completed");
			} catch (e) {
				frappe.hide_progress();
				frappe.msgprint({
					title: __("Upload Failed"),
					message: e.message || __("Something went wrong"),
					indicator: "red"
				});
			}
	},

	

	upload_button() {
		console.log("upload button called")
		let self = this
		$(document).off("click", "#upload-file").on("click", "#upload-file", function (event) {
			console.log("called")
			// this.uploadFile()
			var file_input = document.createElement("input");
			file_input.type = "file";
			file_input.accept = ".pdf, .xls, .xlsx, .doc, .docx, .png, .jpg, .jpeg, .gif";
			console.log("current folder = ", self.current_folder);

			file_input.onchange = function () {
				var file = file_input.files[0];
				let folder = self.current_folder;
				// console.log("Uploading file to ...", folderName);
				// console.table("file",file);

				var xhr = new XMLHttpRequest();
				// Update the endpoint to your custom upload handler
				xhr.open("POST", "/api/method/photos.my_drive.page.my_drive.my_drive.upload_file_to_my_drive", true);
				xhr.setRequestHeader("Accept", "application/json");
				xhr.setRequestHeader("X-Frappe-CSRF-Token", frappe.csrf_token);

				let form_data = new FormData();
				form_data.append("file", file, file.name);
				form_data.append("folder", folder);

				xhr.onload = function () {
					if (xhr.status === 200) {
						console.log("File uploaded successfully:", xhr.responseText);
						let response = JSON.parse(xhr.responseText);
						// Add permissions

						if (response.message.success) {
							let files = response.message.uploaded_files
							let folder = response.message.folder
							self.handlePermissions(files)
							// console.log("uploading files",response.message.uploaded_files);
							// console.log(`response files :${files}`);
							// console.log(`response folders : ${folder}`);
							self.makeURL(folder)
							self.BackButton()
							self.fileGrid()
							self.FileUI(files)
						} else {
							frappe.msgprint(__("File uploaded successfully! {0} files uploaded.", [response.message.total_uploaded]));
						}


					} else {
						console.error("Upload failed:", xhr.statusText);
						frappe.msgprint(__("Error uploading file: {0}", [xhr.statusText]));
					}
				};

				xhr.onerror = function () {
					console.error("Upload failed:", xhr.statusText);
					frappe.msgprint(__("Error uploading file"));
				};

				xhr.send(form_data);
				console.log("form data send to server", form_data);
			};

			file_input.click();
		})
	},

	newFolder() {
		let self = this
		this.page.add_action_item(__(' <i class="fa fa-plus"></i> New Folder'), function () {
			console.log("current_folder : ", self.current_folder);
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
					console.log(values.value);
					frappe.call({
						method: "frappe.core.api.file.create_new_folder",
						args: data,
						callback: function (response) {
							if (response.message) {
								console.log(response.message);
								let file_id = response.message.name
								let file_name = response.message.file_name
								console.log(file_id, file_name);
								$(".frappe-list .no-result").remove();

								if ($(".frappe-list result").length > 0) {
									console.log(".no-result already exists.");
								} else {
									console.log(".no-result not found — creating it...");

									// create and append your no-result box
									$(".frappe-list").append(`
										<div class="result file-grid-view">
											<div class="file-grid"></div>
										</div>
									`);
								}

								frappe.db.get_value('Drive Manager', { 'attached_to_name': file_id }, "name")
									.then(r => {
										if (r.message) {
											console.log("got drive_id ", r.message)
											let fileContainer = document.querySelector(".file-grid"); // Adjust selector as needed
											let newFileBox = document.createElement("div");
											newFileBox.className = "file";
											newFileBox.innerHTML = `
											<div class="file-header">
												<input class="level-item checkbox hidden-xs" type="checkbox" data-file-id=${file_id} data-drive-id=${r.message.name}>
											</div>
											<a href="#" class="open-folder" data-folder-name="${file_id}">
												<span class="corner"></span>
													<div class="file-body">
														<svg class="icon" style="width: 71px; height: 75px" aria-hidden="true">
															<use href="#icon-folder-normal-large"></use>
														</svg>
										
														</div>
												<div class="file-name">
													${file_name}
													<br>
													<small>Added: Jan 22, 2014</small>
												</div>
											</a>
										`;
											fileContainer.prepend(newFileBox);

										}
									})



								setTimeout(() => {
									frappe.show_alert({
										message: __('Folder {0} created successfully! inside {1}', [values.value, self.current_folder]),
										indicator: 'green'
									}, 3);
								}, 700);

								console.log("Created Folder successfully")

								// frappe.msgprint(__("Folder '{0}' created successfully", [values.value]));
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
	},

	makeURL(folder) {
		// let self = this
		console.log(`making URL for :${folder} nd the current folder ${this.current_folder}`);
		this.current_folder = folder;
		// this.page.set_title(__(this.current_folder));

		let folder_path = folder;
		const folders1 = folder_path.split("/");
		const set_title = folders1[folders1.length - 1]

		// console.log("set_title",set_title);
		// console.log("folder_path",folder_path);
		// console.log("folder1",folders1);


		this.page.set_title(__(set_title));

		let base_url = window.location.pathname
		// console.log("base_url", base_url);
		let newUrl = base_url.split("my-drive-v2")[0] + "my-drive-v2/" + this.current_folder;
		// console.log(`open Folder ${folder} newUrl`, newUrl);
		history.pushState({ folder: folder }, "", newUrl);
	},

	uploadFolder() {
		let self = this;
		this.page.add_action_item(__('<i class="fa fa-folder"></i> Upload Folder'), function () {
			var folder_input = document.createElement("input");
			folder_input.type = "file";
			folder_input.accept = ".pdf, .xls, .xlsx, .doc, .docx, .png, .jpg, .jpeg, .gif";
			folder_input.webkitdirectory = true;  // This enables folder selection
			folder_input.multiple = true;

			folder_input.onchange = function () {
				const files = Array.from(folder_input.files);

				console.log("Selected files:", files);

				if (files.length === 0) {
					frappe.msgprint(__("No files selected"));
					return;
				}

				// Filter valid files
				const allowedExtensions = ['pdf', 'xls', 'xlsx', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'gif'];
				const validFiles = files.filter(file => {
					const extension = file.name.split('.').pop().toLowerCase();
					return allowedExtensions.includes(extension);
				});

				if (validFiles.length === 0) {
					frappe.msgprint(__("No valid files found. Only these types are allowed: pdf, xls, xlsx, doc, docx, png, jpg, jpeg, gif"));
					return;
				}

				console.log(`Uploading ${validFiles.length} files from nested folders to ${self.current_folder}`);

				// Prepare nested folder structure data
				const folderData = self.prepareNestedFolderData(validFiles);
				console.log("Nested folder structure:", folderData);

				// Send to server
				self.sendNestedFolderToServer(folderData);
			};

			folder_input.click();
		});
	},

	prepareNestedFolderData(files) {
		let self = this;
		const folderStructure = [];
		const allFolderPaths = new Set(); // Track all unique folder paths

		files.forEach(file => {
			const relativePath = file.webkitRelativePath; // e.g., "folder1/folder2/file.txt"
			const pathParts = relativePath.split('/');
			const fileName = pathParts[pathParts.length - 1];
			const folderPath = pathParts.slice(0, -1).join('/'); // "folder1/folder2"

			// Add all parent folder paths to our set
			if (folderPath) {
				// For "folder1/folder2", we need to create both "folder1" and "folder1/folder2"
				const folders = pathParts.slice(0, -1); // ["folder1", "folder2"]
				let currentPath = "";

				folders.forEach(folder => {
					currentPath = currentPath ? `${currentPath}/${folder}` : folder;
					allFolderPaths.add(currentPath);
				});
			}

			folderStructure.push({
				file: file,
				fileName: fileName,
				folderPath: folderPath, // Complete path: "folder1/folder2"
				relativePath: relativePath, // Complete path with file: "folder1/folder2/file.txt"
				fullPath: relativePath // Keep original for debugging
			});
		});

		console.log("All unique folder paths needed:", Array.from(allFolderPaths));
		console.log("Files with their paths:", folderStructure);

		return {
			files: folderStructure,
			folderPaths: Array.from(allFolderPaths) // All unique folder paths that need to be created
		};
	},

	sendNestedFolderToServer(folderData) {
		let self = this;
		let baseFolderName = self.current_folder;

		// Create FormData for multiple files and folder structure

		console.log("sending nested folderdata", folderData);
		let top_level = folderData.folderPaths[0]

		let uploadDialog = this.createUploadProgressDialog(folderData.files);

		let form_data = new FormData();
		form_data.append("top_folder", top_level); // Top-level folder
		form_data.append("base_folder", baseFolderName);
		form_data.append("total_files", folderData.files.length);
		form_data.append("total_folders", folderData.folderPaths.length);

		// Add folder paths that need to be created
		folderData.folderPaths.forEach((folderPath, index) => {
			form_data.append(`folder_to_create_${index}`, folderPath);
		});

		// Add each file with its path info
		folderData.files.forEach((fileInfo, index) => {
			form_data.append(`file_${index}`, fileInfo.file, fileInfo.fileName);
			form_data.append(`folder_path_${index}`, fileInfo.folderPath);
			form_data.append(`relative_path_${index}`, fileInfo.relativePath);
			form_data.append(`full_path_${index}`, fileInfo.fullPath);
		});

		var xhr = new XMLHttpRequest();
		xhr.open("POST", "/api/method/photos.my_drive.page.my_drive_v2.my_drive_v2.upload_nested_folder_to_my_drive", true);
		xhr.setRequestHeader("Accept", "application/json");
		xhr.setRequestHeader("X-Frappe-CSRF-Token", frappe.csrf_token);

		xhr.onload = function () {
			if (xhr.status === 200) {
				let response = JSON.parse(xhr.responseText);
				console.log("Server response:", response);

				if (response.message && response.message.success) {
					let files = response.message.uploaded_files;
					let folder = response.message.folder;
					let folders = response.message.uploaded_folders;
					let createdFolders = response.message.created_folders;

					let matchedFiles = files.filter(item => item.folder === folder);
					let matchedFolders = folders.filter(item => item.folder === folder);

					let files_folders = [...matchedFiles, ...matchedFolders];

					console.log("Files uploaded to the current folder", files_folders);

					self.completeAllUploads(uploadDialog, files.length, createdFolders);

					// console.log(`Successfully created ${createdFolders} folders and uploaded ${files.length} files`);

					let folder_path = folder;
					let folders1 = folder_path.split("/");
					let foldername = folders1[folders1.length - 1]

					self.handlePermissions(files_folders);

					let breadcrumb = $(".level-item");
					let add_folder = `<a href="#" class="open-folder" data-folder-name=${folder_path}>${foldername}</a>`
					breadcrumb.append(`&nbsp/&nbsp;${add_folder}`);


					if ($(".frappe-list .result").length > 0) {
						console.log("if .result");

						$(".frappe-list .result").remove();
					}

					if ($(".frappe-list .no-result").length > 0) {
						console.log("if .no-result");
						$(".frappe-list .no-result").remove();
					}


					$(".frappe-list").prepend(`
						<div class="result file-grid-view">
							<div class="file-grid"></div>
						</div>`
					);

					self.makeURL(folder);
					self.BackButton();
					self.FileUI(files_folders); // Use your existing FileUI with animation

					// frappe.show_alert({
					// 	message: __('Nested folder structure uploaded! {0} folders created, {1} files uploaded.', [createdFolders, files.length]),
					// 	indicator: 'green'
					// }, 5);

				} else {
					self.handleUploadError(uploadDialog, response.message?.message || "Unknown error");
					frappe.msgprint(__("Upload failed: {0}", [response.message?.message || "Unknown error"]));
				}
			} else {
				self.handleUploadError(uploadDialog, xhr.statusText);
				console.error("Folder upload failed:", xhr.statusText);
				frappe.msgprint(__("Error uploading folder: {0}", [xhr.statusText]));
			}
		};

		xhr.onerror = function () {
			self.handleUploadError(uploadDialog, "Network error");
			console.error("Folder upload failed:", xhr.statusText);
			frappe.msgprint(__("Error uploading folder"));
		};

		// Show progress with more detail
		xhr.upload.onprogress = function (event) {
			if (event.lengthComputable) {
				const percentComplete = (event.loaded / event.total) * 100;
				console.log(`Nested folder upload progress: ${percentComplete.toFixed(2)}%`);
				self.updateUploadProgress(uploadDialog, percentComplete, folderData.files);
				// Optional: Show progress bar
				// frappe.show_progress('Uploading...', percentComplete, 100);
			}
		};

		xhr.send(form_data);
	},

	createUploadProgressDialog(files) {	
		// Remove existing upload dialog if any
		$('.upload-progress-dialog').remove();

		const totalFiles = files.length;

		let dialogHTML = `
			<div class="upload-progress-dialog" style="
				position: fixed;
				bottom: 20px;
				right: 20px;
				width: 350px;
				max-height: 400px;
				background: white;
				border-radius: 8px;
				box-shadow: 0 4px 12px rgba(0,0,0,0.15);
				z-index: 1050;
				font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			">
				<div class="upload-header" style="
					padding: 16px 20px 12px;
					border-bottom: 1px solid #e5e7eb;
					display: flex;
					justify-content: space-between;
					align-items: center;
				">
					<div style="display: flex; align-items: center; gap: 8px;">
						<div class="upload-status-icon" style="
							width: 20px;
							height: 20px;
							border: 2px solid #3b82f6;
							border-top: 2px solid transparent;
							border-radius: 50%;
							animation: spin 1s linear infinite;
						"></div>
						<span class="upload-status-text" style="font-weight: 500; color: #374151;">
							Uploading ${totalFiles} files
						</span>
					</div>
					<button class="close-dialog" style="
						background: none;
						border: none;
						font-size: 18px;
						cursor: pointer;
						color: #6b7280;
						padding: 0;
						width: 20px;
						height: 20px;
						display: flex;
						align-items: center;
						justify-content: center;
					" onclick="this.closest('.upload-progress-dialog').remove()">×</button>
				</div>
				
				<div class="upload-body" style="
					max-height: 300px;
					overflow-y: auto;
					padding: 0;
				">
					<div class="file-list" style="padding: 0;">
						${files.map((fileInfo, index) => `
							<div class="file-item" data-file-index="${index}" style="
								padding: 12px 20px;
								border-bottom: 1px solid #f3f4f6;
							">
								<div style="display: flex; align-items: center; gap: 12px;">
									<div class="file-icon" style="
										width: 24px;
										height: 24px;
										background: #f3f4f6;
										border-radius: 4px;
										display: flex;
										align-items: center;
										justify-content: center;
										font-size: 10px;
										color: #6b7280;
										flex-shrink: 0;
									">
										${this.getFileIcon(fileInfo.fileName)}
									</div>
									<div class="file-info" style="flex: 1; min-width: 0;">
										<div class="file-name" style="
											font-size: 13px;
											color: #374151;
											white-space: nowrap;
											overflow: hidden;
											text-overflow: ellipsis;
											font-weight: 500;
										">${fileInfo.fileName}</div>
										<div class="file-progress-text" style="
											font-size: 11px;
											color: #6b7280;
											margin-top: 2px;
										">Waiting...</div>
									</div>
									<div class="file-status" style="
										width: 16px;
										height: 16px;
										border: 1.5px solid #d1d5db;
										border-radius: 50%;
										flex-shrink: 0;
										display: flex;
										align-items: center;
										justify-content: center;
									">
										<div style="
											width: 6px;
											height: 6px;
											background: #d1d5db;
											border-radius: 50%;
										"></div>
									</div>
								</div>
								
								<!-- Individual file progress bar -->
								<div class="file-progress-bar" style="
									width: 100%;
									height: 3px;
									background: #e5e7eb;
									border-radius: 2px;
									margin-top: 8px;
									overflow: hidden;
									display: none;
								">
									<div class="file-progress-fill" style="
										height: 100%;
										background: #3b82f6;
										width: 0%;
										transition: width 0.3s ease;
										border-radius: 2px;
									"></div>
								</div>
							</div>
						`).join('')}
					</div>
				</div>
				
				<div class="upload-footer" style="
					padding: 12px 20px;
					border-top: 1px solid #e5e7eb;
					background: #f9fafb;
					border-radius: 0 0 8px 8px;
				">
					<div class="progress-info" style="
						display: flex;
						justify-content: space-between;
						align-items: center;
						font-size: 12px;
						color: #6b7280;
					">
						<span class="overall-status">Starting upload...</span>
						<span class="files-count">0 of ${totalFiles} completed</span>
					</div>
				</div>
			</div>
			
			<style>
				@keyframes spin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}
				
				.upload-progress-dialog .upload-body::-webkit-scrollbar {
					width: 4px;
				}
				
				.upload-progress-dialog .upload-body::-webkit-scrollbar-track {
					background: #f1f5f9;
				}
				
				.upload-progress-dialog .upload-body::-webkit-scrollbar-thumb {
					background: #cbd5e1;
					border-radius: 2px;
				}
			</style>
		`;

		$('body').append(dialogHTML);
		return $('.upload-progress-dialog');
	},

	updateUploadProgress(dialog, percentComplete, files) {
		let self = this
		const totalFiles = files.length;

		// Calculate total size of all files
		const totalSize = files.reduce((sum, fileInfo) => sum + (fileInfo.file.size || 0), 0);
		const uploadedBytes = (percentComplete / 100) * totalSize;

		let currentUploadedBytes = 0;
		let completedFiles = 0;
		let currentUploadingIndex = -1;
		let currentFileProgress = 0;

		// Calculate which files are completed and current file progress
		for (let i = 0; i < files.length; i++) {
			const fileSize = files[i].file.size || 0;

			if (currentUploadedBytes + fileSize <= uploadedBytes) {
				// This file is completed
				currentUploadedBytes += fileSize;
				completedFiles++;
			} else {
				// This file is currently being uploaded
				currentUploadingIndex = i;
				const remainingBytes = uploadedBytes - currentUploadedBytes;
				currentFileProgress = fileSize > 0 ? (remainingBytes / fileSize) * 100 : 0;
				break;
			}
		}

		// Update overall status
		dialog.find('.overall-status').text(`Uploading files... ${Math.round(percentComplete)}%`);
		dialog.find('.files-count').text(`${completedFiles} of ${totalFiles} completed`);

		// Update individual file progress
		dialog.find('.file-item').each(function (index) {
			const $fileItem = $(this);
			const $progressBar = $fileItem.find('.file-progress-bar');
			const $progressFill = $fileItem.find('.file-progress-fill');
			const $progressText = $fileItem.find('.file-progress-text');
			const $status = $fileItem.find('.file-status');
			const fileSize = files[index].file.size || 0;
			const fileSizeText = self.formatFileSize(fileSize);

			if (index < completedFiles) {
				// File completed
				$progressBar.show();
				$progressFill.css('width', '100%').css('background', '#10b981');
				$progressText.text(`Completed • ${fileSizeText}`).css('color', '#059669');
				$status.html(`
					<div style="
						width: 12px;
						height: 12px;
						background: #10b981;
						border-radius: 50%;
						display: flex;
						align-items: center;
						justify-content: center;
					">
						<svg width="8" height="6" viewBox="0 0 8 6" fill="none">
							<path d="M1 3L3 5L7 1" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</div>
				`).css('border', 'none');

			} else if (index === currentUploadingIndex) {
				// Currently uploading file
				$progressBar.show();
				$progressFill.css('width', Math.max(0, Math.min(100, currentFileProgress)) + '%').css('background', '#3b82f6');
				$progressText.text(`Uploading ${Math.round(currentFileProgress)}% • ${fileSizeText}`).css('color', '#3b82f6');
				$status.html(`
					<div style="
						width: 12px;
						height: 12px;
						border: 2px solid #3b82f6;
						border-top: 2px solid transparent;
						border-radius: 50%;
						animation: spin 1s linear infinite;
					"></div>
				`).css('border', 'none');

			} else {
				// Waiting files
				$progressBar.hide();
				$progressText.text(`Waiting... • ${fileSizeText}`).css('color', '#6b7280');
				$status.html(`
					<div style="
						width: 6px;
						height: 6px;
						background: #d1d5db;
						border-radius: 50%;
					"></div>
				`).css('border', '1.5px solid #d1d5db');
			}
		});
	},

	formatFileSize(bytes) {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	},

	completeAllUploads(dialog, uploadedFiles, createdFolders) {
		// Stop loading animation
		dialog.find('.upload-status-icon').css('animation', 'none').html(`
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
				<path d="M3 8L6 11L13 4" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		`).css({
			'border': 'none',
			'background': '#10b981',
			'border-radius': '50%',
			'display': 'flex',
			'align-items': 'center',
			'justify-content': 'center'
		});

		// Update header text
		dialog.find('.upload-status-text').text(`${uploadedFiles} uploads completed`).css('color', '#059669');

		// Update footer status
		dialog.find('.overall-status').text('All uploads completed!').css('color', '#059669');
		dialog.find('.files-count').text(`${uploadedFiles} of ${uploadedFiles} completed`);

		// Mark all files as completed with individual progress bars at 100%
		dialog.find('.file-item').each(function () {
			const $fileItem = $(this);
			const $progressBar = $fileItem.find('.file-progress-bar');
			const $progressFill = $fileItem.find('.file-progress-fill');
			const $progressText = $fileItem.find('.file-progress-text');
			const $status = $fileItem.find('.file-status');

			$progressBar.show();
			$progressFill.css('width', '100%').css('background', '#10b981');
			$progressText.text('Completed').css('color', '#059669');
			$status.html(`
				<div style="
					width: 12px;
					height: 12px;
					background: #10b981;
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
				">
					<svg width="8" height="6" viewBox="0 0 8 6" fill="none">
						<path d="M1 3L3 5L7 1" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</div>
			`).css('border', 'none');
		});
		// Auto-hide after 5 seconds
		setTimeout(() => {
			dialog.fadeOut(300, function () {
				$(this).remove();
			});
		}, 5000);
	},

	handleUploadError(dialog, errorMessage) {
		// Update to error state
		dialog.find('.upload-status-icon').css('animation', 'none').html('⚠').css({
			'border': 'none',
			'background': '#ef4444',
			'color': 'white',
			'border-radius': '50%',
			'display': 'flex',
			'align-items': 'center',
			'justify-content': 'center'
		});
		dialog.find('.upload-status-text').text('Upload failed').css('color', '#dc2626');
		dialog.find('.overall-status').text('Upload failed').css('color', '#dc2626');

		// Mark remaining files as failed with red progress bars
		dialog.find('.file-item').each(function () {
			const $fileItem = $(this);
			const $progressText = $fileItem.find('.file-progress-text');
			const $progressBar = $fileItem.find('.file-progress-bar');
			const $progressFill = $fileItem.find('.file-progress-fill');

			if ($progressText.text() !== 'Completed') {
				$progressBar.show();
				$progressFill.css('background', '#ef4444').css('width', '100%');
				$progressText.text('Failed').css('color', '#dc2626');
			}
		});
	},

	getFileIcon(filename) {
		const extension = filename.split('.').pop().toLowerCase();
		const icons = {
			'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'svg': '🖼️',
			'pdf': '📄', 'doc': '📝', 'docx': '📝', 'txt': '📝',
			'xls': '📊', 'xlsx': '📊', 'csv': '📊',
			'mp4': '🎥', 'mov': '🎥', 'avi': '🎥',
			'mp3': '🎵', 'wav': '🎵', 'flac': '🎵',
			'zip': '📦', 'rar': '📦', '7z': '📦',
			'default': '📁'
		};

		return icons[extension] || icons['default'];
	},

	fileGrid() {

		if ($(".frappe-list .no-result").length > 0) {
			console.log(".no-result already exists.");

			$(".frappe-list .no-result").remove();      // remove empty state here which means add file-grid


			if ($($(".result.file-grid-view").length && $(".result.file-grid-view .file-grid .file")).length > 0) {
				console.log("if");

				console.log("files exist");

			} else {
				console.log("else");

				$(".frappe-list").append(`
					<div class="result file-grid-view">
						<div class="file-grid"></div>
					</div>`
				);

				return

			}

		} else if ($(".result.file-grid-view .file-grid .file").length === 0) {
			console.log(" .result file not found");
			console.log("emptyState called");

			emptyState()
			return


		} else if ($($(".result.file-grid-view").length && $(".result.file-grid-view .file-grid .file")).length > 0) {

			console.log("files exist");

		}
		else {
			console.log("outer else");

			$(".frappe-list").append(`
				<div class="result file-grid-view">
					<div class="file-grid"></div>
				</div>`
			);
		}

	},

	FileUI(files) {
		let self = this;

		let fileContainer = document.querySelector(".file-grid");
		const allowedTypes = ["pdf", "xls", "xlsx", "doc", "docx"];
		console.log("inside files UI", files);

		files.forEach((file, index) => {
			setTimeout(() => {
				// Create a NEW element for EACH file
				let newFileBox = document.createElement("div");
				if (file.file_name.includes('.')) {
					console.log("files", file.file_name);
					const fileExtension = file.file_name.split('.').pop().toLowerCase();
					if (allowedTypes.includes(fileExtension)) {
						let iconSrc = "";
						let linkClass = "";
						switch (fileExtension) {
							case "xls":
							case "xlsx":
							case "csv":
								iconSrc = "/assets/photos/xls.png";
								linkClass = "open-spreadsheet";
								break;

							case "pdf":
								iconSrc = "/assets/photos/file.png";
								linkClass = "open-pdf";
								break;
							// case "doc":
							// case "docx":
							// 	iconSrc = "/assets/photos/word.png";
							// 	linkClass = "open-document";
							// 	break;

							// default:
							// 	iconSrc = "/assets/photos/file.png";
							// 	linkClass = "open-file";
							// 	break;
						}

						newFileBox.className = "file";
						newFileBox.innerHTML = `
								<div class="file-header">
									<input class="level-item checkbox hidden-xs" type="checkbox" data-file-id="${file.file_id}" data-docname="${file.drive_id}">
								</div>
								<a href="#"  class="${linkClass}" data-file-url="${file.file_url}" data-name="${file.file_id}">
									<span class="corner"></span>
									<div class="file-body">
										<img alt="File Icon" style="width: 77px; height: 90px" class="icon" src="${iconSrc}">
									</div>
									
									<div class="file-name">
										${file.file_name}
										<br>
										<small>Just now</small>
									</div>
								</a>
							`;
					} else {
						// Image file
						newFileBox.className = "file";
						newFileBox.innerHTML = `
							<div class="file-header">
								<input class="level-item checkbox hidden-xs" type="checkbox" data-file-id="${file.file_id}" data-docname="${file.drive_id}">
							</div>
							<a href="#" class="image-preview" data-file-url="${file.file_url}" data-file-id="${file.file_id}" data-drive-id="${file.drive_id}">
								<span class="corner"></span>
								<div class="image">
									<img alt="image" class="img-responsive" src="${file.file_url}">
								</div>
								<div class="file-name">
									${file.file_name}
									<br>
									<small>Just now</small>
								</div>
							</a>
						`;
					}
				} else {
					console.log("folders", file.file_id);
					newFileBox.classList.add("file");
					newFileBox.innerHTML = `
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
					`;
					// fileDisplayArea.appendChild(newFileBox);

					self.openFolder()
				}
				// Add fade-in animation
				newFileBox.style.opacity = '0';
				newFileBox.style.transform = 'translateY(20px)';
				newFileBox.style.transition = 'all 0.3s ease-in-out';

				// Add THIS file's element to the container
				fileContainer.prepend(newFileBox);

				// Trigger fade-in animation
				setTimeout(() => {
					newFileBox.style.opacity = '1';
					newFileBox.style.transform = 'translateY(0)';
				}, 50);

				// Show upload progress message
				console.log(`File ${index + 1}/${files.length} added ${file.file_name} to UI`);

			}, index * 300); // 300ms delay between each file
		});

		// Show completion message after all files are added
		setTimeout(() => {
			frappe.show_alert({
				message: __('All {0} files uploaded successfully!', [files.length]),
				indicator: 'green'
			}, 3);
		}, files.length * 300 + 500);
	},

	all_files(files) {
		let self = this
		// const folders = data.filter(file => file.is_folder);
		// const files = data.filter(file => !file.is_folder);
		console.log(" files - ", files)
		const fileContainer = document.querySelector(".file-grid");
		if (!fileContainer) return console.error("No .file-grid found");

		const allowedTypes = ["pdf", "xls", "xlsx", "doc", "docx"];

		if (files.length > 0) {
			console.log(" if files- ", files)
			files.forEach((file, index) => {
				// Create a NEW element for EACH file
				let newFileBox = document.createElement("div");

				if (file.is_folder) {

					console.log("folders", file.file_id);
					newFileBox.classList.add("file");
					newFileBox.innerHTML = `
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
					`;
					// fileDisplayArea.appendChild(newFileBox);

					self.openFolder()


				}



				else if (file.file_name.includes('.')) {
					console.log("files", file.file_name);
					const fileExtension = file.file_name.split('.').pop().toLowerCase();
					if (allowedTypes.includes(fileExtension)) {
						let iconSrc = "";
						let linkClass = "";
						switch (fileExtension) {
							case "xls":
							case "xlsx":
							case "csv":
								iconSrc = "/assets/photos/xls.png";
								linkClass = "open-spreadsheet";
								break;

							case "pdf":
								iconSrc = "/assets/photos/file.png";
								linkClass = "open-pdf";
								break;
						}

						newFileBox.className = "file";
						newFileBox.innerHTML = `
							<div class="file-header">
								<input class="level-item checkbox hidden-xs" type="checkbox" data-file-id="${file.file_id}" data-docname="${file.drive_id}">
							</div>
							<a href="#"  class="${linkClass}" data-file-url="${file.file_url}" data-name="${file.file_id}">
								<span class="corner"></span>
								<div class="file-body">
									<img alt="File Icon" style="width: 77px; height: 90px" class="icon" src="${iconSrc}">
								</div>
								
								<div class="file-name">
									${file.file_name}
									<br>
									<small>${file.creation}</small>
								</div>
							</a>
						`;
					} else {
						// Image file
						newFileBox.className = "file";
						newFileBox.innerHTML = `
							<div class="file-header">
								<input class="level-item checkbox hidden-xs" type="checkbox" data-file-id="${file.file_id}" data-docname="${file.drive_id}">
							</div>
							<a href="#" class="image-preview" data-file-url="${file.file_url}" data-file-id="${file.file_id}" data-drive-id="${file.drive_id}">
								<span class="corner"></span>
								<div class="image">
									<img alt="image" class="img-responsive" src="${file.file_url}">
								</div>
								<div class="file-name">
									${file.file_name}
									<br>
									<small>${file.creation}</small>
								</div>
							</a>
						`;
					}
				}
				
				newFileBox.style.opacity = '0';
				newFileBox.style.transform = 'translateY(20px)';
				newFileBox.style.transition = 'all 0.3s ease-in-out';

				// Add THIS file's element to the container
				fileContainer.prepend(newFileBox);

				// Trigger fade-in animation
				setTimeout(() => {
					newFileBox.style.opacity = '1';
					newFileBox.style.transform = 'translateY(0)';
				}, 50);

				// Show upload progress message
				console.log(`File ${index + 1}/${files.length} added ${file.file_name} to UI`);

			});

		}



	},

	openFolder() {
		this.Folders();
		let self = this;
		// Use event delegation - attach one listener to a parent element
		$(document).off("click", ".open-folder").on("click", ".open-folder", function (event) {
			event.preventDefault();  // Prevent default behavior
			$('.ellipsis').show(); //this ellipsis is back, share, delete button's container 
			console.log("folders_array", self.folders_array)

			let folder_path = $(this).data("folder-name");
			let drive_id = $(this).data("drive-id");
			let shared = $(this).data("is-shared");

			console.log("ISSSS SHAREDDDDD",shared);
			
			const folders1 = folder_path.split("/");
			const folder = folders1[folders1.length - 1]


			let limit_start = 0;
			let limit_page_length = 20;

			if (self.folders_array.includes(folder)) {
				console.log("If folder in Folder_array")
				console.log("⚪ If opened folder :", folder)
				console.log("⚪ Is Shared:", shared)


				$(this).nextAll().remove();
				const targetElement = folder;
				// Find the index of the target element
				const targetIndex = self.folders_array.indexOf(targetElement);
				// Check if the element was found (indexOf returns -1 if not found)
				if (targetIndex !== -1) {
					// If found, use splice() to remove elements starting from the next index.
					// The first argument is the starting index for removal.
					// The second argument is the number of elements to remove (0 means remove everything until the end).
					self.folders_array.splice(targetIndex + 1);
				}
				let breadcrumb = $(".level-item");
				let html = breadcrumb.html().trim();
				html = html.replace(/(&nbsp;|\/)+$/g, "");
				breadcrumb.html(html);

				self.page.set_title(__(folder));
				let base_url = window.location.pathname
				let newUrl = base_url.split("my-drive-v2")[0] + "my-drive-v2/" + folder_path;
				self.current_folder = folder_path

				history.pushState({ folder: folder_path }, "", newUrl);
				self.FolderContent(drive_id,shared,limit_start, limit_page_length)
				self.BackButton()
			} else {
				console.log("⚪ else opened folder:", folder)
				console.log("⚪ Is Shared:", shared)
				console.log("⚪ Drive Id:", drive_id)
				console.log("folder_path :", folder_path)
				console.log("current_folder last folder_path :", self.current_folder)
				console.log("split folders", folders1)
				self.folders_array.push(folder)

				self.page.set_title(__(folder));
				let base_url = window.location.pathname
				let newUrl = base_url.split("my-drive-v2")[0] + "my-drive-v2/" + folder_path;

				let breadcrumb = $(".level-item");
				let hasFolders = breadcrumb.find("a").filter(function () {
					return $(this).text().trim() === "Folders" || $(this).text().trim() === "Notifications";  // removing this from breadcrumb
				}).length > 0;

				if (hasFolders) {
					console.log("✅ Found 'Folders' link inside breadcrumb!");
					$(".standard-filter-section .level-item a").remove()
					// folders1.pop()
					console.log("in if folders array", self.folders_array)
					self.folders_array.length = 0
					folders1.forEach(folder => {
						console.log("okay folder", folder)
						console.log("⚪ Is Shared:", shared)

						console.log("and the drive_id", drive_id)

						// console.log("okay folder array",self.folders_array)
						let new_folder_path = make_folderPath(folder_path, folder)
						let add_folder = `<a href="#" class="open-folder" data-folder-name="${new_folder_path}" data-drive-id=${drive_id} data-is-shared=${shared}>${folder}</a>`

						if (folder == "Home") {
							// console.log("if folde is home called");
							
							breadcrumb.append(`&nbsp;<a href="#" class="go-home">Home</a>`);
							self.Home()

						} else {
							breadcrumb.append(`&nbsp/&nbsp;${add_folder}`);
						}

						self.folders_array.push(folder)

						// self.folders_array.pop()
					});

				} else {
					console.log("No 'Folders' link found.");
					let add_folder = `<a href="#" class="open-folder" data-folder-name="${folder_path}" data-drive-id=${drive_id} data-is-shared=${shared}>${folder}</a>`
					breadcrumb.append(`&nbsp/&nbsp;${add_folder}`);
				}

				

				self.current_folder = folder_path

				history.pushState({ folder: folder_path }, "", newUrl);
				self.FolderContent(drive_id,shared,limit_start, limit_page_length)
				// console.log("as well folder content");
				

				self.BackButton()
				console.log(`openFolder ENDS HERE... array of folder :- ${self.folders_array}`);
			}
		});
	},

	FolderContent(drive_id, shared, limit_start, limit_page_length) {
		let self = this
		console.log("get folder content for folder :", this.current_folder);
		frappe.call({
			method: "photos.my_drive.page.my_drive_v2.my_drive_v2.get_folder_contents",
			args: {
				folder: this.current_folder,
				drive_id:drive_id,
				shared:shared,
				limit_start: limit_start,
				limit_page_length: limit_page_length
			},
			callback: function (r) {
				if (r.message) {
					console.log("folder content", r.message);
					let files = r.message.files;
					let upload_only = r.message.upload_only;

					if (upload_only){
						console.log("its is upload only");

						$('ul.dropdown-menu li .menu-item-label[data-label="New%20Folder"]')
						.closest('li')
						.remove();

					}

					self.handlePermissions(files)

					console.log("permissions of folder contents",self.permissions);
									
					$(".frappe-list .result").remove();
					$(".frappe-list .no-result").remove();
					$(".frappe-list").prepend('<div class="result file-grid-view"></div>');
					$(".file-grid-view").append('<div class="file-grid"></div>')

					if (files.length === 0) {
						emptyState()
						self.upload_button()
						// fileDisplayArea.innerHTML = `<p class="center">This folder is empty. Upload files here.</p>`;
					} else {
						files.forEach(file => {
							if (file.is_folder) {
								let fileElement = document.createElement("div");
								fileElement.classList.add("file");
								fileElement.innerHTML = `
									<div class="file-header">
										<input class="level-item checkbox hidden-xs" type="checkbox" data-file-id=${file.file_id} data-docname=${file.drive_id}>
									</div>
									<a href="#" class="open-folder" data-folder-name="${file.file_id}" data-drive-id=${file.drive_id} data-is-shared=${file.shared}>
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
								`;

								if (file.shared) {
									const badge = document.createElement("div");
									badge.classList.add("shared-badge");
									badge.innerHTML = `<i class="fa fa-share-alt"></i>`;

									// Insert after .file-header
									fileElement.insertBefore(badge, fileElement.querySelector("a"));
								}
								$(".file-grid").append(fileElement);
							} else {
								if (file.file_type === "XLSX" || file.file_type === "XLS" || file.file_type === "CSV") {
									let fileElement = document.createElement("div");
									fileElement.classList.add("file");
									fileElement.innerHTML = `
										<div class="file-header">
												<input class="level-item checkbox hidden-xs" type="checkbox" data-file-id=${file.file_id} data-docname=${file.drive_id}>
										</div>
										<a href="#" class="open-spreadsheet" data-file-url="${file.file_url}" data-file-id=${file.file_id}>
											<span class="corner"></span>
											
											<div class="file-body">
												<img alt="File Icon" style="width: 75px; height: 90px" class="icon" src="/assets/photos/xls.png">
											</div>
											<div class="file-name">
												${file.file_name}
												<br>
												<small>${file.creation}</small>
											</div>
										</a>
									`;
									$(".file-grid").append(fileElement);
								} else if (file.file_type === "PDF") {
									let fileElement = document.createElement("div");
									fileElement.classList.add("file");
									fileElement.innerHTML = `
												<div class="file-header">
													<input class="level-item checkbox hidden-xs" type="checkbox" data-file-id=${file.file_id} data-docname=${file.drive_id}>
												</div>
												<a href="#" class="open-pdf" data-file-url="${file.file_url}" data-file-id=${file.file_id}>
													<span class="corner"></span>

													<div class="file-body">
														<img alt="File Icon" style="width: 77px; height: 90px" class="icon" src="/assets/photos/file.png">
													</div>
													<div class="file-name">
														${file.file_name}
														<br>
														<small>${file.creation}</small>
													</div>
												</a>
										`;
									$(".file-grid").append(fileElement);
								} else {
									// console.log("else part in open folder and image file id", file.file_id);
									let fileElement = document.createElement("div");
									fileElement.classList.add("file");
									fileElement.innerHTML = `
											<div class="file-header">
												<input class="level-item checkbox hidden-xs" type="checkbox" data-file-id=${file.file_id} data-docname=${file.drive_id}>
											</div>
											<a href="#" class="image-preview" data-file-url="${file.file_url}" data-file-id=${file.file_id} data-drive-id=${file.drive_id} data-tags="${file.persons}">
												<span class="corner"></span>
												<div class="image">
													<img alt="image" class="img-responsive" src="${file.file_url}">
												</div>
												<div class="file-name">
													${file.file_name}
													<br>
													<small>${file.creation}</small>
												</div>
											</a>
										`;
									$(".file-grid").append(fileElement);
								}
							}
						});
					}
				}
			}
		});

	},

	Shared() {
		let self = this;
		$(document).on("click", ".open-shared", function (event) {
			event.preventDefault(); // ✅ stops browser from appending #

			self.current_folder = "Shared";

			let base_url = window.location.pathname
			let newUrl = base_url.split("my-drive-v2")[0] + "my-drive-v2/" + self.current_folder;
			history.pushState({ folder: self.current_folder }, "", newUrl);

			self.page.set_title(__("Shared"));

			self.breadcrumb()
			$(".standard-filter-section .level-item a").remove()
			let add_folder = `<a href="#">Shared</a>`
			$(".standard-filter-section .level-item").append(add_folder)

			// $(".file-grid").remove() // removed becouse grid view means file boxes and for list view removed class file-grid

			// $(".result").remove()


			$(".frappe-list .result").remove();
			$(".frappe-list .no-result").remove();

			$(".frappe-list").prepend('<div class="result"></div>');


			const header = `<header class="level list-row-head text-muted">
						<div class="level-left list-header-subject">
							<div class="list-row-col list-subject level">
								<input class="level-item list-check-all hidden-xs" type="checkbox" title="Select All" />
								<span class="level-item" data-sort-by="full_name" title="Click to sort by Full Name">
									file Name
								</span>
							</div>
							<div class="list-row-col ellipsis hidden-xs">
								<span>Size</span>
							</div>
							<div class="list-row-col ellipsis hidden-xs">
								<span>Type</span>
							</div>
							<div class="list-row-col ellipsis hidden-xs">
								<span>Created</span>
							</div>
						</div>
						<div class="level-left checkbox-actions">
							<div class="level list-subject">
								<input class="level-item list-check-all" type="checkbox" title="Select All"/>
								<span class="level-item list-header-meta"></span>
							</div>
						</div>
						<div class="level-right">
							<span class="list-count"><span>Shared By</span></span>
						</div>
					</header>`

			$(".result").prepend(header);


			let limit_start = 0;
			let limit_page_length = 20;



			frappe.call({
				method: "photos.my_drive.page.my_drive_v2.my_drive_v2.get_shared_files",
				args: {
					user: frappe.session.user,
					folder:self.current_folder,
					limit_start:limit_start,
					limit_page_length:limit_page_length

				},
				callback: (r) => {
					console.log("callback return Shared files response:", r.message);


					if(r.message){
						self.handlePermissions(r.message)

						r.message.forEach((item) => {
							// self.handlePermissions(item.user_permissions)


							// item.user_permissions.forEach(p => {
							// 	let permissions = {
							// 		drive_id: p.drive_id,
							// 		file_id: p.file_id,
							// 		read: p.read ?? 0,
							// 		write: p.write ?? 0,
							// 		delete: p.delete_file ?? 0,
							// 		share: p.share ? 1 : 0,
							// 		download: p.download ?? 0,
							// 		create: frappe.session.user === p.created_by ? 1 : 0,
							// 	}

							// 	self.permissions.push(permissions);
							// 	console.log("checking permission",self.permissions);
							// });	
							
							// console.log("Shared Permissions",self.permissions);
							
							

							if (item.is_folder) {
								const result = `
									<div class="list-row-container" tabindex="1">
										<div class="level list-row">
											<div class="level-left ellipsis">
												<div class="list-row-col ellipsis list-subject level">
													<span class="level-item file-select">
														<input class="list-row-checkbox" type="checkbox" data-name="739a2e765d" />
													</span>
													<span class="level-item ellipsis" title="Apple-Logo.png">
														<a class="ellipsis open-folder" href="#" data-folder-name="${item.file_id}" data-drive-id=${item.drive_id} data-is-shared=${item.shared} title="Apple-Logo.png">
															<svg class="icon icon-sm" style="" aria-hidden="true">
																<use class="" href="#icon-folder-normal"></use>
															</svg>
															<span> ${item.file_name}</span>
														</a>
													</span>
												</div>
												<div class="list-row-col ellipsis hidden-xs text-muted">
													<span>${item.size}</span>
												</div>
												<div class="list-row-col ellipsis hidden-xs text-muted">
													<span>${item.file_type}</span>
												</div>
												<div class="list-row-col ellipsis hidden-xs text-muted">
													<span>${item.creation}</span>
												</div>
											</div>
											<div class="level-right text-muted ellipsis">
												<div class="level-item list-row-activity">
													<span class="frappe-timestamp" data-timestamp="2025-10-25 21:22:41.500965" title="25-10-2025 21:22:41">${item.shared_by}</span>
												</div>
											</div>
										</div>
										<div class="list-row-border"></div>
									</div>`

								$(".result").append(result);

							} else if (item.file_type === "xlsx" || item.file_type === "xls" || item.file_type === "csv") {
								const result = `
									<div class="list-row-container" tabindex="1">
										<div class="level list-row">
											<div class="level-left ellipsis">
												<div class="list-row-col ellipsis list-subject level">
													<span class="level-item file-select">
														<input class="list-row-checkbox" type="checkbox" data-name="739a2e765d" />
													</span>
													<span class="level-item ellipsis" title="Apple-Logo.png">
														<a class="ellipsis open-spreadsheet" href="#" data-file-url="${item.file_url}" data-file-id=${item.file_id} data-drive-id=${item.drive_id} title="Apple-Logo.png">
															<svg class="icon icon-sm" style="" aria-hidden="true">
																<use class="" href="#icon-file"></use>
															</svg>
															<span> ${item.file_name}</span>
														</a>
													</span>
												</div>
												<div class="list-row-col ellipsis hidden-xs text-muted">
													<span>${item.size}</span>
												</div>
												<div class="list-row-col ellipsis hidden-xs text-muted">
													<span>${item.file_type}</span>
												</div>
												<div class="list-row-col ellipsis hidden-xs text-muted">
													<span>${item.creation}</span>
												</div>
											</div>
											<div class="level-right text-muted ellipsis">
												<div class="level-item list-row-activity">
													<span class="frappe-timestamp" data-timestamp="2025-10-25 21:22:41.500965" title="25-10-2025 21:22:41">${item.shared_by}</span>
												</div>
											</div>
										</div>
										<div class="list-row-border"></div>
									</div>`

								$(".result").append(result);

							} else if (item.file_type === "pdf") {
								const result = `
									<div class="list-row-container" tabindex="1">
										<div class="level list-row">
											<div class="level-left ellipsis">
												<div class="list-row-col ellipsis list-subject level">
													<span class="level-item file-select">
														<input class="list-row-checkbox" type="checkbox" data-name="739a2e765d"/>
													</span>
													<span class="level-item ellipsis" title="Apple-Logo.png">
														<a class="ellipsis open-pdf" href="#" data-file-url="${item.file_url}" data-file-id=${item.file_id} data-drive-id=${item.drive_id} title="Apple-Logo.png">
															<svg class="icon icon-sm" style="" aria-hidden="true">
																<use class="" href="#icon-file"></use>
															</svg>
															<span> ${item.file_name}</span>
														</a>
													</span>
												</div>
												<div class="list-row-col ellipsis hidden-xs text-muted">
													<span>${item.size}</span>
												</div>
												<div class="list-row-col ellipsis hidden-xs text-muted">
													<span>${item.file_type}</span>
												</div>
												<div class="list-row-col ellipsis hidden-xs text-muted">
													<span>${item.creation}</span>
												</div>
											</div>
											<div class="level-right text-muted ellipsis">
												<div class="level-item list-row-activity">
													<span class="frappe-timestamp" data-timestamp="2025-10-25 21:22:41.500965" title="25-10-2025 21:22:41">${item.shared_by}</span>
												</div>
											</div>
										</div>
										<div class="list-row-border"></div>
									</div>`

								$(".result").append(result);

							} else {
								const result = `
								<div class="list-row-container" tabindex="1">
									<div class="level list-row">
										<div class="level-left ellipsis">
											<div class="list-row-col ellipsis list-subject level">
												<span class="level-item file-select">
													<input class="list-row-checkbox" type="checkbox" data-name="739a2e765d" />
												</span>
												<span class="level-item ellipsis" title="Apple-Logo.png">
													<a class="ellipsis image-preview" href="#" data-file-url="${item.file_url}" data-file-id=${item.file_id} data-drive-id=${item.drive_id} title="Apple-Logo.png">
														<svg class="icon icon-sm" style="" aria-hidden="true">
															<use class="" href="#icon-image"></use>
														</svg>
														<span> ${item.file_name}</span>
													</a>
												</span>
											</div>
											<div class="list-row-col ellipsis hidden-xs text-muted">
												<span>${item.size}</span>
											</div>
											<div class="list-row-col ellipsis hidden-xs text-muted">
												<span>${item.file_type}</span>
											</div>
											<div class="list-row-col ellipsis hidden-xs text-muted">
												<span>${item.creation}</span>
											</div>
										</div>
										<div class="level-right text-muted ellipsis">
											<div class="level-item list-row-activity">
												<span class="frappe-timestamp" data-timestamp="2025-10-25 21:22:41.500965" title="25-10-2025 21:22:41">${item.shared_by}</span>
											</div>
										</div>
									</div>
									<div class="list-row-border"></div>
								</div>`

								$(".result").append(result);

							}
						})

					}

				}

			})
			// $(".result").prepend(result);
			// $(".result").prepend(header);
			// $(".result").append(result);
		})

	},

	Folders() {
		let self = this
		$(document).off("click", ".go-folders");
		$(document).on("click", ".go-folders", function (event) {
			event.preventDefault(); // ✅ stops browser from appending #

			self.current_folder = "Folders";
			let base_url = window.location.pathname
			let newUrl = base_url.split("my-drive-v2")[0] + "my-drive-v2/" + self.current_folder;
			history.pushState({ folder: self.current_folder }, "", newUrl);
			self.page.set_title(__("Folders"));
			console.log("opened only folders")
			self.breadcrumb()

			$(".standard-filter-section .level-item a").remove()
			let add_folder = `<a href="#">Folders</a>`
			$(".standard-filter-section .level-item").append(add_folder)

			// const fileContainer = document.querySelector(".file-grid");

			$(".frappe-list .result").remove();
			$(".frappe-list .no-result").remove();
			$(".frappe-list").prepend('<div class="result file-grid-view"></div>');
			$(".file-grid-view").append('<div class="file-grid"></div>')


			// let fileDisplayArea = document.querySelector(".file-grid");
			// fileDisplayArea.innerHTML = "";

			let limit_start = 0;
			let limit_page_length = 20;

			frappe.call({
				method: "photos.my_drive.page.my_drive_v2.my_drive_v2.get_folders",
				args: {owner: frappe.session.user,limit_start:limit_start,limit_page_length:limit_page_length},
				callback: function (r) {
					if (r.message) {
						console.log("Folders:", r.message.folders);

						if (r.message.folders.length !== 0) {
							r.message.folders.forEach(file => {
								let fileElement = document.createElement("div");
								fileElement.classList.add("file");
								fileElement.innerHTML = `
								<a href="#" class="open-folder" data-folder-name="${file.file_id}" data-drive-id=${file.drive_id} data-is-shared=${file.shared}>
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
								`;

								if (file.shared) {
									const badge = document.createElement("div");
									badge.classList.add("shared-badge");
									badge.innerHTML = `<i class="fa fa-share-alt"></i>`;

									// Insert after .file-header
									fileElement.insertBefore(badge, fileElement.querySelector("a"));
								}



								$(".file-grid").append(fileElement);

							});
							// fileDisplayArea.innerHTML = `<p class="center"> No Folders Uploaded..</p>`;
						} else {
							emptyState()
						}

					}
				}
			})

		})

	},


	show_media_files(folder,limit_start, limit_page_length) {
		let self = this

		console.log("folder",folder);
		

		frappe.call({
			method: "photos.my_drive.page.my_drive_v2.my_drive_v2.get_media_files",
			args: {
				owner: frappe.session.user,
				folder:folder,
				limit_start: limit_start,
				limit_page_length: limit_page_length
			},
			callback: function (r) {
				if (r.message) {
					self.handlePermissions(r.message.files)
					
					let files = r.message.files;

					if (files.length === 0) {
						// $(".frappe-list .no-result").remove();
						emptyState()
					} else {
						$(".frappe-list .result").remove();
						$(".frappe-list .no-result").remove();
						$(".frappe-list").prepend('<div class="result file-grid-view"></div>');
						$(".file-grid-view").append('<div class="file-grid"></div>')

						files.forEach(file => {
							// console.log("media files", file.file_id);

							let fileElement = document.createElement("div");
							fileElement.classList.add("file");
							fileElement.innerHTML = `
								<div class="file-header">
										<input class="level-item checkbox hidden-xs" type="checkbox" data-file-id="${file.file_id}" data-docname="${file.drive_id}">
								</div>
								<a href="#" class="image-preview" data-file-url="${file.file_url}" data-file-id="${file.file_id}" data-drive-id="${file.drive_id}">
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
							`;
							if (file.shared) {
								const badge = document.createElement("div");
								badge.classList.add("shared-badge");
								badge.innerHTML = `<i class="fa fa-share-alt"></i>`;

								// Insert after .file-header
								fileElement.insertBefore(badge, fileElement.querySelector("a"));
							}

							$(".file-grid").append(fileElement);

						});
					}
				}
			}
		});

	},

	Media() {
		let self = this;
		$(document).on("click", ".open-media", function (event) {
			event.preventDefault();  // ✅ stops browser from appending #
			self.current_folder = "Media";
			self.page.set_title(__("Media"));

			self.breadcrumb() // remove first `/` slashes

			$(".standard-filter-section .level-item a").remove() // should remove, cause coming another sidebar option
			let add_folder = `<a href="#">Media</a>`
			$(".standard-filter-section .level-item").append(add_folder)


			let base_url = window.location.pathname

			console.log("base_url -", base_url, ",splited base_url - ", base_url.split("media")[0]);
			let newUrl = base_url.split("my-drive-v2")[0] + "my-drive-v2/" + self.current_folder;
			newUrl = newUrl.split('#')[0];
			console.log("openMdia newUrl ", newUrl, "current folder is", self.current_folder);
			history.pushState({ folder: self.current_folder }, "", newUrl);

			let limit_start = 0;
			let limit_page_length = 20;


			self.show_media_files("Media",limit_start, limit_page_length)


			// frappe.call({
			// 	method: "custom_pages.custom_pages.page.my_drive_v3.my_drive_v3.get_media_files",
			// 	args: { 
			// 		owner: frappe.session.user,
			// 		limit_start: limit_start,
			// 		limit_page_length: limit_page_length
			// 	},
			// 	callback: function (r) {
			// 		if (r.message) {
			// 			// console.log("media files response", r.message.files);
			// 			let permissions = r.message.files.map(file => {
			// 				if (file.created_by !== frappe.session.user) {
			// 					console.log("user not same ");

			// 					const isCreator = frappe.session.user === file.created_by;

			// 					const getpermissions = r.message.files.map(per => {
			// 						// console.log(file);
			// 						return {
			// 							drive_id: file.drive_id,
			// 							file_id: file.file_id,
			// 							read: per.read || 0,
			// 							write: per.write || 0,
			// 							download: per.download || 0,
			// 							delete: per.delete_file || 0,
			// 							create: isCreator
			// 						};
			// 					})
			// 					console.log("getpermissions", getpermissions);
			// 					return getpermissions[0]

			// 				} else {
			// 					// Use existing file permissions
			// 					return {
			// 						drive_id: file.drive_id,
			// 						file_id: file.file_id,
			// 						read: file.read,
			// 						write: file.write,
			// 						download: file.download,
			// 						delete: file.delete_file,
			// 						create: frappe.session.user === file.created_by ? 1 : 0
			// 					};
			// 				}
			// 			});
			// 			self.permissions = permissions
			// 			console.log("media permissions", self.permissions);
			// 			let files = r.message.files;
			// 			// let fileDisplayArea = document.querySelector(".col-md-9 .ibox-content .col-lg-16");

			// 			// let fileDisplayArea = document.querySelector(".file-grid");
			// 			// fileDisplayArea.innerHTML = "";



			// 			if (files.length === 0) {
			// 				$(".frappe-list .no-result").remove();
			// 				emptyState()
			// 				// fileDisplayArea.innerHTML = `<p class="center">This folder is empty. Upload files here.</p>`;
			// 			} else {
			// 				$(".frappe-list .result").remove();
			// 				$(".frappe-list .no-result").remove();
			// 				$(".frappe-list").prepend('<div class="result file-grid-view"></div>');
			// 				$(".file-grid-view").append('<div class="file-grid"></div>')

			// 				files.forEach(file => {
			// 					// console.log("media files", file.file_id);

			// 					let fileElement = document.createElement("div");
			// 					fileElement.classList.add("file");
			// 					fileElement.innerHTML = `
			// 							<div class="file-header">
			// 									<input class="level-item checkbox hidden-xs" type="checkbox" data-file-id="${file.file_id}" data-docname="${file.drive_id}">
			// 							</div>
			// 							<a href="#" class="image-preview" data-file-url="${file.file_url}" data-file-id="${file.file_id}">
			// 								<span class="corner"></span>
			// 								<div class="image">
			// 									<img alt="image" class="img-responsive" src="${file.file_url}">
			// 								</div>
			// 								<div class="file-name">
			// 									${file.filename}
			// 									<br>
			// 									<small>${file.creation}</small>
			// 								</div>
			// 							</a>
			// 					`;
			// 					$(".file-grid").append(fileElement);

			// 				});
			// 			}
			// 		}
			// 	}
			// });

		})

	},

	Documents() {
		let self = this;
		$(document).on("click", ".open-documents", function (event) {
			event.preventDefault();  // ✅ stops browser from appending #
			self.current_folder = "Documents";
			self.page.set_title(__("Documents"));
			console.log("clicked open documents");

			self.breadcrumb()


			$(".standard-filter-section .level-item a").remove()
			let add_folder = `<a href="#">Documents</a>`
			$(".standard-filter-section .level-item").append(add_folder)

			let base_url = window.location.pathname
			let newUrl = base_url.split("my-drive-v2")[0] + "my-drive-v2/" + self.current_folder;
			history.pushState({ folder: self.current_folder }, "", newUrl);
			let limit_start = 0;
			let limit_page_length = 20


			frappe.call({
				method: "photos.my_drive.page.my_drive_v2.my_drive_v2.get_documents_files",
				args: { owner: frappe.session.user,limit_start:limit_start,limit_page_length:limit_page_length},
				callback: function (r) {
					if (r.message) {
						console.log(r.message);

						
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




						// fileDisplayArea.innerHTML = "";

						if (files.length === 0) {
							$(".frappe-list .no-result").remove();
							emptyState()
							self.upload_button()
							// fileDisplayArea.innerHTML = `<p class="center">This folder is empty. Upload files here.</p>`;
						} else {

							files.forEach(file => {
								console.log("documents files", file);
								$(".frappe-list .result").remove();
								$(".frappe-list").prepend('<div class="result file-grid-view"></div>');
								$(".file-grid-view").append('<div class="file-grid"></div>')



								let fileElement = document.createElement("div");
								fileElement.classList.add("file");
								if (file.file_type === "PDF") {

									fileElement.innerHTML = `
										<div class="file-header">
											<input class="level-item checkbox hidden-xs" type="checkbox" data-file-id=${file.file_id} data-docname=${file.drive_id}>
										</div>
										<a href="#" class="open-pdf" data-file-url="${file.file_url}" data-name=${file.file_id}>
											<span class="corner"></span>

											<div class="file-body">
												<img alt="File Icon" style="width: 77px; height: 90px" class="icon" src="/assets/photos/file.png">
											</div>
											<div class="file-name">
												${file.filename}
												<br>
												<small>${file.creation}</small>
											</div>
										</a>
									`
									$(".file-grid").append(fileElement);

								} else if (file.file_type === "XLSX" || file.file_type === "XLS") {
									fileElement.innerHTML = `
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
										`
									$(".file-grid").append(fileElement);
								}

							});
						}
					}
				}
			});
		})

	},

	openNotification() {

		$(document).off("click", ".open-notify").on("click", ".open-notify", function (event) {

			event.preventDefault(); // ✅ stops browser from appending #

			// frappe.msgprint(JSON.stringify("Notification"))

			let drive_id = $(this).data("drive-id");
			let file_id = $(this).data("file-id");
			// return
			frappe.call({
				method: "photos.my_drive.page.my_drive_v2.my_drive_v2.get_notification",
				args: { file_id, drive_id },
				callback: function (r) {
					if (r.message) {
						// show_file_dialog(r.message);
						console.log("file details", r.message);


						let data = r.message
						// let shared_html = "";
						//  if (data.shared_with.length) {
						// 	shared_html = data.shared_with
						// 		.map(u => `<li>${u.for_user} — (R:${u.read}, W:${u.write}, D:${u.delete_file})</li>`)
						// 		.join("");
						// } else {
						// 	shared_html = "<p>No users shared</p>";
						// }

						console.log("datttttaaaaa",data);
						
						
						const d = new frappe.ui.Dialog({
							title: "File Details",
							size: "large",
							fields: [
								{
									fieldtype: "HTML",
									fieldname: "info_html",
									options: `
										<div class="file-info-box">

											<h3>${data.file_name}</h3>
												<p><b>Type:</b> ${data.file_type}</p>
												<p><b>Size:</b> ${data.file_size || "N/A"}</p>
												<p><b>Shared By:</b> ${data.shared_by}</p>
												<p><b>Created On:</b> ${frappe.datetime.str_to_user(data.creation)}</p>
												<p><b>Folder:</b> ${data.folder}</p>
											<hr>


											<h4>Go to the file </h4>
											${data.file_type === "JPG" || data.file_type === "PNG" || data.file_type === "JPEG" ? `<img src="${data.file_url}" style="max-width:100%; border-radius:8px;">` : `<a href="#" target="_blank" class="btn btn-primary open-folder" data-folder-name="${data.folder}" data-drive-id="${data.drive_id}" data-is-shared=${data.shared}>Open File</a>`
										}
										</div>
									`
								}
							]
						});

						if (data.seen){
							let $clickedRow = $(event.target).closest('.list-row-container');
							let $statusPill = $clickedRow.find('.indicator-pill');
							
							if ($statusPill.hasClass('red')) {
								$statusPill.removeClass('red').addClass('green');
								$statusPill.attr('data-filter', 'seen,=,1');
								$statusPill.find('.ellipsis').text('Seen');
							}
							// Remove lock icon if present
							// $(event.target).closest('a').find('.fa-lock').remove();
						}
						d.show();
						$(d.$wrapper).on("click", ".open-folder", function () {
							d.hide(); // this code is written because dialog box not getting closed 
						});

					} else {
						console.log("Files Not Found");
					}
				}
			});
		})
	},

	Notifications() {
		let self = this;
		$(document).on("click", ".open-notifications", function (event) {
			event.preventDefault(); // ✅ stops browser from appending #

			if ($(".open-notifications .notification-badge").length) {
				$(".notification-badge").remove();   // remove notification badge
			}

			self.current_folder = "Notifications";
			let base_url = window.location.pathname
			let newUrl = base_url.split("my-drive-v2")[0] + "my-drive-v2/" + self.current_folder;
			history.pushState({ folder: self.current_folder }, "", newUrl);
			self.page.set_title(__("Notifications"));

			self.breadcrumb()
			$(".standard-filter-section .level-item a").remove()
			let add_folder = `<a href="#">Notifications</a>`
			$(".standard-filter-section .level-item").append(add_folder)

			// $(".file-grid").remove() // removed becouse grid view means file boxes and for list view removed class file-grid

			// $(".result").remove()

			$(".frappe-list .result").remove();
			$(".frappe-list .no-result").remove();

			$(".frappe-list").prepend('<div class="result"></div>');


			const header = `
				<header class="level list-row-head text-muted">
					<div class="level-left list-header-subject">
						<div class="list-row-col list-subject level">
							<input class="level-item list-check-all hidden-xs" type="checkbox" title="Select All" />
							<span class="level-item" data-sort-by="full_name" title="Click to sort by Full Name">
								file Name
							</span>
						</div>
						<div class="list-row-col ellipsis hidden-xs">
							<span></span>
						</div>
						<div class="list-row-col ellipsis hidden-xs">
							<span>Status</span>
						</div>
						<div class="list-row-col ellipsis hidden-xs">
							<span>Type</span>
						</div>
					</div>
					<div class="level-left checkbox-actions">
						<div class="level list-subject">
							<input class="level-item list-check-all" type="checkbox" title="Select All"/>
							<span class="level-item list-header-meta"></span>
						</div>
					</div>
					<div class="level-right">
						<span class="list-count"><span>Shared On</span></span>
					</div>
				</header>`
			$(".result").prepend(header);


			let limit_start = 0;
			let limit_page_length = 20




			frappe.call({
				method: "photos.my_drive.page.my_drive_v2.my_drive_v2.get_shared_files",
				args: {
					user: frappe.session.user,
					limit_start:limit_start,
					limit_page_length:limit_page_length
				},
				callback: (r) => {
					console.log("callback return Notifications files response:", r.message);
					r.message.forEach((item) => {

							if (item.seen) {
								const result = `
									<div class="list-row-container" tabindex="1">
										<div class="level list-row">
											<div class="level-left ellipsis">

												<div class="list-row-col ellipsis list-subject level">
													<span class="level-item file-select">
														<input class="list-row-checkbox" type="checkbox" data-name="739a2e765d" />
													</span>
													<span class="level-item ellipsis" title="Apple-Logo.png">
														<a  href="#" class="ellipsis open-notify" data-file-id="${item.file_id}" data-drive-id=${item.drive_id} data-is-shared="1" title="Apple-Logo.png">
															<svg class="icon icon-sm" style="" aria-hidden="true">
																<use class="" href="#icon-notification"></use>
															</svg>
															<span>${item.shared_by} shared a document file ${item.file_name} with you</span>
														</a>
													</span>
												</div>

												<div class="list-row-col ellipsis hidden-xs text-muted">
													<span></span>
												</div>

												<div class="list-row-col hidden-xs ellipsis">
													<span class="indicator-pill green filterable no-indicator-dot ellipsis" data-filter="seen,=,0" title="Document is in draft state">
														<span class="ellipsis">Seen</span>
													</span>
												</div>
												
												
												<div class="list-row-col ellipsis hidden-xs text-muted">
													<span>${item.file_type}</span>
												</div>
											</div>
											<div class="level-right text-muted ellipsis">
												<div class="level-item list-row-activity">
													<span class="frappe-timestamp" data-timestamp="2025-10-25 21:22:41.500965" title="25-10-2025 21:22:41">${item.creation}</span>
												</div>
											</div>
										</div>
										<div class="list-row-border"></div>
									</div>`
								$(".result").append(result);

							}else {

								const result =`
									<div class="list-row-container" tabindex="1">
										<div class="level list-row">
											<div class="level-left ellipsis">
												<div class="list-row-col ellipsis list-subject level">
													<span class="level-item file-select">
														<input class="list-row-checkbox" type="checkbox" data-name="f662039d54" />
													</span>
													<span class="level-item ellipsis" title="Apple-Logo.png">
														<a href="#" class="ellipsis open-notify" data-file-id="${item.file_id}" data-drive-id=${item.drive_id} data-is-shared="1" title="Apple-Logo.png">
															<svg class="icon icon-sm" style="" aria-hidden="true">
																<use class="" href="#icon-notification"></use>
															</svg>
															<span>${item.shared_by} shared a document file ${item.file_name} with you</span>
															<i class="fa fa-lock fa-fw text-warning"></i>
														</a>
													</span>
												</div>
												<div class="list-row-col ellipsis hidden-xs text-muted">
													<span></span>
												</div>
												<div class="list-row-col hidden-xs ellipsis">
													<span class="indicator-pill red filterable no-indicator-dot ellipsis" data-filter="seen,=,0" title="Document is in draft state">
														<span class="ellipsis"> Not Seen</span>
													</span>
												</div>
												
												<div class="list-row-col ellipsis hidden-xs text-muted">
													<span>${item.file_type}</span>
												</div>
							
											</div>
											<div class="level-right text-muted ellipsis">
												<div class="level-item list-row-activity">
													<span class="frappe-timestamp" data-timestamp="2025-10-25 17:38:38.074578" title="25-10-2025 17:38:38">${item.creation}</span>
												</div>
											</div>
										</div>
										<div class="list-row-border"></div>
									</div>`

									$(".result").append(result);							
							}

					})




				}

			})



			// const result = `

			// 		<div class="list-row-container" tabindex="1">
			// 			<div class="level list-row">
			// 				<div class="level-left ellipsis">
			// 					<div class="list-row-col ellipsis list-subject level">
			// 						<span class="level-item file-select">
			// 							<input class="list-row-checkbox" type="checkbox" data-name="739a2e765d" />
			// 						</span>
			// 						<span class="level-item ellipsis" title="Apple-Logo.png">
			// 							<a  href="#" class="ellipsis open-notify" title="Apple-Logo.png">
			// 								<svg class="icon icon-sm" style="" aria-hidden="true">
			// 									<use class="" href="#icon-image"></use>
			// 								</svg>
			// 								<span>Apple-Logo.png</span>
			// 							</a>
			// 						</span>
			// 					</div>
			// 					<div class="list-row-col hidden-xs ellipsis">
			// 						<span class="indicator-pill green filterable no-indicator-dot ellipsis" data-filter="seen,=,1" title="Document is in draft state">
			// 							<span class="ellipsis">Seen</span>
			// 						</span>
			// 					</div>
			// 					<div class="list-row-col ellipsis hidden-xs text-muted">
			// 						<span>PNG</span>
			// 					</div>
			// 					<div class="list-row-col ellipsis hidden-xs text-muted">
			// 						<span>25-10-2025</span>
			// 					</div>
			// 				</div>
			// 				<div class="level-right text-muted ellipsis">
			// 					<div class="level-item list-row-activity">
			// 						<span class="frappe-timestamp" data-timestamp="2025-10-25 21:22:41.500965" title="25-10-2025 21:22:41">1 week ago</span>
			// 					</div>
			// 				</div>
			// 			</div>
			// 			<div class="list-row-border"></div>
			// 		</div>


			// 		<div class="list-row-container" tabindex="1">
			// 			<div class="level list-row">
			// 				<div class="level-left ellipsis">
			// 					<div class="list-row-col ellipsis list-subject level">
			// 						<span class="level-item file-select">
			// 							<input class="list-row-checkbox" type="checkbox" data-name="bba910ddb3" />
			// 						</span>
			// 						<span class="level-item ellipsis" title="Apple-Logo.png">
			// 							<a class="ellipsis open-notify" href="#"  data-file-id=9e43dcbb02 data-drive-id="8j7gl13osc" title="Apple-Logo.png">
			// 								<svg class="icon icon-sm" style="" aria-hidden="true">
			// 									<use class="" href="#icon-image"></use>
			// 								</svg>
			// 								<span>Apple-Logo.png</span>
			// 								<i class="fa fa-lock fa-fw text-warning"></i>
			// 							</a>
			// 						</span>
			// 					</div>
			// 					<div class="list-row-col hidden-xs ellipsis">
			// 						<span class="indicator-pill green filterable no-indicator-dot ellipsis" data-filter="seen,=,1" title="Document is in draft state">
			// 							<span class="ellipsis">Seen</span>
			// 						</span>
			// 					</div>
			// 					<div class="list-row-col ellipsis hidden-xs text-muted">
			// 						<span>PNG</span>
			// 					</div>
			// 					<div class="list-row-col ellipsis hidden-xs text-muted">
			// 						<span>25-10-2025</span>
			// 					</div>
			// 				</div>
			// 				<div class="level-right text-muted ellipsis">
			// 					<div class="level-item list-row-activity">
			// 						<span class="frappe-timestamp" data-timestamp="2025-10-25 17:41:39.647509" title="25-10-2025 17:41:39">1 week ago</span>
			// 					</div>
			// 				</div>
			// 			</div>
			// 			<div class="list-row-border"></div>
			// 		</div>


			// 		<div class="list-row-container" tabindex="1">
			// 			<div class="level list-row">
			// 				<div class="level-left ellipsis">
			// 					<div class="list-row-col ellipsis list-subject level">
			// 						<span class="level-item file-select">
			// 							<input class="list-row-checkbox" type="checkbox" data-name="bba910ddb3" />
			// 						</span>
			// 						<span class="level-item ellipsis" title="Apple-Logo.png">
			// 							<a class="ellipsis open-notify" href="#" title="Apple-Logo.png">
			// 								<svg class="icon icon-sm" style="" aria-hidden="true">
			// 									<use class="" href="#icon-image"></use>
			// 								</svg>
			// 								<span>Apple-Logo.png</span>
			// 								<i class="fa fa-lock fa-fw text-warning"></i>
			// 							</a>
			// 						</span>
			// 					</div>
			// 					<div class="list-row-col hidden-xs ellipsis">
			// 						<span class="indicator-pill green filterable no-indicator-dot ellipsis" data-filter="seen,=,1" title="Document is in draft state">
			// 							<span class="ellipsis">Seen</span>
			// 						</span>
			// 					</div>
			// 					<div class="list-row-col ellipsis hidden-xs text-muted">
			// 						<span>PNG</span>
			// 					</div>
			// 					<div class="list-row-col ellipsis hidden-xs text-muted">
			// 						<span>25-10-2025</span>
			// 					</div>
			// 				</div>
			// 				<div class="level-right text-muted ellipsis">
			// 					<div class="level-item list-row-activity">
			// 						<span class="frappe-timestamp" data-timestamp="2025-10-25 17:41:39.647509" title="25-10-2025 17:41:39">1 week ago</span>
			// 					</div>
			// 				</div>
			// 			</div>
			// 			<div class="list-row-border"></div>
			// 		</div>


				
			// 		<div class="list-row-container" tabindex="1">
			// 			<div class="level list-row">
			// 				<div class="level-left ellipsis">
			// 					<div class="list-row-col ellipsis list-subject level">
			// 						<span class="level-item file-select">
			// 							<input class="list-row-checkbox" type="checkbox" data-name="f662039d54" />
			// 						</span>
			// 						<span class="level-item ellipsis" title="Apple-Logo.png">
			// 							<a class="ellipsis open-notify" href="#" title="Apple-Logo.png">
			// 								<svg class="icon icon-sm" style="" aria-hidden="true">
			// 									<use class="" href="#icon-image"></use>
			// 								</svg>
			// 								<span>Apple-Logo.png</span>
			// 								<i class="fa fa-lock fa-fw text-warning"></i>
			// 							</a>
			// 						</span>
			// 					</div>
			// 					<div class="list-row-col hidden-xs ellipsis">
			// 						<span class="indicator-pill red filterable no-indicator-dot ellipsis" data-filter="seen,=,0" title="Document is in draft state">
			// 							<span class="ellipsis"> Not Seen</span>
			// 						</span>
			// 					</div>
			// 					<div class="list-row-col ellipsis hidden-xs text-muted">
			// 						<span>PNG</span>
			// 					</div>
			// 					<div class="list-row-col ellipsis hidden-xs text-muted">
			// 						<span>25-10-2025</span>
			// 					</div>
			// 				</div>
			// 				<div class="level-right text-muted ellipsis">
			// 					<div class="level-item list-row-activity">
			// 						<span class="frappe-timestamp" data-timestamp="2025-10-25 17:38:38.074578" title="25-10-2025 17:38:38">1 week ago</span>
			// 					</div>
			// 				</div>
			// 			</div>
			// 			<div class="list-row-border"></div>
			// 		</div>
			// 	`
			// // $(".result").prepend(result);
			// $(".result").append(result);

			self.openNotification()

		})
	},

	imagePreview() {
		let self = this
		console.log("Permissions before click image preview", this.permissions);
		$(document).off("click", ".image-preview").on("click", ".image-preview", async function (event) {
			event.preventDefault();
			let file_url = $(this).data("file-url");
			let drive_id = $(this).data("drive-id");
			let file_id = $(this).data("file-id");
			let tags = $(this).data("tags");

			console.log("file_url", file_url);
			console.log("drive_id", drive_id);``
			console.log("file_id", file_id);
			console.log("tags", tags);
			console.log("permissions", self.permissions);

			// let tag_list = [];
			let tag_html = ''

			let filename = $(this).find(".file-name").contents().first().text().trim();
			let creation_date = $(this).find("small").text().trim();
			let fileType = file_url.split('.').pop().toUpperCase() || "Unknown type";

			let tag_list = await frappe.xcall("photos.my_drive.page.my_drive_v2.my_drive_v2.get_person", {
				file_id: file_id
			});

			console.log('tag_list :',tag_list);
			
			// frappe.msgprint(JSON.stringify(result))
			

			// if (tags) {
			// 	tag_list = tags.split(",")
			// 	console.log("tag_list :", tag_list);
			// }

			if (tag_list.length > 0) {
				// Create a container for tags with proper styling
				tag_html = `<div class="tag-container" style="margin-top: 8px;"><div class="tag-wrapper" style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">`
				

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
							max-width: 120px;">
							<span class="tag-label" style="white-space: nowrap;">${tag}</span>
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

			let userPermission = self.permissions.find(permission => permission.file_id === file_id);

			console.log("userPermission",userPermission);
			

			console.log("create", userPermission.create, "read", userPermission.read, "write", userPermission.write, "delete", userPermission.delete, "download", userPermission.download);
			if (!userPermission.create && !userPermission.read && !userPermission.write) {
				console.log("create", userPermission.create, ".read", userPermission.read, "write", userPermission.write, "delete", userPermission.delete, "download", userPermission.download);
				frappe.msgprint("You do not have permission to view this file");
				console.log("You do not have permission to view this file");
				
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
					// console.log("uuu file_id",file_id);

					window.open(`/api/method/photos.download.download?file_id=${file_id}`);
					
					// let a = document.createElement("a");
					// a.href = file_url;
					// a.download = file_url.split("/").pop();
					// document.body.appendChild(a);
					// a.click();
					// document.body.removeChild(a);
				}
			});

			d.show();

			let added_tags = new Set();


			var tag_plus = `<span class="form-sidebar-items">
					<button
						class="add-tags-btn text-muted btn btn-link icon-btn"
						id="add_tags"
						style="">
						<svg class="es-icon icon-sm"><use href="#es-line-add"></use></svg>
					</button>
			</span>`

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

									${tag_list.length == 0 ? `<div style="margin-bottom: 4px; display: flex; flex-wrap: wrap; align-items: center; gap: 0;"><strong style="margin-right: 8px;">Add Tags:</strong>${tag_plus}</div>` : ''}

									
									
									
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

			$(document).on('click', '.add-tags-btn', function (e) {
				e.preventDefault();
				e.stopPropagation();

				const $parent = $(this).closest('div'); // where button lives
				$(this).remove();

				const tag_input = `
					<div class="add-tag-wrapper"
						style="margin-bottom:4px; display:flex; align-items:center;">
						<input class="tags-input form-control"
							autocomplete="off"
							style="width:40%; margin-bottom:0;">
					</div>
				`;

				$parent.append(tag_input);
				$parent.find('.tags-input').focus();

				

			});

			const $tags_container = $('.image-details > div[style*="padding-top"]');


			$(document).on('blur', '.tags-input', function () {
				const value = $(this).val().trim();
				const $wrapper = $(this).closest('.add-tag-wrapper');
				const $container = $wrapper.parent(); // same place as input

				// Always restore + button
				$wrapper.remove();
				$container.append(tag_plus);

				if (!value || added_tags.has(value)) return;

				added_tags.add(value);



				frappe.xcall("photos.my_drive.page.my_drive_v2.my_drive_v2.add_tags", {
					tag: value,
					file_id:file_id
				}).then(r => {
					console.log("person Adding",r)
					if(r.status == "Success"){
						console.log(r.status);

						$container.append(`
							<li class="form-tag-row" data-tag="${value}">
								<button class="data-pill btn"
									style="background-color: var(--dark-green-avatar-bg);
										color: var(--dark-green-avatar-color)">
									<div class="flex align-center ellipsis">
										<span class="pill-label">${value}</span>
									</div>
									<span class="remove-btn cursor-pointer">
										<svg class="icon icon-sm">
											<use href="#icon-close"></use>
										</svg>
									</span>
								</button>
							</li>
						`);



						frappe.show_alert({
							message: __('Person {0} Added successfully!', [value]),
							indicator: 'green'
						}, 3);


					}
				});

				
			});


			// $(document).on('click', '.add-tags-btn', function (e) {
			// 	e.preventDefault();
			// 	e.stopPropagation();

			// 	const $parent = $(this).closest('div'); // where button lives
			// 	$(this).remove();

			// 	const tag_input = `
			// 		<div class="add-tag-wrapper"
			// 			style="margin-bottom:4px; display:flex; align-items:center;">
			// 			<input class="tags-input form-control"
			// 				autocomplete="off"
			// 				style="width:40%; margin-bottom:0;">
			// 		</div>
			// 	`;

			// 	$parent.append(tag_input);
			// 	$parent.find('.tags-input').focus();

			// });

			// const $tags_container = $('.image-details > div[style*="padding-top"]');


			// $(document).on('blur', '.tags-input', function () {
			// 	const value = $(this).val().trim();
			// 	const $wrapper = $(this).closest('.add-tag-wrapper');
			// 	const $container = $wrapper.parent(); // same place as input

			// 	// Always restore + button
			// 	$wrapper.remove();
			// 	$container.append(tag_plus);

			// 	if (!value || added_tags.has(value)) return;

			// 	added_tags.add(value);


			// 	frappe.xcall("custom_pages.custom_pages.page.my_drive_v3.my_drive_v3.add_tags", {
			// 		tag: value,
			// 		file_id:file_id
			// 	}).then(r => {
			// 		console.log(r);
			// 	});

				



			// 	$container.append(`
			// 		<li class="form-tag-row" data-tag="${value}"> 
			// 			<button class="data-pill btn"
			// 				style="background-color: var(--dark-green-avatar-bg);
			// 					color: var(--dark-green-avatar-color)">
			// 				<div class="flex align-center ellipsis">
			// 					<span class="pill-label">${value}</span>
			// 				</div>
			// 				<span class="remove-btn cursor-pointer">
			// 					<svg class="icon icon-sm">
			// 						<use href="#icon-close"></use>
			// 					</svg>
			// 				</span>
			// 			</button>
			// 		</li>
			// 	`);
			// });





			// Optional: Add click handler for tag removal
			
			// $(document).on('click', '.tag-remove', function (e) {
			// 	e.stopPropagation();
			// 	const tagElement = $(this).closest('.tag-pill');
			// 	const tagName = tagElement.find('.tag-label').text();

			// 	// Add your tag removal logic here
			// 	console.log('Removing tag:', tagName);

			// 	// Remove the tag element with animation
			// 	tagElement.fadeOut(200, function () {
			// 		$(this).remove();
			// 	});
			// });

			$(document).on('click', '.form-tag-row .remove-btn', function (e) {
				e.preventDefault();
				e.stopPropagation();
				const $tagRow = $(this).closest('.form-tag-row');
				const tagValue = $tagRow.data('tag');


				frappe.xcall("photos.my_drive.page.my_drive_v2.my_drive_v2.remove_tag", {
					file_id:file_id,
					tag: tagValue
				}).then(r => {
					console.log("person Adding",r)
					if(r.status == "Success"){
						console.log(r.status);


						// Remove from state
						added_tags.delete(tagValue);

						// Remove from UI
						$tagRow.remove();

						frappe.show_alert({
							message: __('Person {0} Removed successfully!', [tagValue]),
							indicator: 'green'
						}, 3);

					}
				});
				
			});


			// $(document).on('click', '.add-tags-btn', function (e) {
			// 	// e.stopPropagation();
			// 	// const tagElement = $(this).closest('.tag-pill');
			// 	// const tagName = tagElement.find('.tag-label').text();

			// 	// Add your tag removal logic here
			// 	console.log('Adding tag');
			// 	$(".add-tags-btn").remove();

			// 	var tag_input = `<div style="margin-bottom: 4px; display: flex; flex-wrap: wrap; align-items: center; gap: 0;"><strong style="margin-right: 8px;">Add Person:</strong>
			// 					<input
			// 						class="tags-input form-control"
			// 						autocomplete="off"
			// 						aria-expanded="false"
			// 						aria-owns="awesomplete_list_22" 
			// 						role="combobox"
			// 						style="width: 20% !important"
			// 						state="closed"/>
			// 					</div>`


			// 	// var tag_input = `<div class="awesomplete">
			// 	// <input
			// 	// 	class="tags-input form-control"
			// 	// 	autocomplete="off"
			// 	// 	aria-expanded="false"
			// 	// 	aria-owns="awesomplete_list_22" 
			// 	// 	role="combobox"
			// 	// 	state="closed"/>

			// 	// <ul role="listbox" id="awesomplete_list_22">
			// 	// 	<li role="option" aria-selected="false" id="awesomplete_list_22_item_0">
			// 	// 		test
			// 	// 	</li>
			// 	// 	<li role="option" aria-selected="false" id="awesomplete_list_22_item_1">
			// 	// 		freshers
			// 	// 	</li>
			// 	// 	<li role="option" aria-selected="false" id="awesomplete_list_22_item_2">
			// 	// 		14lfcvslve
			// 	// 	</li>
			// 	// 	<li role="option" aria-selected="false" id="awesomplete_list_22_item_3">
			// 	// 		7j0091on5n
			// 	// 	</li>
			// 	// 	<li role="option" aria-selected="false" id="awesomplete_list_22_item_4">
			// 	// 		c5mjc3hqev
			// 	// 	</li>
			// 	// 	<li role="option" aria-selected="false" id="awesomplete_list_22_item_5">
			// 	// 		fu9819lver
			// 	// 	</li>
			// 	// 	<li role="option" aria-selected="false" id="awesomplete_list_22_item_6">
			// 	// 		gk7q70ne07
			// 	// 	</li>
			// 	// 	<li role="option" aria-selected="false" id="awesomplete_list_22_item_7">
			// 	// 		gkvpto5k74
			// 	// 	</li>
			// 	// 	<li role="option" aria-selected="false" id="awesomplete_list_22_item_8">
			// 	// 		h70uj1tr65
			// 	// 	</li>
			// 	// 	<li role="option" aria-selected="false" id="awesomplete_list_22_item_9">
			// 	// 		hkkbfa0lh3
			// 	// 	</li>
			// 	// 	<li role="option" aria-selected="false" id="awesomplete_list_22_item_10">
			// 	// 		j9ee5t4qh6
			// 	// 	</li>
			// 	// 	<li role="option" aria-selected="false" id="awesomplete_list_22_item_11">
			// 	// 		nfngn2slmu
			// 	// 	</li>
			// 	// 	<li role="option" aria-selected="false" id="awesomplete_list_22_item_12">
			// 	// 		uaqtcubocn
			// 	// 	</li>
			// 	// 	<li role="option" aria-selected="false" id="awesomplete_list_22_item_13">
			// 	// 		Continuity Pay Amount merged with Special Allowance
			// 	// 	</li>
			// 	// </ul>
			// 	// <span
			// 	// 	class="visually-hidden"
			// 	// 	role="status"
			// 	// 	aria-live="assertive"
			// 	// 	aria-atomic="true"
			// 	// 	hidden=""> 14 results found
			// 	// </span>
			// 	// </div>`

			// 	// $(".image-details").append(tag_input)


			// 	let $target = $(".image-details > div[style*='padding-top']");

			// 	$target.append(tag_input);
			// });



			if (userPermission.delete || userPermission.create) {
				d.set_secondary_action_label("Delete");
				d.set_secondary_action(function () {
					frappe.confirm("Are you sure you want to delete this file?", function () {
						frappe.call({
							method: "photos.my_drive.page.my_drive_v2.my_drive_v2.delete_item",
							args: { doctype: "File", name: drive_id },
							callback: function (r) {
								console.log("r.message", r.message);
								if (r.message.status === "Success") {
									d.hide(); // Close dialog after deletion
									// $(`.image-preview[data-drive-id="${drive_id}"]`).closest(".file-box").remove();

									setTimeout(() => {
										const $fileBox = $(`.image-preview[data-drive-id="${drive_id}"]`).closest(".file");
										$fileBox.fadeOut(150, function () {
											$(this).remove();
										});
									}, 300);


									console.log("file Vanished");


									self.fileGrid()



									// frappe.show_alert({
									// 	message: "File deleted successfully.",
									// 	indicator: "green"
									// });
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

			// $(document).on('click', '.tag-remove', function (e) {
			// 	e.stopPropagation();
			// 	const tagElement = $(this).closest('.tag-pill');
			// 	const tagName = tagElement.find('.tag-label').text();

			// 	// Add your tag removal logic here
			// 	console.log('Removing tag:', tagName);

			// 	// Remove the tag element with animation
			// 	tagElement.fadeOut(200, function () {
			// 		$(this).remove();
			// 	});
			// });

		});
	},

	videoPreview() {
		$(document).off("click", ".video-preview").on("click", ".video-preview", function (event) {
			console.log("hello");
			
			event.preventDefault();
			let file_url = $(this).data("file-url");
			let drive_id = $(this).data("drive-id");
			let file_id = $(this).data("file-id");
			let tags = $(this).data("tags");



			let d = new frappe.ui.Dialog({
				title: "Image Preview",
				size: "large",
				fields: [
					{
						fieldtype: "HTML",
						fieldname: "video_preview",
					}
				],
				primary_action_label: "Download",
				primary_action: function () {
					// console.log("uuu file_id",file_id);

					window.open(`/api/method/photos.download.download?file_id=${file_id}`);

					// var video_preview = `
					// 	<video width="480" height="320" controls="">
					// 		<source src="/files/my-drive/5tr33.2.24.HDTS.1080p.sdm0v13sp01nt.codes (1).mkv" />
					// 		Your browser does not support the video element.
					// 	</video>`

					
					// let a = document.createElement("a");
					// a.href = file_url;
					// a.download = file_url.split("/").pop();
					// document.body.appendChild(a);
					// a.click();
					// document.body.removeChild(a);
				}
			});

			d.show();

			let video_html = `
                <div style="text-align:center">
                    <video
                        width="100%"
                        height="420"
                        controls
                        autoplay
                        preload="metadata"
                    >
                        <source src="${file_url}">
                        Your browser does not support the video tag.
                    </video>
                </div>
            `;

            d.fields_dict.video_preview.$wrapper.html(video_html);

			
		})

		


	},


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
	},

	filpviewPDF(file_url, file_type) {
		let self = this;
		let $preview = "";
		file_type = file_type.toLowerCase();

		console.log("file_url", file_url);

		if (file_type === "pdf") {

			
			// Add loading overlay
			
			
			$(".main-section").html("");
			// $(".body").empty()
			// $(".container .page-body").html("");

			

			
			// Create hidden magazine structure
			$('.main-section').append(`
				<div class="magazine-viewport" style="">
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


					@media (max-width: 768px) {
						
						.button-right {
							margin-left: 0;
							order: -1;
						}
					}
					
					.button-right {
						margin-left: auto;
						display:block;
						color: white;
						text-align:center;
						position: absolute;
						top: 10px;
						right: 10px;
					}
				</style>
			`;


			// Add CSS to head if not already added
			if (!$('#pdf-loading-styles').length) {
				$('head').append(loadingSpinnerCSS);
			}

			const loadingOverlay = `
				<div class="pdf-loading-overlay" id="pdf-loading-overlay">
					<div class="pdf-loading-spinner"></div>
					<div class="pdf-loading-text">Loading PDF...</div>
					<div class="pdf-loading-progress" id="pdf-loading-progress">Preparing document...</div>
				</div>
			`;

			$('body').append(loadingOverlay);


			$(".main-section").append(`
				<div class="button-right">
					<button class="btn btn-secondary back-to-home">
						🏠 Home
					</button>
				</div>`)


			$(".main-section").css({
				
				"background-color": "#ede6e6"
			});

			

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
					
					$(document).on('click', '.back-to-home', function () {
						location.reload();
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
	},

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
	},

	Home() {
		let self = this
		$(document).on("click", ".go-home", function (event) {
			console.log("home called");

			self.page.set_title(__("Home"));
			self.current_folder = "Home";
			self.breadcrumb()
			// $('.btn .ellipsis').hide();
			$('.custom-actions .ellipsis').hide();


			self.render_template();
			// self.page.set_title(__('Home'));
			 // Reset current folder to Home
			// history.pushState({ folder: "Home" }, "", "/app/my-drive-v2");
			

			
			// document.querySelector('[data-label="Back"]').style.display = 'none';
		})
	},

	breadcrumb() {
		console.log("breadcrumb called")
		let breadcrumb = $(".level-item");
		this.folders_array.length = 0                             // from Folders sagar3 then array should be empty here 
		console.log("breadcrumb", breadcrumb[0].innerHTML = "")
		let html = breadcrumb.html().trim();
		if (/(&nbsp;|\/)+$/.test(html)) {
			console.log("✅ Trailing slash found — cleaning it...");
			html = html.replace(/(&nbsp;|\/)+$/g, ""); // remove last slashes + spaces
			breadcrumb.html(html);
		} else {
			console.log("⚪ No trailing slash found — skipping cleanup");
		}
	},

	pagination() {
		let self = this
		// $(document).off("click", ".open-folder").on("click", ".open-folder", function (event) {
		$(document).off("click", ".btn-paging").on("click", ".btn-paging", function () {
			// let limit_page_length = $(this).data("data-length-value");
			let limit_page_length = $(this).data("length-value");
			console.log("mapping", limit_page_length)
			let getfolder =  $('.level-item a').val();
			console.log("folder that get ",getfolder,"current folder",self.current_folder);
			let limit_start = 0
			
			self.show_media_files(self.current_folder,limit_start, limit_page_length)
		})
	},

	BackButton() {
		if (this.current_folder !== "Home") {
			this.page.add_inner_button(__('Back'), () => {
				this.Back();
			});
		}
	},

	Back() {
		let self = this;
		console.log("Back clicked...current folder was :", this.current_folder);
		let currentPath = self.current_folder;
		let path_list = currentPath.split("/");
		// console.log("self.current_folder splited :", path_list);
		console.log("before poped lenth is", path_list.length, path_list);
		let popped_element = path_list.pop();
		let popped_folder = self.folders_array.pop()

		console.log("popped element :", popped_element);
		console.log("popped array_folder :", popped_folder);

		let drive_id = $(".level-item a").last().data("drive-id");
		let shared = $(".level-item a").last().data("is-shared");
		let limit_start = 0;
		let limit_page_length = 20;

		$(".level-item a").last().remove();
		
		let breadcrumb = $(".level-item");
		let html = breadcrumb.html().trim();

		if (/(&nbsp;|\/)+$/.test(html)) {
			console.log("✅ Trailing slash found — cleaning it...");
			html = html.replace(/(&nbsp;|\/)+$/g, ""); // remove last slashes + spaces
			breadcrumb.html(html);

		} else {
			console.log("⚪ No trailing slash found — skipping cleanup");
		}

		const folder = path_list.join("/");
		const url = window.location.pathname.split("/").slice(0, -1).join("/")
		console.log("url", url, "folder :", folder);
		if (path_list.length == 1) {
			// $('.ellipsis').hide();
			console.log("its home :", path_list, "current folder :", this.current_folder);
			console.log("folder :",folder);
			this.current_folder = folder
			console.log("window location", window.location.pathname);
			console.log("url", window.location.pathname);

			// console.log("url",url);
			console.log("after splited url", url, "folder :", folder);
			history.pushState({ folder: this.current_folder }, "", url);
			self.render_template()

		} else {
			console.log("else not Home and folder:",folder);
			console.log("after poped lenth is", path_list.length, path_list);
			console.log("url", url);
			// let url = window.location.pathname.split("/").slice(0, -1).join("/")

			const folders1 = folder.split("/");
			const set_title_folder = folders1[folders1.length - 1]

			history.pushState({ folder: folder }, "", url);
			self.page.set_title(__(set_title_folder));
			self.current_folder = folder;

			this.FolderContent(drive_id, shared, limit_start, limit_page_length)
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


function make_folderPath(folder_path, folder) {

	if (folder_path.includes(folder)) {
		// split the path into parts
		let parts = folder_path.split("/");

		// find the index of the folder
		let index = parts.indexOf(folder);

		if (index !== -1) {
			// rebuild the path up to that folder
			folder_path = parts.slice(0, index + 1).join("/");
		}
	}

	return folder_path

	console.log("wow", folder_path);

}


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

function emptyState() {
	$('.custom-actions button[data-label="Delete"]').remove();
	$('.custom-actions button[data-label="Share"]').remove();

	$(".frappe-list .result").remove();
	let fileDisplayArea = document.querySelector(".frappe-list");

	if (fileDisplayArea) {

		fileDisplayArea.innerHTML = `
			<div class="no-result text-muted flex justify-center align-center" style="">
				<div class="no-result text-muted flex justify-center align-center">
					<div class="msg-box no-border">
						<div>
							<img src="/assets/frappe/images/ui-states/list-empty-state.svg" alt="Generic Empty State" class="null-state" />
						</div>
						<p>You haven't uploaded a file yet</p>
						<p>
							<button id="upload-file" class="btn btn-default btn-sm btn-new-doc hidden-xs">
								Upload File
							</button>
							<button class="btn btn-primary btn-new-doc visible-xs">
								Create New
							</button>
						</p>
					</div>
				</div>
			</div>
		`
	}

}