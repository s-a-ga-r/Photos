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
def create_user_folder(user): #frappe.msgprint(str(frappe.db.exists("Drive Access", user)))
    if user and frappe.db.exists("Drive Access", user): #frappe.msgprint(str("user created"))
        all, upload_only = frappe.db.get_value("Drive Access", user, ["all", "upload_only"])
        if all or upload_only:
            username = frappe.db.get_value("User", user, "username")
        usr_flder = frappe.get_site_path(
            "public", "files", "my-drive", username
        )
        if not os.path.exists(usr_flder):
            os.makedirs(usr_flder)
            create_file(username)
        else:
            if not frappe.db.exists("File", {"file_name": username, "is_folder":1}):
                create_file(username)
            print("ths folder already exist")# frappe.msgprint(str("folder already exist"))
    elif user == "Administrator":
        administrator = "administrator"

        administrator_folder = frappe.get_site_path(
            "public", "files", "my-drive", administrator
        )


        if not os.path.exists(administrator_folder):
            os.makedirs(administrator_folder)
            create_file(administrator)
            print("Created Administrator Folder in dir and in File Doc...")
        return
    else:
        frappe.msgprint(str("User Not in Drive Access"))

def create_file(username):
    parent_folder = f"Home/{username}"
    if not frappe.db.exists("File", {"file_name": username, "is_folder": 1,"folder":"Home"}):
        print("really not created in File doctype")
        folder = frappe.get_doc({
            "doctype": "File",
            "file_name": username,
            "is_folder": 1,
            "folder": "Home"
        })
        folder.insert(ignore_permissions=True)
        return folder
    else:
        print("file exist in File Doctype dont need to create")











