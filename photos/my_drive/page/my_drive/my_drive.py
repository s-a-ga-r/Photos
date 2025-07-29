import frappe
import json
from frappe import _
from datetime import datetime,timedelta

@frappe.whitelist()
def render_template_context(owner,folder):
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


def get_tags(file_id):
    """
        Fetches tags for a given file_id.
    """
    # frappe.msgprint(str(file_id))
    if frappe.db.exists("Photo", {"photo": file_id}):
        docname = frappe.get_value("Photo",{"photo":file_id},"name")
        doc = frappe.get_doc('Photo',docname)
        persons = []
        for i in doc.people:
            person = frappe.get_value("ROI",{"name":i.face},"person")
            person_name = frappe.get_value("Person",{"name":person},"person_name")
            if person_name:
                persons.append(person_name)

        # frappe.msgprint(str(persons))

        return persons

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




import os
from frappe.utils.file_manager import save_file
from frappe.utils import get_site_path
@frappe.whitelist()
def upload_file_to_my_drive():
    """Custom file upload handler that saves files to My Drive folder"""
    try:
        # Get the uploaded file
        file = frappe.request.files.get('file')
        if not file:
            frappe.throw("No file uploaded")
        # Get folder parameter
        folder = frappe.form_dict.get('folder', 'My Drive')
        
        # Create My Drive directory if it doesn't exist
        site_path = get_site_path()
        my_drive_path = os.path.join(site_path, 'public', 'files', 'my-drive')
        
        if not os.path.exists(my_drive_path):
            os.makedirs(my_drive_path)
        
        # Generate unique filename to avoid conflicts
        filename = file.filename
        file_path = os.path.join(my_drive_path, filename)
        
        # Handle duplicate filenames
        counter = 1
        original_filename = filename
        while os.path.exists(file_path):
            name, ext = os.path.splitext(original_filename)
            filename = f"{name}_{counter}{ext}"
            file_path = os.path.join(my_drive_path, filename)
            counter += 1
        
        # Save the file physically
        file.save(file_path)
        
        # Create File document in Frappe
        file_url = f"/files/my-drive/{filename}"
        
        file_doc = frappe.get_doc({
            "doctype": "File",
            "file_name": filename,
            "file_url": file_url,
            "folder": folder,
            "is_private": 0,  # Make it public so it can be accessed via URL
        })
        file_doc.insert()

        dm = frappe.get_doc(
            {
                "doctype": "Drive Manager",
                "file_name": filename,
                "created_by": frappe.session.user,
                "folder": folder,
                "attached_to_name":file_doc.name
            }
        )

        dm.flags.ignore_permissions = True
        dm.insert()
        
        return {
            "file_url": file_url,
            "file_name": filename,
            "file_type": file.content_type,
            "file_id": file_doc.name,
            "drive_id":dm.name
        }
    
        
    except Exception as e:
        frappe.log_error(f"File upload error: {str(e)}")
        frappe.throw(f"Error uploading file: {str(e)}")




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

