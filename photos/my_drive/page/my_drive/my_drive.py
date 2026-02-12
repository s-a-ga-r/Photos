import frappe
import json
from frappe import _
from datetime import datetime,timedelta

@frappe.whitelist()
def render_template(owner,folder):
    drive_access = frappe.get_value("Drive Access", {"user": owner},["view_only", "upload_only","all"], as_dict=True) or {}

    if not drive_access:
        frappe.throw(_("You do not have access to this drive. Please contact your administrator."))
        return

    if frappe.session.user == "Administrator":
        user_details = {'employee_name':"Administrator","designation":"Administrator","standard_img":"A"}
        last_login = frappe.get_value("User",{"first_name":owner},['last_active'],as_dict = True) or {}
        last_active = last_login.get('last_active', None)
        updated_user_login=format_last_login(last_active)
        user_details['last_login'] = updated_user_login
    else:
        user_details = frappe.get_value("Employee",{"prefered_email":owner},['employee_name','designation'],as_dict = True) or {}
        
        if not user_details:
            last_login = frappe.get_value("User",{"email":owner},['last_active','full_name'],as_dict = True) or {}
            initials = "".join([part[0] for part in last_login.full_name.strip().split()[:2]]).upper()
            last_active = last_login.get('last_active', None)
            updated_user_login=format_last_login(last_active)
            user_details['last_login'] = updated_user_login
            user_details['standard_img'] = initials
            user_details['designation'] = owner
            user_details['employee_name'] = last_login.full_name

        else:
            last_login = frappe.get_value("User",{"email":owner},['last_active'],as_dict = True) or {}
            initials = "".join([part[0] for part in user_details.employee_name.strip().split()[:2]]).upper()
            last_active = last_login.get('last_active', None)
            updated_user_login=format_last_login(last_active)
            user_details['last_login'] = updated_user_login
            user_details['standard_img'] = initials
    
    # frappe.msgprint(str(user_details))

    query="""SELECT
        dm.name as drive_id,
        dm.file_name AS filename,
        dm.created_by,
        f.name as file_id,
        f.folder,
        f.file_type,
        f.creation,
        f.is_folder,
        f.file_url
    FROM
        `tabDrive Manager` AS dm
    INNER JOIN
        `tabFile` AS f ON f.name = dm.attached_to_name
    
    WHERE
        dm.created_by = %s AND  f.folder = %s
    ORDER BY
        f.creation DESC
    """
    # query="""SELECT
    
    data = frappe.db.sql(query,(owner,folder), as_dict=True)
    # frappe.msgprint(str(data))

    query2 = """
        select
            fac.for_user,
            fac.read,
            fac.write,
            fac.delete_file,
            fac.download,
            fac.share,
            dm.name as drive_id,
            dm.file_name as filename,
            dm.created_by,
            f.name as file_id,
            f.folder,
            f.file_type,
            f.creation,
            f.is_folder,
            f.file_url
        from
            `tabFile Access Control` as fac
        inner join
            `tabDrive Manager` as dm on fac.parent = dm.name
        left join
            `tabFile` as f on dm.attached_to_name = f.name
        
        where
            fac.for_user = %s and f.folder = %s
        """
    data2 = frappe.db.sql(query2,(owner, folder), as_dict=True)

    for item in data2:
        data.append(item)
    # frappe.msgprint(str(data2))


    for item in data:
        # frappe.msgprint(str(item['file_id']))
        persons = get_tags(item['file_id'])

        # frappe.msgprint(str(persons))
        # if frappe.db.exists("Photo", {"photo": item['file_id']}):
        #     docname = frap pe.get_value("Photo",{"photo":item['file_id']},"name")
        #     # frappe.msgprint(str(docname))
        #     doc = frappe.get_doc('Photo',docname)

        #     persons = []
        #     for i in doc.people:
        #         person = frappe.get_value("ROI",{"name":i.face},"person")
        #         person_name = frappe.get_value("Person",{"name":person},"person_name")
        #         if person_name:
        #             persons.append(person_name)

            # frappe.msgprint(str(persons))
        if persons:
            item['persons'] = persons if persons else None
        if isinstance(item['creation'], datetime):
            item['creation'] = item['creation'].strftime('%b %d, %Y, %I:%M %p')
    return {
        "user_details":user_details,
        "files": data,
        "drive_access": drive_access,
    }




@frappe.whitelist()
def get_documents_files(owner):
    query="""SELECT
        dm.name as drive_id,
        dm.file_name AS filename,
        dm.created_by,
        f.name as file_id,
        f.folder,
        f.file_type,
        f.creation,
        f.is_folder,
        f.file_url
    FROM
        `tabDrive Manager` AS dm
    INNER JOIN
        `tabFile` AS f ON f.name = dm.attached_to_name
    WHERE
        dm.created_by = %s AND f.file_type IN ('XLSX', 'XLS', 'CSV', 'PDF', 'DOCX', 'DOC', 'TXT')
    ORDER BY
        f.creation DESC
    """
    # query="""SELECT
    
    data = frappe.db.sql(query,(owner), as_dict=True)
    # frappe.msgprint(str(data))

    query2 = """
        select
            fac.for_user,
            fac.read,
            fac.write,
            fac.delete_file,
            fac.download,
            fac.share,
            dm.name as drive_id,
            dm.file_name as filename,
            dm.created_by,
            f.name as file_id,
            f.folder,
            f.file_type,
            f.creation,
            f.is_folder,
            f.file_url
        from
            `tabFile Access Control` as fac
        inner join
            `tabDrive Manager` as dm on fac.parent = dm.name
        left join
            `tabFile` as f on dm.attached_to_name = f.name
        
        where
            fac.for_user = %s AND f.file_type IN ('XLSX', 'XLS', 'CSV', 'PDF', 'DOCX', 'DOC', 'TXT')
        """
    data2 = frappe.db.sql(query2,(owner), as_dict=True)



    for item in data2:
        data.append(item)
    # frappe.msgprint(str(data2))

    for item in data:
        if isinstance(item['creation'], datetime):
            item['creation'] = item['creation'].strftime('%b %d, %Y, %I:%M %p')

    # frappe.msgprint(str(data))
    
    return {
        "files": data,
    }


@frappe.whitelist()
def get_media_files(owner):

    query="""SELECT
        dm.name as drive_id,
        dm.file_name AS filename,
        dm.created_by,
        f.name as file_id,
        f.folder,
        f.file_type,
        f.creation,
        f.is_folder,
        f.file_url
    FROM
        `tabDrive Manager` AS dm
    INNER JOIN
        `tabFile` AS f ON f.name = dm.attached_to_name
    WHERE
        dm.created_by = %s AND f.file_type IN ('JPG', 'JPEG', 'MP3', 'MP4', 'PNG')
    ORDER BY
        f.creation DESC
    """
    # query="""SELECT
    
    data = frappe.db.sql(query,(owner), as_dict=True)
    # frappe.msgprint(str(data))

    query2 = """
        select
            fac.for_user,
            fac.read,
            fac.write,
            fac.delete_file,
            fac.download,
            fac.share,
            dm.name as drive_id,
            dm.file_name as filename,
            dm.created_by,
            f.name as file_id,
            f.folder,
            f.file_type,
            f.creation,
            f.is_folder,
            f.file_url
        from
            `tabFile Access Control` as fac
        inner join
            `tabDrive Manager` as dm on fac.parent = dm.name
        left join
            `tabFile` as f on dm.attached_to_name = f.name
        
        where
            fac.for_user = %s AND f.file_type IN ('JPG', 'JPEG', 'MP3', 'MP4', 'PNG')
        """
    data2 = frappe.db.sql(query2,(owner), as_dict=True)

    for item in data2:
        data.append(item)
    # frappe.msgprint(str(data2))

    for item in data:
        if isinstance(item['creation'], datetime):
            item['creation'] = item['creation'].strftime('%b %d, %Y, %I:%M %p')

    # frappe.msgprint(str(data))
    
    return {
        "files": data,
    }