@frappe.whitelist()
def upload():
    """Custom file upload handler that saves files to My Drive folder with nested folder support"""
    try:
        # Get the uploaded file
        file = frappe.request.files.get('file')
        

        print(  "line no:116 file : ", file)
        if not file:
            frappe.log_error(
                title="file line 88", 
                message=file
            )
            frappe.throw("No file uploaded")
        
        # Get folder parameter
        folder = frappe.form_dict.get('folder')
        print("folder", folder)  # Home or Home/Sagar or Home/Sagar/folder2
        
        # Create My Drive directory if it doesn't exist
        site_path = get_site_path()
        print("site_path", site_path)   #./final.clubs
        username = frappe.db.get_value("User",frappe.session.user,"username")

        if folder.startswith(f"Home/{username}/") or folder == f"Home/{username}":
            print("Username in in user correctly placed after Home/")
            user_folder = folder
        else:
            # if just Home
            user_folder = f"{folder}/{username}"

        my_drive_path = os.path.join(site_path, 'public', 'files','my-drive',username)
        print("my_drive_path", my_drive_path) # ./final.clubs/public/files/my-drive
        my_drive_base_path = os.path.join(site_path, "public", "files", "my-drive")

        if not os.path.exists(my_drive_path):
            print("kim_wexler not created ? creating",my_drive_path)
            os.makedirs(my_drive_path)
        # os.makedirs(my_drive_path, exist_ok=True)
        
        target_folder_path = my_drive_path

        print("username",username)
        print("user_folder",user_folder)
        print("folder",folder)

        if folder:
            folder_parts = folder.split('/')
            if folder_parts[0].lower() == 'home':
                folder_parts = folder_parts[1:]

                print("folder_parts",folder_parts) # ['kim_wexler', 'Kim']
                print("before target_folder_path",target_folder_path)

            target_folder_path_list = target_folder_path.split('/')
            print("target_folder_path_list",target_folder_path_list)
            
            for folder_part in folder_parts:
                if folder_part.strip():  # Skip empty parts
                    print("folder_part.strip()",folder_part.strip())
                    if not folder_part.strip() in target_folder_path_list:
                        target_folder_path = os.path.join(target_folder_path, folder_part.strip())
                        print("after target_folder_path",target_folder_path)
                        print(f"{folder_part.strip()} not in target_folder_path: ",target_folder_path)
                    if not os.path.exists(target_folder_path):
                        os.makedirs(target_folder_path)
                        print(f"Created folder: {target_folder_path}")
        
        print("saving file to :", target_folder_path) #./localhub.commit.io/public/files/my-drive/kim_wexler
        print("file_name :", file.filename)
        filename = file.filename
        file_path = os.path.join(target_folder_path, filename)
        
        counter = 1
        original_filename = filename
        print("original_filename", original_filename)
        print("file_path", file_path)
        
        while os.path.exists(file_path):
            print("Inside the while")
            name, ext = os.path.splitext(original_filename)
            print("name: ",name,"ext : ",ext)
            filename = f"{name}_{counter}{ext}"
            print("filename inside the while",filename)

            file_path = os.path.join(target_folder_path, filename)
            print("while file_path : ",file_path)
            counter += 1

        print("outside the while File_Path",file_path)
        
        # Save the file physically
        file.save(file_path)
        relative_path = os.path.relpath(file_path, my_drive_base_path)
        print("relative path",relative_path)
        file_url = f"/files/my-drive/{relative_path.replace(os.sep, '/')}"
        print("the final file url is ",file_url)

        # frappe.flags.ignore_file_size_limit = True

        print("the folder where file is getting upload ", user_folder)
       
        # Create File document in Frappe
        file_doc = frappe.get_doc({
            "doctype": "File",
            "file_name": filename,
            "file_url": file_url,
            "folder": user_folder,
        })
        file_doc.insert(ignore_permissions=True)

        # Create Drive Manager document
        try:
            dm = frappe.get_doc({
                "doctype": "Drive Manager",
                "file_name": filename,
                "created_by": frappe.session.user,
                "folder": user_folder,
                "attached_to_name": file_doc.name
            })

            dm.flags.ignore_permissions = True
            dm.insert(ignore_permissions=True)
        except Exception as drive_error:
            frappe.log_error(
                title="Drive Manager Creation Failed",
                message=frappe.as_json({
                    "traceback": frappe.get_traceback(),
                    "target_folder": user_folder,
                    "file_id": file.name
                })
            )
            print(f"Drive document creation failed: {str(drive_error)}")
            drive_id = "Not Created"

        uploaded_files = []
        # tags = frappe.db.sql(query,as_dict=1)
        get_tags(file_doc.name)
        # print("tags",tags)

        uploaded_files.append({
            "file_id": file_doc.name,
            "drive_id": dm.name,
            "file_name": filename,
            "file_url": file_url,
            "folder": user_folder,
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
    except Exception as e:
        # frappe.log_error(f"File upload error: {str(e)}")
        frappe.throw(f"Error uploading file: {str(e)}")
        frappe.log_error(
                title="Error uploading file:", 
                message=e
            )





def get_data_for_admin(keywrd,owner,admin,is_user_folder):
    if keywrd == "Folders":
        print("getting data for admin")

        query = """
            SELECT
                f.name as file_id,
                dm.name AS drive_id,
                dm.attached_to_name,
                dm.file_name AS filename,
                dm.created_by,
                dm.creation,
                0 as shared,
                %s as drive_admin
            FROM
                `tabDrive Manager` AS dm
            INNER JOIN
                `tabFile` AS f ON dm.attached_to_name = f.name
            WHERE
                dm.is_folder = %s
                AND (
                    dm.created_by != %s
                    OR dm.is_user_folder != %s
                )
            ORDER BY
                dm.creation DESC
        """
        data = frappe.db.sql(query, (admin,1,owner,is_user_folder), as_dict=True)
        return data
    elif keywrd == "Documents":
        print("getting data for admin")

        query = """
            SELECT
                dm.name as drive_id,
                dm.file_name AS filename,
                dm.created_by,
                f.name as file_id,
                f.folder,
                f.file_type,
                f.creation,
                f.is_folder,
                f.file_url,
                %s as drive_admin

            FROM
                `tabDrive Manager` AS dm
            INNER JOIN
                `tabFile` AS f ON f.name = dm.attached_to_name
            WHERE
                f.file_type IN ('XLSX', 'XLS', 'CSV', 'PDF', 'DOCX', 'DOC', 'TXT')
            ORDER BY
                f.creation DESC
            """

        data = frappe.db.sql(query, (admin), as_dict=True)
        return data



        