# @frappe.whitelist()
# def get_folder_contents(folder_name,owner):
#     # frappe.msgprint(str(folder_name))
#     files = frappe.get_all("File",filters={"folder": folder_name},fields=["name", "file_name", "file_url", "is_folder", "creation"])
#     return {"files": files}

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
def get_folder_contents(folder_name,owner):
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
    
    parent_permission = frappe.db.sql(parent_folder_permission, (folder_name), as_dict=True)

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
    
    files = frappe.db.sql(query, (folder_name), as_dict=True)

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
def share_files(file_permissions):
    if not file_permissions:
        frappe.msgprint(_("No files selected for sharing."))
        return
    file_permissions = frappe.parse_json(file_permissions)
    for file_permission in file_permissions:
        file_id = file_permission.get("file")
        docname = file_permission.get("docname")
        child_data = file_permission.get("child_data")
        shared_by = file_permission.get("shared_by")
        filename = frappe.get_value("Drive Manager",docname,["file_name"])

        if not file_id or not docname or not child_data:
            continue

        # frappe.msgprint(str(child_data))

        doc = frappe.get_doc("Drive Manager", docname)
        for child in child_data:
            doc.append("user_permissions", child)
            # frappe.msgprint(str(child['for_user']))
            splted = child['for_user'].split("@")
            formatted = ' '.join(part.capitalize() for part in splted[0].split('.'))

            send_mail(
                recipients=[child['for_user']], 
                subject=f"File Shared to You - {docname}", 
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
                reference_name=docname
            )


        doc.flags.ignore_permissions = True
        doc.save()

        nwdoc = frappe.new_doc('Shared Files')
        nwdoc.drive_id = docname
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

        # if user in i.members:
        #     frappe.msgprint(str(i.drive_manager))
          


    # members_only = get_shared_list['members']



    # frappe.msgprint(str(user))





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
    # frappe.msgprint(str(bulk_files))
    bulk = json.loads(bulk_files)
    for i in bulk:
        try:
            drive_id_exists = frappe.db.exists("Drive Manager",i['drive_id'])
            file_id_exists = frappe.db.exists("File",i['file_id'])
            if drive_id_exists and file_id_exists:
                frappe.db.delete("Drive Manager", i['drive_id'])
                frappe.db.delete("File", i['file_id'])
                return {"status": "Success","drive_id":i['drive_id']}
            frappe.log_error(f"Document not found: Drive ID {i['drive_id']} or File ID {i['file_id']}")
        except Exception as e:
            frappe.log_error(f"Error deleting {i['drive_id']}: {str(e)}")
        


        # frappe.msgprint(str(i['drive_id']))
        # frappe.msgprint(str(i['file_id']))
        # frappe.db.delete("Drive Manager", name)
        # frappe.db.delete("File", file_record)
        # return {"status": "Success"}
        # frappe.msgprint(str(i))


    # return
    # file_record = frappe.get_value("Drive Manager", name, "attached_to_name")
    # if file_record:
    #     frappe.db.delete("Drive Manager", name)
    #     frappe.db.delete("File", file_record)
    #     return {"status": "Success"}
    # else:
    #     frappe.msgprint(str("File Already Deleted Not Found"))


# @frappe.whitelist()
# def delete_items(doctype,name):
# 	frappe.msgprint(str(name))
# 	drive_record = frappe.get_value("Drive Manager", {"attached_to_name": name}, "name") 
# 	if drive_record:
# 		frappe.delete_doc("Drive Manager", drive_record)

# 	items = [name]
# 	if len(items) > 10:
# 		frappe.enqueue("frappe.desk.reportview.delete_bulk", doctype="File", items=items)
# 	else:
# 		delete_bulk(doctype,items)


# def delete_bulk(doctype, items):
# 	undeleted_items = []
# 	for i, d in enumerate(items):
# 		try:
# 			frappe.delete_doc(doctype, d)
			
# 			if len(items) >= 5:
# 				frappe.publish_realtime(
# 					"progress",
# 					dict(
# 						progress=[i + 1, len(items)], title=_("Deleting {0}").format(doctype), description=d
# 					),
# 					user=frappe.session.user,
# 				)
# 			# Commit after successful deletion
# 			frappe.db.commit()
# 		except Exception:
# 			# rollback if any record failed to delete
# 			# if not rollbacked, queries get committed on after_request method in app.py
# 			undeleted_items.append(d)
# 			frappe.db.rollback()
# 	if undeleted_items and len(items) != len(undeleted_items):
# 		frappe.clear_messages()
# 		delete_bulk(doctype, undeleted_items)
# 	elif undeleted_items:
# 		frappe.msgprint(
# 			_("Failed to delete {0} documents: {1}").format(len(undeleted_items), ", ".join(undeleted_items)),
# 			realtime=True,
# 			title=_("Bulk Operation Failed"),
# 		)
# 	else:
# 		frappe.msgprint(_("Deleted all documents successfully"), realtime=True, title=_("Bulk Operation Successful"))