def get_tags(file_id):
    """
        Fetches tags for a given file_id.
    """
    print("getting tags")
    print("File ID", file_id)
    # frappe.msgprint(str(file_id))
    if frappe.db.exists("Photo", {"photo": file_id}):
        docname = frappe.get_value("Photo",{"photo":file_id},"name")
        print("Photos docname",docname)
        doc = frappe.get_doc('Photo',docname)
        print("Photo get_doc",doc)
        persons = []
        if doc:
            for i in doc.people:
                if frappe.db.exists("ROI", {"name": i.face}):
                    person = frappe.get_value("ROI",{"name":i.face},"person")
                    person_name = frappe.get_value("Person",{"name":person},"person_name")
                    print("Person Doc person_id",person_name)
                    print("ROI Doc person name",person)
                    if person_name:
                        persons.append(person_name)
                else:
                    print("Not Found")
        else:
            print("Photo document not created yet")
            
        return persons
    



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
        my_drive_path = os.path.join(site_path, 'public', 'files', 'my-drive')
        print("my_drive_path", my_drive_path) # ./final.clubs/public/files/my-drive

        if not os.path.exists(my_drive_path):
            os.makedirs(my_drive_path)
        
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
        
        # Save the file physically
        file.save(file_path)
        
        # Create the file URL relative to the my-drive folder
        # Calculate the relative path from my-drive folder
        relative_path = os.path.relpath(file_path, my_drive_path)
        file_url = f"/files/my-drive/{relative_path.replace(os.sep, '/')}"
        
        print("file_url", file_url)
        
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
            "physical_path": file_path
        })


        if uploaded_files:
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

# @frappe.whitelist()
# def upload_file_to_my_drive():
#     """Custom file upload handler that saves files to My Drive folder"""
#     try:
#         # Get the uploaded file
#         file = frappe.request.files.get('file')
#         print("file",file)
#         if not file:
#             frappe.throw("No file uploaded")
#         # Get folder parameter
#         folder = frappe.form_dict.get('folder', 'My Drive')

#         print("folder",folder) # Home/sagar
        
#         # Create My Drive directory if it doesn't exist
#         site_path = get_site_path()
#         print("site_path",site_path)
#         my_drive_path = os.path.join(site_path, 'public', 'files', 'my-drive') #my_drive_path = ./final.clubs/public/files/my-drive

#         print("my_drive_path",my_drive_path)

#         if not os.path.exists(my_drive_path):
#             os.makedirs(my_drive_path)
        
#         # Generate unique filename to avoid conflicts
#         filename = file.filename
#         file_path = os.path.join(my_drive_path, filename)
        
#         # Handle duplicate filenames
#         counter = 1
#         original_filename = filename
#         print("original_filename",original_filename)
#         print("file_path",file_path)
#         while os.path.exists(file_path):
#             name, ext = os.path.splitext(original_filename)
#             filename = f"{name}_{counter}{ext}"
#             file_path = os.path.join(my_drive_path, filename)
#             counter += 1
        
#         # Save the file physically
#         file.save(file_path)
        
#         # Create File document in Frappe
#         file_url = f"/files/my-drive/{filename}"

#         print("file_url",file_url)


        
#         file_doc = frappe.get_doc({
#             "doctype": "File",
#             "file_name": filename,
#             "file_url": file_url,
#             "folder": folder,
#             "is_private": 0,  # Make it public so it can be accessed via URL
#         })
#         file_doc.insert()

#         dm = frappe.get_doc(
#             {
#                 "doctype": "Drive Manager",
#                 "file_name": filename,
#                 "created_by": frappe.session.user,
#                 "folder": folder,
#                 "attached_to_name":file_doc.name
#             }
#         )

#         dm.flags.ignore_permissions = True
#         dm.insert()
        
#         return {
#             "file_url": file_url,
#             "file_name": filename,
#             "file_type": file.content_type,
#             "file_id": file_doc.name,
#             "drive_id":dm.name
#         }
    
        
#     except Exception as e:
#         frappe.log_error(f"File upload error: {str(e)}")
#         frappe.throw(f"Error uploading file: {str(e)}")



import os
from frappe.utils import get_site_path
import traceback

@frappe.whitelist()
def upload_nested_folder_to_my_drive():
    try:
        # Get form data
        
        base_folder = frappe.form_dict.get('base_folder', '')  # Home
        top_folder = frappe.form_dict.get("top_folder",'')
        total_files = int(frappe.form_dict.get('total_files', 0))
        total_folders = int(frappe.form_dict.get('total_folders', 0))

        base_top_folder = f"{base_folder}/{top_folder}" if base_folder and top_folder else base_folder
        
        print(f'Total files: {total_files}, Total folders: {total_folders}, Base folder: {base_folder}')
        
        if total_files == 0:
            return {"success": False, "message": f"No files to upload (total files: {total_files})"}
        
        uploaded_files = []
        created_folders_count = 0
        
        # Get the base my-drive physical path
        site_path = get_site_path()
        my_drive_path = os.path.join(site_path, 'public', 'files', 'my-drive')

        print("created site_path",my_drive_path)
        
        # Ensure my-drive directory exists
        if not os.path.exists(my_drive_path):
            os.makedirs(my_drive_path)
        
        # Step 1: Create all folder structures first (in correct order)
        folders_to_create = []
        for i in range(total_folders):
            folder_key = f"folder_to_create_{i}"
            folder_path = frappe.form_dict.get(folder_key, '')
            print(f'Folder key {folder_key} : folder_path {folder_path}')

            if folder_path:
                folders_to_create.append(folder_path)
        
        # Sort folders by depth to create parent folders first
        folders_to_create.sort(key=lambda x: x.count('/'))

        print("Folders to create (sorted by depth):", folders_to_create)
        uploaded_folders = []
        for folder in folders_to_create:
            if folder:
                target_folder = f"{base_folder}/{folder}" if base_folder else folder
                # print(f"Creating folder structure: {target_folder}")
                # if create_nested_folder_structure(target_folder, my_drive_path):
                #     created_folders_count += 1
                uploaded_folders_d = create_nested_folder_structure1(target_folder, my_drive_path)
                if uploaded_folders_d:
                    print("Uploaded Folder:",uploaded_folders_d)
                    uploaded_folders.append(uploaded_folders_d)
                    created_folders_count += 1
        print(f"Successfully created {created_folders_count} folder structures : {uploaded_folders}")
        
        # Step 2: Process and upload all files
        for i in range(total_files):
            file_key = f"file_{i}"
            folder_path_key = f"folder_path_{i}"
            relative_path_key = f"relative_path_{i}"
            
            # Get file and path info
            uploaded_file = frappe.request.files.get(file_key)
            folder_path = frappe.form_dict.get(folder_path_key, '')
            relative_path = frappe.form_dict.get(relative_path_key, '')
            
            print(f'Processing: {file_key}={uploaded_file.filename if uploaded_file else None}, folder_path={folder_path}')
            
            if not uploaded_file:
                print(f"No file found for key: {file_key}")
                continue
            
            # Determine the target folder (full path where file should be saved)
            if folder_path:
                target_folder = f"{base_folder}/{folder_path}" if base_folder else folder_path
            else:
                target_folder = base_folder
            
            print(f"Target folder for {uploaded_file.filename}: {target_folder}")
            
            # Validate file type
            allowed_extensions = ['pdf', 'xls', 'xlsx', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'gif']
            file_extension = uploaded_file.filename.split('.')[-1].lower()
            
            if file_extension not in allowed_extensions:
                print(f"Skipping invalid file type: {uploaded_file.filename}")
                continue
            try:
                # Get physical folder path for saving file
                target_physical_path = get_physical_folder_path(target_folder, my_drive_path)
                print(f"Physical path for file: {target_physical_path}")
                
                # Handle filename conflicts
                filename = uploaded_file.filename
                file_path = os.path.join(target_physical_path, filename)
                
                counter = 1
                original_filename = filename
                
                while os.path.exists(file_path):
                    name, ext = os.path.splitext(original_filename)
                    filename = f"{name}_{counter}{ext}"
                    file_path = os.path.join(target_physical_path, filename)
                    counter += 1
                
                # Save the file physically
                uploaded_file.save(file_path)
                print(f"File saved physically at: {file_path}")
                
                # Create the file URL relative to the my-drive folder
                relative_path_from_mydrive = os.path.relpath(file_path, my_drive_path)
                file_url = f"/files/my-drive/{relative_path_from_mydrive.replace(os.sep, '/')}"
                
                # Create File document in Frappe
                file_doc = frappe.get_doc({
                    "doctype": "File",
                    "file_name": filename,
                    "file_url": file_url,
                    "folder": target_folder,
                    "is_private": 0,
                })
                file_doc.insert(ignore_permissions=True)
                
                # Create Drive Manager document
                try:
                    drive_doc = frappe.get_doc({
                        "doctype": "Drive Manager",
                        "file_name": filename,
                        "attached_to_name": file_doc.name,
                        "file_url": file_url,
                        "folder": target_folder,
                        "created_by": frappe.session.user,
                    })
                    drive_doc.insert(ignore_permissions=True)
                    drive_id = drive_doc.name
                except Exception as drive_error:
                    print(f"Drive document creation failed: {str(drive_error)}")
                    drive_id = "Not Created"
                
                uploaded_files.append({
                    "file_id": file_doc.name,
                    "drive_id": drive_id,
                    "file_name": filename,
                    "file_url": file_url,
                    "folder": target_folder,
                    "relative_path": relative_path,
                    "physical_path": file_path
                })
                
            except Exception as file_error:
                print(f"Error uploading file {uploaded_file.filename}: {str(file_error)}")
                continue
        
        if uploaded_files:
            return {
                "success": True,
                "folder": base_top_folder,
                "uploaded_files": uploaded_files,
                "uploaded_folders": uploaded_folders,
                "total_uploaded": len(uploaded_files),
                "created_folders": created_folders_count
            }
        else:
            return {
                "success": False,
                "message": {
                    "success": False,
                    "message": "No files were uploaded successfully"
                }
            }
            
    except Exception as e:
        print(f"Nested folder upload error: {str(e)}")
        return {
            "success": False,
            "message": {
                "success": False,
                "message": f"Server error: {str(e)}"
            }
        }


