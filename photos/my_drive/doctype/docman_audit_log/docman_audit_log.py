# Copyright (c) 2026, Gavin D'souza and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _


class DocManAuditLog(Document):
	pass

def make_audit_dict(log):
    print("audit_log",log)
    print(log['session_user'])
    # audit_log = {}
    if log['opration'] == "View":
        audit_log = {}
        audit_log["title"] = f'{log['session_user']} {log['opration']}ed Document Management'
        audit_log["file_id"] = None
        audit_log["drive_id"] = None
        audit_log["session_user"]=log['session_user']
        audit_log["opration"] = log['opration']
        audit_log["file_type"] = None
        return audit_log
    elif log['opration'] == "Upload":
        audit_log = {}
        print("Operation is Upload file_id",log['file_id'])
        # filename = frappe.get_value("File",log['file_id'],"file_name")
        print("opration is Upload and file name is :",log['filename'])
        audit_log["title"] = f'{log['session_user']} {log['opration']}ed {log['filename']} in Document Management'
        audit_log["file_id"] = log['file_id']
        audit_log["drive_id"] = log['drive_id']
        audit_log["session_user"]=log['session_user']
        audit_log["opration"] = log['opration']
        return audit_log
    elif log['opration'] == "Download":
        audit_log = {}
        print("Operation is Upload file_id",log['file_id'])
        # filename = frappe.get_value("File",log['file_id'],"file_name")
        print("opration is Upload and file name is :",log['filename'])
        audit_log["title"] = f'{log['session_user']} {log['opration']}ed {log['filename']} in Document Management'
        audit_log["file_id"] = log['file_id']
        audit_log["drive_id"] = log['drive_id']
        audit_log["session_user"]=log['session_user']
        audit_log["opration"] = log['opration']
        return audit_log

    elif log['opration'] == "Delete":
        audit_log = {}
        
        print("opration is Delete and file name is :",log['filename'])
        audit_log["title"] = f'{log['session_user']} {log['opration']}d {log['filename']} in Document Management'
        audit_log["file_id"] = log['file_id']
        audit_log["drive_id"] = log['drive_id']
        audit_log["session_user"]=log['session_user']
        audit_log["opration"] = log['opration']
        return audit_log
    
    elif log['opration'] == "Restore":
        audit_log = {}
        print("opration is Restore and file name is :",log['filename'])
        audit_log["title"] = f'{log['session_user']} {log['opration']}ed {log['filename']} in Document Management'
        audit_log["file_id"] = log['file_id']
        audit_log["drive_id"] = log['drive_id']
        audit_log["session_user"]=log['session_user']
        audit_log["opration"] = log['opration']
        return audit_log
    

    else:
        frappe.throw(_("Opration error the opration is :",log['opration']))




def create_audit_log(audt_log):
    today = frappe.utils.getdate()

    file_type = frappe.get_value("File",audt_log['file_id'],"file_type")
    print("file type is",file_type)
    print("audt_log is",audt_log)
    print("audt_log title",audt_log['title'])
  
    if audt_log['opration'] == "View":
        existing_log = frappe.db.get_value(
            "DocMan Audit Log",
            {
                "title": audt_log['title'],
                "drive_access": audt_log['session_user'],
                "operation": audt_log['opration'],
                "creation": ["between", [f"{today} 00:00:00", f"{today} 23:59:59"]]
            },
            "name"
        )
        if existing_log:
            doc = frappe.get_doc("DocMan Audit Log", existing_log)

            doc.view_count = (doc.view_count or 0) + 1
            doc.last_viewed_on = frappe.utils.now()

            doc.flags.ignore_permissions = True
            doc.save()

        else:
            # ➕ CREATE new log
            doc = frappe.get_doc({
                "doctype": "DocMan Audit Log",
                "title": audt_log['title'],
                "drive_manager": audt_log['drive_id'],
                "drive_access": audt_log['session_user'],
                "operation": audt_log['opration'],
                "file_type": file_type,
                "view_count": 1
            })

            doc.flags.ignore_permissions = True
            doc.insert()

        # if frappe.db.exist("DocMan Audit Log",{"title":f'{audt_log.session_user} {audt_log.opration}ed',"drive_access":audt_log.session_user,"operation":audt_log.operaton}):
        #     doc = frappe.get_doc("DocMan Audit Log",f'{audt_log.session_user} {audt_log.opration}ed')

    else:
        dm = frappe.get_doc({
            "doctype": "DocMan Audit Log",
            "title": audt_log['title'],
            "drive_manager":audt_log['drive_id'],
            "drive_access":audt_log['session_user'],
            "operation":audt_log['opration'],
            "file_type":file_type,
            "operation_on":frappe.utils.now()
        })
        dm.flags.ignore_permissions = True
        dm.insert()