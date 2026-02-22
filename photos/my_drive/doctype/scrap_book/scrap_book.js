// Copyright (c) 2026, Sagar Patil and contributors
// For license information, please see license.txt

frappe.ui.form.on("Scrap Book", {
	refresh(frm) {
        frm.disable_save();
        if (frm.doc.status != "Restored" && frm.doc.status != "Deleted"){



             frm.add_custom_button(__("Restore"), function () {
                frappe.call({
                    method: "photos.my_drive.doctype.scrap_book.scrap_book.restore",
                    args: { doc_name: frm.doc.name },
                    callback: function (r) {
                        frm.reload_doc();
                    },
                });
            });

            frm.add_custom_button(__('Delete'), function(){	

                frappe.confirm(
                    'Are you sure you want to delete this record?', // The message to display
                    function(value) { 
                        console.log('Confirmed, deleting record...',value);
                        // frm.save('Delete'); // Example for form context

                        frappe.xcall("photos.my_drive.doctype.scrap_book.scrap_book.delete_file", {
                            name: frm.doc.name
                        }).then(r => {
                            if(r){
                         
                                frappe.msgprint({
                                    title: __("Deleted"),
                                    message: __("File Deleted Successfully"),
                                    indicator: "green"
                                });

                                frm.reload_doc();
                            }

                        });
                    },
                    function(value) { // Callback for 'No' (negative confirmation)
                        // Your code to run on 'No' click (or if dialog is closed)
                        console.log('Cancelled the action.',value);
                        // frappe.show_alert('Action cancelled!', 3); // Example alert
                    }
                );

            })

            frm.add_custom_button(__('Download'), function(){	

                frappe.call({
                    method: "photos.download.can_download",
                    args: {
                        scrap_id: frm.doc.name
                    },
                    callback(r) {
                        if (!r.message) {
                            frappe.msgprint({
                                title: __("Error"),
                                message: __("File not found on server."),
                                indicator: "red"
                            });
                            return;
                        }

                        // SAFE to download
                        window.open(
                            `/api/method/photos.download.download_scrap_file?scrap_id=${frm.doc.name}`
                        );
                    }
                });

                // before updated only this line 
                // window.open(`/api/method/photos.download.download_scrap_file?scrap_id=${frm.doc.name}`);
            })

        }

        // if (frm.doc.status != "Deleted"){

        //     // Restore File
           

        //     // Download File
        //     frm.add_custom_button(__('Download'), function(){	

        //         frappe.call({
        //             method: "photos.download.can_download",
        //             args: {
        //                 scrap_id: frm.doc.name
        //             },
        //             callback(r) {
        //                 if (!r.message) {
        //                     frappe.msgprint({
        //                         title: __("Error"),
        //                         message: __("File not found on server."),
        //                         indicator: "red"
        //                     });
        //                     return;
        //                 }

        //                 // SAFE to download
        //                 window.open(
        //                     `/api/method/photos.download.download_scrap_file?scrap_id=${frm.doc.name}`
        //                 );
        //             }
        //         });

        //         // before updated only this line 
        //         // window.open(`/api/method/photos.download.download_scrap_file?scrap_id=${frm.doc.name}`);
        //     })

        //     // Delete File
            
        // }

	},
});