def create_nested_folder_structure1(folder_str,my_drive_path):
    print(f"Creating Nested Folder Structure : {folder_str}")
        # folder = Home/imges
    try:
        if not folder_str or folder_str == "/" or folder_str == "Home":
            return False
        # Clean up the path
        folder_path = folder_str.strip('/')
        folders = folder_path.split('/') # ['Home', 'imges'],['Home', 'imges', 'aaa']
        current_logical_path = ""
        current_physical_path = my_drive_path
            
        uploaded_folders_dict = {}
        for i in range(len(folders)):
            folder_name = folders[i]
            if folder_name == "Home":
                continue
            parent_list = folders[:i]
            if len(parent_list) == 1:
                parent_folder = parent_list[0]
            else:
                parent_folder = "/".join(parent_list)
            current_logical_path = f"{current_logical_path}/{folder_name}" if current_logical_path else folder_name
            # Build physical path
            current_physical_path = os.path.join(current_physical_path, folder_name)
            
            # Create physical directory if it doesn't exist
            if not os.path.exists(current_physical_path):
                os.makedirs(current_physical_path)
                print(f"Created physical directory with Physical Path: {current_physical_path}")
            # Check if File folder already exists
            existing_file_folder = frappe.db.get_value("File", {"file_name": folder_name,"is_folder": 1,"folder": parent_folder})

            print(f"Processing folder: {folder_name}")
            print(f"ParentFolder: {parent_folder}")
            print(f"Physical Path: {current_physical_path}")
            print(f"Logical Path: {current_logical_path}")

            if not existing_file_folder:
                print(f"Creating File folder: {folder_name} under parent: {parent_folder}")
                folder_doc = frappe.get_doc({
                    "doctype": "File",
                    "file_name": folder_name,
                    "is_folder": 1,
                    "folder": parent_folder
                })
                folder_doc.insert(ignore_permissions=True)
                existing_file_folder = folder_doc.name
                uploaded_folders_dict["file_id"] = folder_doc.name
                uploaded_folders_dict["file_name"] = folder_name
                uploaded_folders_dict["folder"] = parent_folder

                print(f"Created File folder: {folder_name}")
            
            # Check and create Drive Manager folder
            existing_drive_folder = frappe.db.get_value("Drive Manager", {
                "attached_to_name": existing_file_folder,
                "is_folder": 1,
            })

            print("Drive exist is :",existing_file_folder)
            
            if not existing_drive_folder:
                print(f"Creating Drive folder: {folder_name} under parent: {parent_folder}")

                drive_folder_doc = frappe.get_doc({
                    "doctype": "Drive Manager",
                    "file_name": folder_name,
                    "attached_to_name": existing_file_folder,
                    "is_folder": 1,
                    "folder": parent_folder,
                    "created_by": frappe.session.user
                })
                
                drive_folder_doc.insert(ignore_permissions=True)
                uploaded_folders_dict["drive_id"] = drive_folder_doc.name
                print(f"Created Drive Manager folder: {folder_name}")
        return uploaded_folders_dict
       
    except Exception as e:
        print(f"Error creating nested folder structure for {folder_str}: {str(e)}")
        traceback.print_exc()
        return False


def create_nested_folder_structure2(folder_str, my_drive_path):
    print(f"Creating Nested Folder Structure : {folder_str}")
    # folder = Home/imges
    try:
        if not folder_str or folder_str == "/" or folder_str == "Home":
            return False
        # Clean up the path
        folder_path = folder_str.strip('/')
        folder_list = folder_path.split('/') # ['Home', 'imges'],['Home', 'imges', 'aaa']
        current_logical_path = ""
        current_physical_path = my_drive_path
        sorted_list = folder_list[:-1]
        print("splited folder ",folder_list)
        if len(sorted_list) == 1:
            parent = sorted_list[0]
            print("if: its ",parent)
        else:
            # print("In else:",sorted_list)
            parent = "/".join(sorted_list)
            print("In else created My Parent : ",parent)

        # join_path = "/".join(folders[:-1])

        # print("stripped folder ",folder_path)
        name = folder_path

        print("My parent ",parent)
        print(f"name is : {name}")
        print("Current physical path ",current_physical_path)
        
        folders_created = False
        uploaded_folders_dict = {}
        for folder in folder_list:
            # if not folder_name or folder_name == "Home":
            if folder == "Home":
                continue
            # Build logical path step by step
            
            parent_folder = current_logical_path if current_logical_path else "Home"
            current_logical_path = f"{current_logical_path}/{folder}" if current_logical_path else folder

            # Build physical path
            print("checking current_logical_path :",current_logical_path)
            current_physical_path = os.path.join(current_physical_path, folder)
           
            print(f"Creating Physical Path: {current_physical_path}")
            # Create physical directory if it doesn't exist
            if not os.path.exists(current_physical_path):
                os.makedirs(current_physical_path)
                print(f"Created Physical Path: {current_physical_path}")                
            # Check if File folder already exists

            print(f"Processing folder: {folder}")
            print(f"parent_folder: {parent_folder}, my_parent: {parent}")

            existing_file_folder = frappe.db.get_value("File", {
                "file_name": folder,
                "is_folder": 1,
                "folder": parent_folder
            })
            print("file exist is :",existing_file_folder)

            # if frappe.db.exists("File",name):
            #     print(f"in frappe.db.exist file is exist : {frappe.db.get_value("File",parent,"name")} folder :{folder}")
                # print("folder",folder)
                # existing_file_folder = None

            exists = frappe.db.exists("File",{"file_name":folder,"is_folder":1,"folder":parent_folder}) # frappe.db.exists("File",{"name": name,"is_folder": 1})
            if exists:
                print(f"Db Exist :{exists}")
            else:
                print(f"Db Not Exist for name {name}")
                folder_doc = frappe.get_doc({
                    "doctype": "File",
                    "file_name": folder,
                    "is_folder": 1,
                    "folder": parent
                })
                folder_doc.insert(ignore_permissions=True)
                existing_file_folder = folder_doc.name
                uploaded_folders_dict["file_id"] = folder_doc.name
                uploaded_folders_dict["file_name"] = folder
                uploaded_folders_dict["folder"] = parent

                print(f"Created File folder: {folder}")

                existing_drive_folder = frappe.db.get_value("Drive Manager", {
                    "attached_to_name": existing_file_folder,
                    "is_folder": 1,
                })

                print("Drive exist is :",existing_drive_folder)
            
                if not existing_drive_folder:
                    print(f"Creating Drive folder: {folder} attached_to_file: {existing_file_folder}")

                    drive_folder_doc = frappe.get_doc({
                        "doctype": "Drive Manager",
                        "file_name": folder,
                        "attached_to_name": existing_file_folder,
                        "is_folder": 1,
                        "folder": parent,
                        "created_by": frappe.session.user
                    })
                    
                    drive_folder_doc.insert(ignore_permissions=True)
                    uploaded_folders_dict["drive_id"] = drive_folder_doc.name
                    print(f"Created Drive Manager folder: {folder}")
        return uploaded_folders_dict
    except Exception as e:
        print(f"Error creating nested folder structure for {folder_str}: {str(e)}")
        traceback.print_exc()
        return False



