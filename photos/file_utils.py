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
from photos.my_drive.page.my_drive_v2.my_drive_v2 import get_tags

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
				print("ths folder already exist")
				# frappe.msgprint(str("folder already exist"))
	elif user == "Administrator":
		usr_flder = "administrator"
		if not os.path.exists(usr_flder):
			os.makedirs(usr_flder)
		return
	else:
		frappe.msgprint(str("User Not in Drive Access"))






import os
from frappe.utils.file_manager import save_file
from frappe.utils import get_site_path
from frappe.utils import now

@frappe.whitelist()
def upload_file_to_my_drive():
    """Custom file upload handler that saves files to My Drive folder with nested folder support"""
    try:
        # Get the uploaded file
        file = frappe.request.files.get('file')
        print("file", file)
        if not file:
            frappe.throw("No file uploaded")
        
        # Get folder parameter
        folder = frappe.form_dict.get('folder')
        print("folder", folder)  # Home or Home/Sagar or Home/Sagar/folder2
        
        # Create My Drive directory if it doesn't exist
        site_path = get_site_path()
        print("site_path", site_path)   #./final.clubs
        username = frappe.db.get_value("User",frappe.session.user,"username")
        print("username",username)
        my_drive_path = os.path.join(site_path, 'public', 'files','my-drive',username)
        print("my_drive_path", my_drive_path) # ./final.clubs/public/files/my-drive
        my_drive_base_path = os.path.join(site_path, "public", "files", "my-drive")


        # if not os.path.exists(my_drive_path):
        #     os.makedirs(my_drive_path)
        os.makedirs(my_drive_path, exist_ok=True)
        
        target_folder_path = my_drive_path
        
        if folder and folder != 'My Drive':
            folder_parts = folder.split('/')
            if folder_parts[0].lower() == 'home':
                folder_parts = folder_parts[1:]
            
            for folder_part in folder_parts:
                if folder_part.strip():  # Skip empty parts
                    target_folder_path = os.path.join(target_folder_path, folder_part.strip())
                    if not os.path.exists(target_folder_path):
                        os.makedirs(target_folder_path)
                        print(f"Created folder: {target_folder_path}")
        
        print("target_folder_path", target_folder_path) #./final.clubs/public/files/my-drive
        
        filename = file.filename
        file_path = os.path.join(target_folder_path, filename)
        
        counter = 1
        original_filename = filename
        print("original_filename", original_filename)
        print("file_path", file_path)
        
        while os.path.exists(file_path):
            name, ext = os.path.splitext(original_filename)
            filename = f"{name}_{counter}{ext}"
            file_path = os.path.join(target_folder_path, filename)
            counter += 1
        print("file_path",file_path)
        
        # Save the file physically
        file.save(file_path)
        
        
        relative_path = os.path.relpath(file_path, my_drive_base_path)
        print("relative path",relative_path)
        file_url = f"/files/my-drive/{relative_path.replace(os.sep, '/')}"
        print("the final file url is ",file_url)
        frappe.flags.ignore_file_size_limit = True
			
        # Create the file URL relative to the my-drive folder
        # Calculate the relative path from my-drive folder
        # relative_path = os.path.relpath(file_path, my_drive_path)
        # file_url = f"/files/my-drive/{relative_path.replace(os.sep, '/')}"
        # print("file_url", file_url)
        

		
        

        
        # Create File document in Frappe
        file_doc = frappe.get_doc({
            "doctype": "File",
            "file_name": filename,
            "file_url": file_url,
            "folder": folder,
            "is_private": 0,  # Make it public so it can be accessed via URL
        })
        file_doc.insert()

        # Create Drive Manager document
        dm = frappe.get_doc({
            "doctype": "Drive Manager",
            "file_name": filename,
            "created_by": frappe.session.user,
            "folder": folder,
            "attached_to_name": file_doc.name
        })

        dm.flags.ignore_permissions = True
        dm.insert()

        uploaded_files = []
        # tags = frappe.db.sql(query,as_dict=1)
        get_tags(file_doc.name)
        # print("tags",tags)

        uploaded_files.append({
            "file_id": file_doc.name,
            "drive_id": dm.name,
            "file_name": filename,
            "file_url": file_url,
            "folder": folder,
            "physical_path": file_path,
            "created_by": frappe.session.user
        })
        audit_log = {
			"filename":filename,
			"file_id" :file_doc.name,
			"drive_id": dm.name,
			"session_user": frappe.session.user,
			"opration":"Upload"
		}
        audit_log = make_audit_dict(audit_log)



        if uploaded_files:
            create_audit_log(audit_log)
            return {
                "success": True,
                "uploaded_files":uploaded_files,
                "folder":folder,
                "total_uploaded": len(uploaded_files)
            }
        
        # return {
        #     "file_url": file_url,
        #     "file_name": filename,
        #     "file_type": file.content_type,
        #     "file_id": file_doc.name,
        #     "drive_id": dm.name,
        #     "folder_path": target_folder_path
        # }
    
    except Exception as e:
        frappe.log_error(f"File upload error: {str(e)}")
        frappe.throw(f"Error uploading file: {str(e)}")