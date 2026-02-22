import frappe
import json
import os
import shutil
from datetime import datetime,timedelta
import traceback


from frappe import _
from frappe.utils.file_manager import save_file
from frappe.utils import get_site_path
from frappe.utils import now

from photos.my_drive.doctype.docman_audit_log.docman_audit_log import make_audit_dict,create_audit_log


@frappe.whitelist()
def create_user_folder(user):

	# frappe.msgprint(str(frappe.db.exists("Drive Access",user)))
	
	if user and frappe.db.exists("Drive Access",user):
		# frappe.msgprint(str("user created"))
		all,upload_only = frappe.db.get_value("Drive Access",user,["all","upload_only"])
		if all or upload_only:
			username = frappe.db.get_value("User",user,"username")
			
			usr_flder = frappe.get_site_path(
				"public", "files", "my-drive", username
			)
			if not os.path.exists(usr_flder):
				os.makedirs(usr_flder)
			else:
				frappe.msgprint(str("folder already exist"))
	else:
		frappe.msgprint(str("User Not in Drive Access"))