def create_nested_folder_structure(folder, my_drive_path):
    print(f"Creating Nested Folder Structure : {folder}")
    # folder = Home/imges
    try:
        if not folder or folder == "/" or folder == "Home":
            return False
        # Clean up the path
        folder_path = folder.strip('/')
        folders = folder_path.split('/') # ['Home', 'imges'],['Home', 'imges', 'aaa']
        current_logical_path = ""
        current_physical_path = my_drive_path
        sorted_list = folders[:-1] 
        if len(sorted_list) == 1:
            parent = sorted_list[0]
            print("In if:",parent)
        else:
            print("In else:",sorted_list)
            parent = "/".join(sorted_list)
            print("My Parent : ",parent)

        # join_path = "/".join(folders[:-1])

        print("stripped folder ",folder_path)
        print("splited folder ",folders)
        print("My parent ",parent)
        print("current_physical_path ",current_physical_path)
        
        folders_created = False
        uploaded_folders_dict = {}
        for folder_name in folders:
            # if not folder_name or folder_name == "Home":
            if folder_name == "Home":
                continue
            # Build logical path step by step
            name = folder_path
            parent_folder = current_logical_path if current_logical_path else "Home"
            current_logical_path = f"{current_logical_path}/{folder_name}" if current_logical_path else folder_name
            # Build physical path
            current_physical_path = os.path.join(current_physical_path, folder_name)
            print(f"Processing folder: {folder_name}")
            print(f"ParentFolder: {parent_folder}, MyParent: {parent}")
            print(f"Physical Path: {current_physical_path}")
            print(f"Logical Path: {current_logical_path}")
            # Create physical directory if it doesn't exist
            if not os.path.exists(current_physical_path):
                os.makedirs(current_physical_path)
                print(f"Created physical directory with Physical Path: {current_physical_path}")
            # Check if File folder already exists
            existing_file_folder = frappe.db.get_value("File", {
                "file_name": folder_name,
                "is_folder": 1,
                "folder": parent_folder
            })

            print(f"parent is : {parent}, name is : {name}")

            if frappe.db.exists("File", name):
                print("file exist",frappe.db.get_value("File",parent,"name"))
                print("No need to create folder",folder_name)
                # existing_file_folder = None
            print("file exist is :",existing_file_folder)
            
            # Create File folder if it doesn't exist

            if not existing_file_folder:
                print(f"Creating File folder: {folder_name} under parent: {parent_folder}")

                # if folder_name == "aaa":
                #     parent_folder = f"Home/{parent_folder}"
                #     print("this is aaa parent_folder : ",parent_folder,"my parent :",parent)

                folder_doc = frappe.get_doc({
                    "doctype": "File",
                    "file_name": folder_name,
                    "is_folder": 1,
                    "folder": parent
                })
                folder_doc.insert(ignore_permissions=True)
                existing_file_folder = folder_doc.name
                uploaded_folders_dict["file_id"] = folder_doc.name
                uploaded_folders_dict["file_name"] = folder_name
                uploaded_folders_dict["folder"] = parent

                print(f"Created File folder: {folder_name}")
                folders_created = True
            
            # Check and create Drive Manager folder
            existing_drive_folder = frappe.db.get_value("Drive Manager", {
                "attached_to_name": existing_file_folder,
                "is_folder": 1,
            })

            print("Drive exist is :",existing_file_folder)
            
            if not existing_drive_folder:
                print(f"Creating Drive folder: {folder_name} under parent: {parent_folder}")

                drive_folder_doc = frappe.get_doc({
                    "doctype": "Drive Manager",
                    "file_name": folder_name,
                    "attached_to_name": existing_file_folder,
                    "is_folder": 1,
                    "folder": parent,
                    "created_by": frappe.session.user
                })
                
                drive_folder_doc.insert(ignore_permissions=True)
                uploaded_folders_dict["drive_id"] = drive_folder_doc.name
                print(f"Created Drive Manager folder: {folder_name}")
            
            # print("uploaded folder dict",uploaded_folders_dict)

            # uploaded_folders.append(uploaded_folders_dict)
        return uploaded_folders_dict
        # return folders_created
            # {
            #     "file_id": file_doc.name,
            #     "drive_id": drive_id,
            #     "file_name": filename,
            #     "file_url": file_url,
            #     "folder": target_folder,
            #     "relative_path": relative_path,
            #     "physical_path": file_path
            # }
        # return uploaded_folders
    except Exception as e:
        print(f"Error creating nested folder structure for {folder}: {str(e)}")
        traceback.print_exc()
        return False

def get_physical_folder_path(folder_path, my_drive_path):
    if not folder_path or folder_path == "Home":
        return my_drive_path
    
    # Remove "Home" from the beginning and clean up the path
    if folder_path.startswith("Home/"):
        relative_path = folder_path[5:]  # Remove "Home/"
    elif folder_path.startswith("Home"):
        relative_path = folder_path[4:].lstrip('/')  # Remove "Home"
    else:
        relative_path = folder_path
    
    if not relative_path:
        return my_drive_path
    
    # Convert to physical path
    physical_path = os.path.join(my_drive_path, *relative_path.split('/'))
    
    print(f"Converted '{folder_path}' to physical path: '{physical_path}'")
    return physical_path


