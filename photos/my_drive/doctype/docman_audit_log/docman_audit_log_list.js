// Copyright (c) 2026, Gavin D'souza and contributors
// For license information, please see license.txt

// frappe.ui.form.on("DocMan Audit Log", {
// 	refresh(frm) {

// 	},
// });

frappe.listview_settings['DocMan Audit Log'] = {
    refresh: function(listview) {
        $('span.sidebar-toggle-btn').hide();
        $('.col-lg-2.layout-side-section').hide();
    }
};
