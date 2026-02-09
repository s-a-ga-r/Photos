# Copyright (c) 2026, Sagar Patil and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.workflow import get_workflow_name
from photos.my_drive.doctype.docman_audit_log.docman_audit_log import make_audit_dict,create_audit_log


# from frappe.core.doctype.deleted_document.deleted_document import restore


from frappe import _

import os
import json
import shutil

class ScrapBook(Document):
	pass


@frappe.whitelist()
def restore(doc_name, alert=True):
	# frappe.msgprint(str(doc_name))
	scrp_doc = frappe.get_doc("Scrap Book",doc_name)
	
		
	if not os.path.exists(scrp_doc.scrap_file_url):
		frappe.throw("File Not Exist")

	if os.path.isfile(scrp_doc.scrap_file_url):
		shutil.move(scrp_doc.scrap_file_url,scrp_doc.original_file_url)

	if os.path.exists(scrp_doc.original_file_url):
		if scrp_doc.deleted_file_id:		
			name = frappe.get_value("Deleted Document",{"deleted_name":scrp_doc.deleted_file_id},"name")
			print("restore deleted file_id:",name)
			new_file_id = restore_file_document(name)
			if new_file_id and scrp_doc.deleted_drive_id:
				name = frappe.get_value("Deleted Document",{"deleted_name":scrp_doc.deleted_drive_id},"name")
				new_drive_id = restore_drive_document(name,new_file_id,scrp_doc.original_file_url)

			frappe.msgprint(_("File : {0}, Drive : {1} Restored").format(new_file_id,new_drive_id))
			
			scrp_doc.restored = 1
			scrp_doc.status = "Restored"
			scrp_doc.db_update()
			# frappe.msgprint(_("File {0} Restored").format(i))

	else:
		frappe.msgprint(_("File not Restored"))

		# frappe.msgprint(str("File moved"))



@frappe.whitelist()
def restore_file_document(name,alert=True):
	deleted = frappe.get_doc("Deleted Document", name)

	if deleted.restored:
		frappe.throw(_("Document {0} Already Restored").format(name), exc=frappe.DocumentAlreadyRestored)

	doc = frappe.get_doc(json.loads(deleted.data))

	try:
		doc.insert()
	except frappe.DocstatusTransitionError:
		frappe.msgprint(_("Cancelled Document restored as Draft"))
		doc.docstatus = 0
		active_workflow = get_workflow_name(doc.doctype)
		if active_workflow:
			workflow_state_fieldname = frappe.get_value("Workflow", active_workflow, "workflow_state_field")
			if doc.get(workflow_state_fieldname):
				doc.set(workflow_state_fieldname, None)
		doc.insert()

	doc.add_comment("Edit", _("restored {0} as {1}").format(deleted.deleted_name, doc.name))

	deleted.new_name = doc.name
	deleted.restored = 1
	deleted.db_update()

	if alert:
		return doc.name


def restore_drive_document(name,new_file_id,directory,alert=True):
	deleted = frappe.get_doc("Deleted Document", name)

	if deleted.restored:
		frappe.throw(_("Document {0} Already Restored").format(name), exc=frappe.DocumentAlreadyRestored)

	drive_dict = json.loads(deleted.data)
	drive_dict['attached_to_name'] = new_file_id
	deleted.data = json.dumps(drive_dict)
	# frappe.msgprint(str(drive_dict))

	doc = frappe.get_doc(drive_dict)

	try:
		doc.insert()
	except frappe.DocstatusTransitionError:
		frappe.msgprint(_("Cancelled Document restored as Draft"))
		doc.docstatus = 0
		active_workflow = get_workflow_name(doc.doctype)
		if active_workflow:
			workflow_state_fieldname = frappe.get_value("Workflow", active_workflow, "workflow_state_field")
			if doc.get(workflow_state_fieldname):
				doc.set(workflow_state_fieldname, None)
		doc.insert()

	doc.add_comment("Edit", _("restored {0} as {1}").format(deleted.deleted_name, doc.name))

	filename = frappe.get_value("File",new_file_id,"file_name")

	audit_log = {
		"filename":filename,
		"file_id" :new_file_id,
		"drive_id": doc.name,
		"session_user": frappe.session.user,
		"opration":"Restore"
	}

	audit_log = make_audit_dict(audit_log)

	create_audit_log(audit_log)

	deleted.new_name = doc.name
	deleted.restored = 1
	deleted.db_update()

	if alert:
		return doc.name
	

@frappe.whitelist()
def delete_file(name):
	frappe.msgprint(str(name))

	deleted = frappe.get_doc("Scrap Book", name)	

	if os.path.isfile(deleted.scrap_file_url):
		os.remove(deleted.scrap_file_url)

		deleted.status = "Deleted"
		deleted.restored = 0
		deleted.db_update()
		

		return f"Deleted file: {deleted.scrap_file_url}"
	


	# deleted = frappe.get_doc("Scrap Book", name)

	# if deleted.restored:
	# 	frappe.throw(_("Document {0} Already Restored").format(name), exc=frappe.DocumentAlreadyRestored)

	# doc = frappe.get_doc(json.loads(deleted.data))

	# try:
	# 	doc.insert()
	# except frappe.DocstatusTransitionError:
	# 	frappe.msgprint(_("Cancelled Document restored as Draft"))
	# 	doc.docstatus = 0
	# 	active_workflow = get_workflow_name(doc.doctype)
	# 	if active_workflow:
	# 		workflow_state_fieldname = frappe.get_value("Workflow", active_workflow, "workflow_state_field")
	# 		if doc.get(workflow_state_fieldname):
	# 			doc.set(workflow_state_fieldname, None)
	# 	doc.insert()

	# doc.add_comment("Edit", _("restored {0} as {1}").format(deleted.deleted_name, doc.name))

	# deleted.new_name = doc.name
	# deleted.restored = 1
	# deleted.db_update()

	# if alert:
	# 	frappe.msgprint(_("Document Restored"))