'''@frappe.whitelist()
def upload_folder_to_my_drive():
    try:
        # Get form data
        base_folder = frappe.form_dict.get('base_folder', '') #Home
        total_files = int(frappe.form_dict.get('total_files', 0)) #3
        print(f'total files {total_files}, base_folder {base_folder}')
        
        frappe.log_error(f"Upload folder debug - Base folder: {base_folder}, Total files: {total_files}")
        
        if total_files == 0:
            return {"success": False, "message": f"No files to upload total files {total_files}"}
        
        uploaded_files = []
        created_folders = set()  # Track created folders to avoid duplicates
        
        # Get the base my-drive physical path
        site_path = get_site_path()
        my_drive_path = os.path.join(site_path, 'public', 'files', 'my-drive')
        
        # Ensure my-drive directory exists
        if not os.path.exists(my_drive_path):
            os.makedirs(my_drive_path)
        
        # First, create all necessary folders
        for i in range(total_files):
            folder_path_key = f"folder_path_{i}"
            folder_path = frappe.form_dict.get(folder_path_key, '')
            print(folder_path,"folder_path")
            
            if folder_path and folder_path not in created_folders:
                target_folder = f"{base_folder}/{folder_path}" if base_folder else folder_path
                print("creating new folder",target_folder)
                create_folder_structure(target_folder, my_drive_path)
                created_folders.add(folder_path)
                print("created folders",created_folders)
        
        # Process each file

        for i in range(total_files):
            file_key = f"file_{i}"
            folder_path_key = f"folder_path_{i}"
            relative_path_key = f"relative_path_{i}"

            print("file_key :",file_key,"folder_path_key :",folder_path_key,"relative_path_key :",relative_path_key)
            
            # Get file and path info
            uploaded_file = frappe.request.files.get(file_key)
            folder_path = frappe.form_dict.get(folder_path_key, '')
            relative_path = frappe.form_dict.get(relative_path_key, '')

            print(f'{file_key} : {uploaded_file}, {folder_path_key} : {folder_path} , {relative_path_key} : {relative_path}')
            
            if not uploaded_file:
                frappe.log_error(f"No file found for key: {file_key}")
                continue
            
            # Determine the target folder
            if folder_path:
                target_folder = f"{base_folder}/{folder_path}" if base_folder else folder_path
            else:
                target_folder = base_folder
            
            frappe.log_error(f"Processing file: {uploaded_file.filename} to folder: {target_folder}")
            
            # Validate file type
            allowed_extensions = ['pdf', 'xls', 'xlsx', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'gif']
            file_extension = uploaded_file.filename.split('.')[-1].lower()
            
            if file_extension not in allowed_extensions:
                frappe.log_error(f"Invalid file type: {uploaded_file.filename}")
                continue
            try:
                # Get physical folder path for saving file
                target_physical_path = get_physical_folder_path(target_folder, my_drive_path)
                
                # Handle filename conflicts (like in single file upload)
                filename = uploaded_file.filename
                file_path = os.path.join(target_physical_path, filename)
                
                counter = 1
                original_filename = filename
                print("original_filename", original_filename,"filename",filename)
                print("file_path", file_path)
                
                while os.path.exists(file_path):
                    name, ext = os.path.splitext(original_filename)
                    filename = f"{name}_{counter}{ext}"
                    file_path = os.path.join(target_physical_path, filename)
                    counter += 1
                
                # Save the file physically
                uploaded_file.save(file_path)
                print(f"File saved physically at: {file_path}")
                
                # Create the file URL relative to the my-drive folder
                relative_path_from_mydrive = os.path.relpath(file_path, my_drive_path)
                file_url = f"/files/my-drive/{relative_path_from_mydrive.replace(os.sep, '/')}"
                
                print("file_url", file_url)
                
                # Create File document in Frappe
                file_doc = frappe.get_doc({
                    "doctype": "File",
                    "file_name": filename,
                    "file_url": file_url,
                    "folder": target_folder,
                    "is_private": 0,
                })
                file_doc.insert(ignore_permissions=True)
                frappe.log_error(f"File saved successfully: {file_doc.name}")
                
                # Create your custom Drive document if needed
                try:
                    drive_doc = frappe.get_doc({
                        "doctype": "Drive Manager",  # Replace with your actual doctype
                        "file_name": filename,
                        "attached_to_name": file_doc.name,
                        "file_url": file_url,
                        "folder": target_folder,
                        "created_by": frappe.session.user,
                    })
                    drive_doc.insert(ignore_permissions=True)
                    drive_id = drive_doc.name
                    frappe.log_error(f"Drive document created: {drive_id}")
                except Exception as drive_error:
                    # If Drive doctype doesn't exist or fails, just use the File document
                    frappe.log_error(f"Drive document creation failed: {str(drive_error)}")
                    drive_id = "Not Created"
                
                uploaded_files.append({
                    "file_id": file_doc.name,
                    "drive_id": drive_id,
                    "file_name": filename,
                    "file_url": file_url,
                    "folder": target_folder,
                    "relative_path": relative_path,
                    "physical_path": file_path
                })
                
            except Exception as file_error:
                frappe.log_error(f"Error uploading file {uploaded_file.filename}: {str(file_error)}")
                continue
        
        if uploaded_files:
            return {
                "success": True,
                "folder":target_folder,
                "uploaded_files":uploaded_files,
                "total_uploaded": len(uploaded_files)
            }
        else:
            return {"success": False, "message": "No files were uploaded successfully"}
            
    except Exception as e:
        frappe.log_error(f"Folder upload error: {str(e)}")
        return {"success": False, "message": f"Server error: {str(e)}"}
    

def create_folder_structure(folder_path, my_drive_path):
    """Create folder structure recursively - both in Frappe and physically"""
    print("inside create_folder_structure")
    print("folder_path", folder_path)  # Home/demo
    
    try:
        # Split the path and create folders step by step
        if not folder_path or folder_path == "/":
            return
            
        # Clean up the path
        folder_path = folder_path.strip('/')
        folders = folder_path.split('/')  # ["Home","demo"]
        current_path = ""
        current_physical_path = my_drive_path
        
        print("folder_path stripped:", folder_path)
        print("folders split:", folders)
        
        for folder_name in folders:
            if not folder_name:
                continue
            
            # Skip "Home" as it's the root folder that already exists
            if folder_name == "Home":
                continue

            # Build the path step by step
            parent_folder = current_path if current_path else "Home"
            current_path = f"{current_path}/{folder_name}" if current_path else folder_name
            
            # Build physical path
            current_physical_path = os.path.join(current_physical_path, folder_name)
            
            print("folder_name:", folder_name)
            print("parent_folder:", parent_folder)
            print("current_path:", current_path)
            print("current_physical_path:", current_physical_path)
            
            # Create physical directory if it doesn't exist
            if not os.path.exists(current_physical_path):
                os.makedirs(current_physical_path)
                print(f"Created physical directory: {current_physical_path}")
            else:
                print(f"Physical directory already exists: {current_physical_path}")
            
            # Check if File folder already exists
            existing_file_folder = frappe.db.get_value("File", {
                "file_name": folder_name,
                "is_folder": 1,
                "folder": parent_folder
            })
            
            print("existing_file_folder:", existing_file_folder)
            
            # Check if Drive Manager folder already exists
            existing_drive_folder = None
            if existing_file_folder:
                existing_drive_folder = frappe.db.get_value("Drive Manager", {
                    "attached_to_name": existing_file_folder,
                    "is_folder": 1,
                })
            
            print("existing_drive_folder:", existing_drive_folder)
            
            # Create File folder if it doesn't exist
            if not existing_file_folder:
                try:
                    print(f"Creating File folder: {folder_name} in {parent_folder}")
                    folder_doc = frappe.get_doc({
                        "doctype": "File",
                        "file_name": folder_name,
                        "is_folder": 1,
                        "folder": parent_folder
                    })
                    folder_doc.insert(ignore_permissions=True)
                    existing_file_folder = folder_doc.name
                    print(f"Created File folder: {folder_name} with ID: {existing_file_folder}")
                    
                except Exception as folder_error:
                    frappe.log_error(f"Error creating File folder {folder_name}: {str(folder_error)}")
                    raise folder_error
            
            # Create Drive Manager folder if it doesn't exist
            if not existing_drive_folder:
                try:
                    print(f"Creating Drive Manager folder: {folder_name}")
                    drive_folder_doc = frappe.get_doc({
                        "doctype": "Drive Manager",
                        "file_name": folder_name,
                        "attached_to_name": existing_file_folder,  # Link to File record
                        "is_folder": 1,
                        "folder": parent_folder,
                        "created_by": frappe.session.user
                    })
                    drive_folder_doc.insert(ignore_permissions=True)
                    print(f"Created Drive Manager folder: {folder_name} linked to {existing_file_folder}")
                    
                except Exception as drive_error:
                    frappe.log_error(f"Error creating Drive Manager folder {folder_name}: {str(drive_error)}")
                    raise drive_error
            else:
                print(f"Both File and Drive Manager folders already exist for: {folder_name}")
                
    except Exception as e:
        frappe.log_error(f"Error in create_folder_structure for path {folder_path}: {str(e)}")
        raise e


def get_physical_folder_path(folder_path, my_drive_path):
    """Convert logical folder path to physical file system path"""
    # folder_path example: "Home/demo/subfolder"
    # my_drive_path example: "/path/to/site/public/files/my-drive"
    
    if not folder_path or folder_path == "Home":
        return my_drive_path
    
    # Remove "Home" from the beginning and clean up the path
    if folder_path.startswith("Home/"):
        relative_path = folder_path[5:]  # Remove "Home/"
    elif folder_path.startswith("Home"):
        relative_path = folder_path[4:].lstrip('/')  # Remove "Home" and any leading slashes
    else:
        relative_path = folder_path
    
    if not relative_path:
        return my_drive_path
    
    # Convert to physical path
    physical_path = os.path.join(my_drive_path, *relative_path.split('/'))
    
    print(f"Converted '{folder_path}' to physical path: '{physical_path}'")
    return physical_path

'''

@frappe.whitelist()
def get_only_folders(is_folder, owner):
    if is_folder:
        is_folder = 1
        query = """
            SELECT
                f.name as file_id,
                dm.name AS drive_id,
                dm.attached_to_name,
                dm.file_name AS filename,
                dm.created_by,
                dm.creation
            FROM
                `tabDrive Manager` AS dm
            INNER JOIN
                `tabFile` AS f ON dm.attached_to_name = f.name
            WHERE
                dm.is_folder = %s AND dm.created_by = %s
            ORDER BY
                dm.creation DESC
        """
        data = frappe.db.sql(query, (is_folder,owner), as_dict=True)
        # frappe.msgprint(str(data))
    return {"folders": data}




@frappe.whitelist()
def get_folder_contents(folder):
    parent_folder_permission = """
        SELECT
            dm.name AS drive_id,
            dm.attached_to_name,
            dm.created_by,
            fac.for_user,
            fac.read,
            fac.write,
            fac.delete_file,
            fac.download,
            fac.share
        FROM
            `tabDrive Manager` As dm
        INNER JOIN
            `tabFile Access Control` fac ON fac.parent = dm.name
        WHERE
            dm.attached_to_name = %s"""
    
    parent_permission = frappe.db.sql(parent_folder_permission, (folder), as_dict=True)

    query = """
        SELECT
            f.name AS file_id,
            f.file_name,
            f.file_url,
            f.folder,
            f.creation,
            f.is_folder,
            f.file_type,
            dm.name AS drive_id,
            dm.attached_to_name,
            dm.created_by,
            fac.for_user,
            fac.read,
            fac.write,
            fac.delete_file,
            fac.download,
            fac.share
        FROM
            `tabFile` f
        INNER JOIN
            `tabDrive Manager` dm ON f.name = dm.attached_to_name
        LEFT JOIN
            `tabFile Access Control` fac ON fac.parent = dm.name
        WHERE
            f.folder = %s
        ORDER BY
            f.creation DESC"""
    
    files = frappe.db.sql(query, (folder), as_dict=True)

    for item in files:
        # frappe.msgprint(str(item['file_id']))
        if isinstance(item['creation'], datetime):
            item['creation'] = item['creation'].strftime('%b %d, %Y, %I:%M %p')
        persons = get_tags(item['file_id'])
        if persons:
            item['persons'] = persons if persons else None
        else:
            item['persons'] = None


    return {"files": files, "parent_folder_permission":parent_permission}


@frappe.whitelist()
def share_files(share_files):
    if not share_files:
        frappe.msgprint(_("No files selected for sharing."))
        return
    files = frappe.parse_json(share_files)
    for file in files:
        file_id = file.get("file_id")
        drive_id = file.get("drive_id")
        child_data = file.get("child_data")
        shared_by = file.get("shared_by")
        filename = frappe.get_value("Drive Manager",drive_id,["file_name"])

        if not file_id or not drive_id or not child_data:
            continue

        doc = frappe.get_doc("Drive Manager", drive_id)
        for child in child_data:
            doc.append("user_permissions", child)
            # frappe.msgprint(str(child['for_user']))
            splted = child['for_user'].split("@")
            formatted = ' '.join(part.capitalize() for part in splted[0].split('.'))

            send_mail(
                recipients=[child['for_user']], 
                subject=f"File Shared to You - {drive_id}", 
                content=f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://datahub.powerteam.in/assets/your-logo.png" alt="PowerTeam Logo" style="max-width: 200px; height: auto;">
                    </div>
                    
                    <p>Dear {formatted},</p>
                    
                    <p>You have been granted access to the file <strong>{filename}</strong></p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://datahub.powerteam.in/app/my-drive" 
                        style="background-color: #007bff; color: white; padding: 12px 24px; 
                                text-decoration: none; border-radius: 5px; display: inline-block;">
                            🏠 Open My Drive
                        </a>
                    </div>
                    
                    <p>Thanks and Regards,<br>{shared_by}</p>
                </div>
                """, 
                reference_doctype='Drive Manager', 
                reference_name=drive_id
            )

        doc.flags.ignore_permissions = True
        doc.save()

        nwdoc = frappe.new_doc('Shared Files')
        nwdoc.drive_id = drive_id
        nwdoc.shared_by = shared_by
        members_list = [item['for_user'] for item in child_data]
        nwdoc.members = ', '.join(members_list)
        nwdoc.insert()
        return {"status": "success", "message": "Files shared successfully."}
    

# frappe.sendmail(
#     recipients = [self.recipient],

#     # sender = "sagar.patil@datamann.in",
#     # cc = 'sagarpatil.powerit@gmail.com',
#     subject = f"Items Issued to You - {self.name}",
#     content = f"Dear Sir,<br><br>   Please find below link for Item Received Link...  <a href='https://datahub.powerteam.in/app/allotable-item-stock-entry/{self.name}'>Please Click Here If You Receieved</a><br><br><br>Thanks and Regards<br>Admin",
#     reference_doctype = 'Allotable Item Stock Entry',
#     reference_name =self.name,
#     now = True
# )
# frappe.msgprint(f"Email sent to {self.recipient} successfully...")


def send_mail(recipients, subject, content, reference_doctype, reference_name):
    """
    Sends an email with the specified parameters.
    """
    frappe.sendmail(
        recipients=recipients,
        subject=subject,
        content=content,
        reference_doctype=reference_doctype,
        reference_name=reference_name,
        now=True
    )
    frappe.msgprint(f"Email sent to {', '.join(recipients)} successfully.")

@frappe.whitelist()
def get_shared_contents():
    """
        Fetches shared contents for the current user.
    """
    user = frappe.session.user
    query = """
        SELECT
            dm.name AS drive_id,
            dm.file_name AS display_name,
            dm.attached_to_name,
            dm.created_by,
            fac.for_user,
            fac.read,
            fac.write,
            fac.delete_file,
            fac.download,
            fac.share
        FROM
            `tabDrive Manager` AS dm
        INNER JOIN
            `tabFile Access Control` AS fac ON dm.name = fac.parent
        WHERE
            fac.for_user = %s OR dm.created_by = %s
        ORDER BY
            dm.creation DESC
    """
    data = frappe.db.sql(query, (user, user), as_dict=True)
    if not data:
        return {"shared_contents": []}
    
    return {"shared_contents": data}

@frappe.whitelist()
def get_shared_files(user):
    get_shared_list = frappe.get_all("Shared Files",fields = ["file_name","name","shared_by","members","size","drive_id","creation","file_id","is_folder"])

    shared_data = []

    for i in get_shared_list:
        # frappe.msgprint(str(i.members))
        doc = frappe.get_doc("Drive Manager",i.drive_id)

        file_type = i.file_name.split(".")[-1]

        i['file_type'] = file_type
        i['shared_by'] = frappe.get_value("User",{"email":i.shared_by},["full_name"],as_dict=True).full_name or i.shared_by

        # frappe.msgprint(str())

    
        only_members = i.members.split(', ')
        members_group = []
        for member in only_members:
            get_profile = frappe.get_value("User",{"email":member},["user_image","first_name","last_name","email"],as_dict=True) or {}
            members_group.append(get_profile)

        userpermissions = []

        for j in doc.user_permissions:
            if j.for_user == user:
                userpermissions.append({
                    "drive_id": doc.name,
                    "read": j.read,
                    "write": j.write,
                    "delete": 0,
                    "download": j.download,
                    "share": j.share,
                    "manage": j.manage,
                    "for_user": j.for_user,
                    "created_by": 0 

                })
                # frappe.msgprint(str(j.read))
                # userpermissions.append(j)

        # frappe.msgprint(str(userpermissions))
               
        if user in only_members:
            # frappe.msgprint(str(premis.user_permissions))
            # frappe.msgprint(str(frappe.get_value("File",i.file_id,["name","file_url"],as_dict=True) or {}))
            i['members_group'] = members_group
            i['size']= format_bytes(int(i.size)) if i.size else '0 B'
            i['creation'] = format_last_login(i.creation)
            i['user_permissions'] = userpermissions or []
            i["file_url"] = frappe.get_value("File",i.file_id,["name","file_url"],as_dict=True).file_url or {}

            # frappe.msgprint(str(i))
            shared_data.append(i)
    return shared_data
    # frappe.msgprint(str(get_shared_list))


def format_bytes(size):
    # 1 KB = 1024 bytes, 1 MB = 1024 KB
    size = int(size)
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0


from datetime import datetime, timedelta

def format_last_login(login_time):
    now = datetime.now()
    login_date = login_time.date()
    today = now.date()
    yesterday = today - timedelta(days=1)
    time_str = login_time.strftime("%-I:%M %p").lower()  # Use "%#I" on Windows
    if login_date == today:
        return f"Today at {time_str}"
    elif login_date == yesterday:
        return f"Yesterday at {time_str}"
    else:
        date_str = login_time.strftime("%b %d, %Y")
        return f"{date_str}, {time_str}"

# Example usage (direct datetime object)
# last_login = datetime.strptime("2025-06-10 09:55:41.269906", "%Y-%m-%d %H:%M:%S.%f")
# print(format_last_login(last_login))

@frappe.whitelist()
def delete_items(name):
    if not name:
        frappe.msgprint(_("No items selected for deletion."))
    file_record = frappe.get_value("Drive Manager", name, "attached_to_name")
    if file_record:
        frappe.db.delete("Drive Manager", name)
        frappe.db.delete("File", file_record)
        return {"status": "Success"}
    else:
        frappe.msgprint(str("File Already Deleted Not Found"))

@frappe.whitelist()
def delete_bulk_items(bulk_files):
    if not bulk_files:
        frappe.msgprint(_("No items selected for deletion."))

    bulk_data = json.loads(bulk_files)
    results = []

    for entry in bulk_data:
        file_id = entry.get("file_id")
        drive_id = entry.get("drive_id")
        status = "Failed"

        try:
            # Delete File
            if file_id and frappe.db.exists("File", file_id):
                frappe.delete_doc("File", file_id, force=True)
            # Delete Drive
            if drive_id and frappe.db.exists("Drive", drive_id):
                frappe.delete_doc("Drive Manager", drive_id, force=True)
            status = "Success"
        except Exception as e:
            frappe.log_error(frappe.get_traceback(), "delete_bulk_items error")
        # Append result for each item
        results.append({
            "drive_id": drive_id,
            "status": status
        })
    return results

    
   




'''@frappe.whitelist()
def upload_folder_to_my_drive():
    try:
        # Get form data
        base_folder = frappe.form_dict.get('base_folder', '') #Home
        total_files = int(frappe.form_dict.get('total_files', 0)) #3
        print(total_files,base_folder)
        
        frappe.log_error(f"Upload folder debug - Base folder: {base_folder}, Total files: {total_files}")
        
        if total_files == 0:
            return {"success": False, "message": f"No files to upload total files {total_files}"}
        
        uploaded_files = []
        created_folders = set()  # Track created folders to avoid duplicates
        
        # First, create all necessary folders
        for i in range(total_files):
            folder_path_key = f"folder_path_{i}"
            folder_path = frappe.form_dict.get(folder_path_key, '')
            
            if folder_path and folder_path not in created_folders:
                target_folder = f"{base_folder}/{folder_path}" if base_folder else folder_path
                print("creating new folder",target_folder)
                create_folder_structure(target_folder)
                created_folders.add(folder_path)
                print("created folders",created_folders)
        
        # Process each file
        for i in range(total_files):
            file_key = f"file_{i}"
            folder_path_key = f"folder_path_{i}"
            relative_path_key = f"relative_path_{i}"
            
            # Get file and path info
            uploaded_file = frappe.request.files.get(file_key)
            folder_path = frappe.form_dict.get(folder_path_key, '')
            relative_path = frappe.form_dict.get(relative_path_key, '')
            
            if not uploaded_file:
                frappe.log_error(f"No file found for key: {file_key}")
                continue
            
            # Determine the target folder
            if folder_path:
                target_folder = f"{base_folder}/{folder_path}" if base_folder else folder_path
            else:
                target_folder = base_folder
            
            frappe.log_error(f"Processing file: {uploaded_file.filename} to folder: {target_folder}")
            
            # Validate file type
            allowed_extensions = ['pdf', 'xls', 'xlsx', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'gif']
            file_extension = uploaded_file.filename.split('.')[-1].lower()
            
            if file_extension not in allowed_extensions:
                frappe.log_error(f"Invalid file type: {uploaded_file.filename}")
                continue
            try:
                # Read file content once
                file_content = uploaded_file.read()
                uploaded_file.seek(0)  # Reset file pointer
                
                # Save file using Frappe's file manager
                saved_file = save_file(
                    fname=uploaded_file.filename,
                    content=file_content,
                    dt=None,  # Don't attach to any document
                    dn=None,
                    folder=target_folder,
                    is_private=0
                )
                frappe.log_error(f"File saved successfully: {saved_file.name}")
                # Create your custom Drive document if needed
                # Adjust this based on your actual Drive doctype
                try:
                    drive_doc = frappe.get_doc({
                        "doctype": "Drive Manager",  # Replace with your actual doctype
                        "file_name": uploaded_file.filename,
                        "attached_to_name":saved_file.name,
                        "file_url": saved_file.file_url,
                        "folder": target_folder,
                        "file_size": len(file_content),
                        "created_by": frappe.session.user,
                    })
                    drive_doc.insert(ignore_permissions=True)
                    drive_id = drive_doc.name
                    frappe.log_error(f"Drive document created: {drive_id}")
                except Exception as drive_error:
                    # If Drive doctype doesn't exist or fails, just use the File document
                    frappe.log_error(f"Drive document creation failed: {str(drive_error)}")
                    drive_id = "Not Created"
                
                uploaded_files.append({
                    "file_id": saved_file.name,
                    "drive_id": drive_id,
                    "file_name": uploaded_file.filename,
                    "file_url": saved_file.file_url,
                    "folder": target_folder,
                    "relative_path": relative_path
                })
                
            except Exception as file_error:
                frappe.log_error(f"Error uploading file {uploaded_file.filename}: {str(file_error)}")
                continue
        
        if uploaded_files:
            return {
                "success": True,
                "folder":target_folder,
                "uploaded_files":uploaded_files,
                "total_uploaded": len(uploaded_files)
            }
        else:
            return {"success": False, "message": "No files were uploaded successfully"}
            
    except Exception as e:
        frappe.log_error(f"Folder upload error: {str(e)}")
        return {"success": False, "message": f"Server error: {str(e)}"}
    

def create_folder_structure(folder_path):
    """Create folder structure recursively"""
    print("inside create_folder_structure")
    print("folder_path", folder_path)  # Home/demo
    
    try:
        # Split the path and create folders step by step
        if not folder_path or folder_path == "/":
            return
            
        # Clean up the path
        folder_path = folder_path.strip('/')
        folders = folder_path.split('/')  # ["Home","demo"]
        current_path = ""
        
        print("folder_path stripped:", folder_path)
        print("folders split:", folders)
        
        for folder_name in folders:
            if not folder_name:
                continue
            
            # Skip "Home" as it's the root folder that already exists
            if folder_name == "Home":
                continue

            # Build the path step by step
            parent_folder = current_path if current_path else "Home"
            current_path = f"{current_path}/{folder_name}" if current_path else folder_name
            
            print("folder_name:", folder_name)
            print("parent_folder:", parent_folder)
            print("current_path:", current_path)
            
            # Check if File folder already exists
            existing_file_folder = frappe.db.get_value("File", {
                "file_name": folder_name,
                "is_folder": 1,
                "folder": parent_folder
            })
            
            print("existing_file_folder:", existing_file_folder)
            
            # Check if Drive Manager folder already exists
            existing_drive_folder = None
            if existing_file_folder:
                existing_drive_folder = frappe.db.get_value("Drive Manager", {
                    "attached_to_name": existing_file_folder,
                    "is_folder": 1,
                })
            
            print("existing_drive_folder:", existing_drive_folder)
            
            # Create File folder if it doesn't exist
            if not existing_file_folder:
                try:
                    print(f"Creating File folder: {folder_name} in {parent_folder}")
                    folder_doc = frappe.get_doc({
                        "doctype": "File",
                        "file_name": folder_name,
                        "is_folder": 1,
                        "folder": parent_folder
                    })
                    folder_doc.insert(ignore_permissions=True)
                    existing_file_folder = folder_doc.name
                    print(f"Created File folder: {folder_name} with ID: {existing_file_folder}")
                    
                except Exception as folder_error:
                    frappe.log_error(f"Error creating File folder {folder_name}: {str(folder_error)}")
                    raise folder_error
            
            # Create Drive Manager folder if it doesn't exist
            if not existing_drive_folder:
                try:
                    print(f"Creating Drive Manager folder: {folder_name}")
                    drive_folder_doc = frappe.get_doc({
                        "doctype": "Drive Manager",
                        "file_name": folder_name,
                        "attached_to_name": existing_file_folder,  # Link to File record
                        "is_folder": 1,
                        "folder": parent_folder,
                        "created_by": frappe.session.user
                    })
                    drive_folder_doc.insert(ignore_permissions=True)
                    print(f"Created Drive Manager folder: {folder_name} linked to {existing_file_folder}")
                    
                except Exception as drive_error:
                    frappe.log_error(f"Error creating Drive Manager folder {folder_name}: {str(drive_error)}")
                    raise drive_error
            else:
                print(f"Both File and Drive Manager folders already exist for: {folder_name}")
                
    except Exception as e:
        frappe.log_error(f"Error in create_folder_structure for path {folder_path}: {str(e)}")
        raise e


def create_folder_structure(folder_path):
    """Create folder structure recursively"""
    print("inside create_folder_structure")
    print("folder_path",folder_path) # Home/demo
    try:
        # Split the path and create folders step by step
        if not folder_path or folder_path == "/":
            return
        # Clean up the path
        folder_path = folder_path.strip('/')
        folders = folder_path.split('/')  #["Home","demo"]
        current_path = ""
        print("folder_path striped :",folder_path)
        print("folders splited :",folders)
        for folder_name in folders:
            if not folder_name:
                continue

            if folder_name == "Home":
                parent_folder = folder_name




            # Build the path step by step
            # parent_folder = current_path if current_path else "Home"
            print("parent_folder",parent_folder)
            current_path = f"{current_path}/{folder_name}" if current_path else folder_name
            print("current_path",current_path)
            
            # Check if folder already exists
            existing_file_folder = frappe.db.get_value("File", {
                "file_name": folder_name,
                "is_folder": 1,
                "folder": parent_folder
            })

            print("existing_folder",existing_file_folder)

            existing_drive_folder = frappe.db.get_value("Drive Manager", {
                "attached_to_name": folder_path,
                "is_folder": 1,
            })

            print("existing_drive_folder",existing_drive_folder)


            if not existing_file_folder:
                try:
                    # Create the folder
                    folder_doc = frappe.get_doc({
                        "doctype": "File",
                        "file_name": folder_name,
                        "is_folder": 1,
                        "folder": parent_folder
                    })
                    folder_doc.insert(ignore_permissions=True)
                    
                    frappe.log_error(f"Created folder: {folder_name} in {parent_folder}")
                except Exception as folder_error:
                    frappe.log_error(f"Error creating folder {folder_name}: {str(folder_error)}")
                    raise folder_error
                
            elif not existing_drive_folder:
                try:
                    # create drive folder
                    drive_folder_doc = frappe.get_doc({
                        "doctype": "Drive Manager",
                        "file_name": folder_name,
                        "attached_to_name":existing_file_folder,
                        "is_folder": 1,
                        "folder": parent_folder,
                        "created_by":frappe.session.user
                    })
                    drive_folder_doc.insert(ignore_permissions=True)
                    frappe.log_error(f"Created drive folder: {folder_name} in {parent_folder}")
                except Exception as folder_error:
                    frappe.log_error(f"Error creating drive folder {folder_name}: {str(folder_error)}")
                    raise folder_error
            else:
                try:
                    # Create the both folder
                    folder_doc = frappe.get_doc({
                        "doctype": "File",
                        "file_name": folder_name,
                        "is_folder": 1,
                        "folder": parent_folder
                    })
                    folder_doc.insert(ignore_permissions=True)
                    drive_folder_doc = frappe.get_doc({
                        "doctype": "Drive Manager",
                        "file_name": folder_name,
                        "attached_to_name":folder_doc.name,
                        "is_folder": 1,
                        "folder": parent_folder,
                        "created_by":frappe.session.user
                    })
                    drive_folder_doc.insert(ignore_permissions=True)
                    print("created both folders")
                    frappe.log_error(f"Created folder: {folder_name} in {parent_folder}")
                except Exception as folder_error:
                    frappe.log_error(f"Error creating folder {folder_name}: {str(folder_error)}")
                    raise folder_error
    except Exception as e:
        frappe.log_error(f"Error in create_folder_structure for path {folder_path}: {str(e)}")
        raise e



@frappe.whitelist()
def create_drive_files(folder,filename,attached_to_name):
    f = frappe.get_doc(
        {
            "doctype": "Drive Manager",
            "file_name": filename,
            "created_by": frappe.session.user,
            "folder": folder,
			"attached_to_name":attached_to_name
        }
    )
    f.flags.ignore_permissions = True
    f.insert()
    return f

@frappe.whitelist()
def get_folder_contents(folder_name,owner):
    # frappe.msgprint(str(folder_name))
    files = frappe.get_all("File",filters={"folder": folder_name},fields=["name", "file_name", "file_url", "is_folder", "creation"])
    return {"files": files}'''