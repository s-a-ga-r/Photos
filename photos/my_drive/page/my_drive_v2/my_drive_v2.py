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
def render_template(owner,folder,limit_start,limit_page_length):    
    drive_access = frappe.get_value("Drive Access", {"user": owner},["view_only", "upload_only","all"], as_dict=True) or {}
    if not drive_access and frappe.session.user != "Administrator" :
        frappe.throw(_("You do not have access to this drive. Please contact your administrator."))
        return
    if frappe.session.user == "Administrator":
        user_details = {'employee_name':"Administrator","designation":"Administrator","standard_img":"A"}
        last_login = frappe.get_value("User",{"first_name":owner},['last_active'],as_dict = True) or {}
        last_active = last_login.get('last_active', None)
        updated_user_login=format_last_login(last_active)
        user_details['last_login'] = updated_user_login
    else:
        # user_details = frappe.get_value("Employee",{"prefered_email":owner},['employee_name','designation'],as_dict = True) or {}

        if frappe.db.exists("DocType", "Employee"):
            user_details = frappe.get_value(
                "Employee",
                {"prefered_email": owner},
                ["employee_name", "designation"],
                as_dict=True
            ) or {}
        else:
            user_details = {}

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
        f.file_url,
        0 AS shared
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
    
   
    # frappe.msgprint(str(data))

    query2 = """
        select
            fac.for_user,
            fac.read,
            fac.write,
            fac.upload,
            fac.delete_file,
            fac.download,
            fac.share,
            fac.seen,
            dm.name as drive_id,
            dm.file_name as filename,
            dm.created_by,
            f.name as file_id,
            f.folder,
            f.file_type,
            f.creation,
            f.is_folder,
            f.file_url,
            1 AS shared
        from
            `tabFile Access Control` as fac
        inner join
            `tabDrive Manager` as dm on fac.parent = dm.name
        left join
            `tabFile` as f on dm.attached_to_name = f.name
        where
            fac.for_user = %s and f.folder = %s
        """
    data = frappe.db.sql(query,(owner,folder), as_dict=True)
    data2 = frappe.db.sql(query2,(owner, folder), as_dict=True)

    # frappe.msgprint(str(data2))

    combined_data = data + data2

    result = combined_data[int(limit_start):int(limit_page_length)]


    audt_log = {
        "opration":"View",
        "session_user": frappe.session.user,
    }
    audit_log= make_audit_dict(audt_log)

    create_audit_log(audit_log)

    
    for item in result:
        persons = get_tags(item['file_id'])
        if persons:
            item['persons'] = persons if persons else None
        if isinstance(item['creation'], datetime):
            item['creation'] = item['creation'].strftime('%b %d, %Y, %I:%M %p')

    
    
    return {
        "user_details":user_details,
        "files": result,
        "drive_access": drive_access,
        "total_notification": frappe.db.count("File Access Control", filters={"for_user":owner,"seen":0}, debug=True)
    }

@frappe.whitelist()
def share(share_files):
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

            existing_row = next(
                (row for row in doc.user_permissions if row.for_user == child["for_user"]),
                None
            )

            if existing_row:
                # 🔄 Update existing fields
                for key, value in child.items():
                    setattr(existing_row, key, value)
            else:
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
                            <a href="https://datahub.powerteam.in/app/my-drive-v2" 
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
def get_media_files(owner,folder,limit_start, limit_page_length):

    if folder == "Media":
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
        
        # data = frappe.db.sql(query,(owner,int(limit_page_length), int(limit_start)), as_dict=True)

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
        # data2 = frappe.db.sql(query2,(owner,int(limit_page_length),int(limit_start)), as_dict=True)
        data = frappe.db.sql(query,(owner), as_dict=True)
        data2 = frappe.db.sql(query2,(owner), as_dict=True)


        combined_data = data + data2

        data = combined_data[int(limit_start):int(limit_page_length)]


        for item in data:
            if isinstance(item['creation'], datetime):
                item['creation'] = item['creation'].strftime('%b %d, %Y, %I:%M %p')

        # frappe.msgprint(str(data))
        return {"files": data}
    
    elif folder == "Folders":
        get_folders(owner,limit_start,limit_page_length)
        # pass
    elif folder == "Shared":
        get_shared_files(owner,limit_start,limit_page_length)
        # pass
    elif folder == "Documents":
        get_documents_files(owner,limit_start,limit_page_length)
        # frappe.msgprint(str("its is Documents"))
    elif folder == "Notifications":
        get_shared_files(owner,limit_start,limit_page_length)
    else:
        render_template(owner,"Home",limit_start,limit_page_length)


@frappe.whitelist()
def get_folders(owner,limit_start,limit_page_length):
    query = """
        SELECT
            f.name as file_id,
            dm.name AS drive_id,
            dm.attached_to_name,
            dm.file_name AS filename,
            dm.created_by,
            dm.creation,
            0 as shared
        FROM
            `tabDrive Manager` AS dm
        INNER JOIN
            `tabFile` AS f ON dm.attached_to_name = f.name
        WHERE
            dm.is_folder = %s AND dm.created_by = %s
        ORDER BY
            dm.creation DESC
    """

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
            f.file_url,
            1 AS shared
        FROM
            `tabFile Access Control` as fac
        INNER JOIN
            `tabDrive Manager` as dm on fac.parent = dm.name
        LEFT JOIN
            `tabFile` as f on dm.attached_to_name = f.name
        WHERE
            dm.is_folder = %s AND fac.for_user = %s
    """


    data = frappe.db.sql(query, (1,owner), as_dict=True)
    data2 = frappe.db.sql(query2, (1,owner), as_dict=True)
    # frappe.msgprint(str(data2))
    

    # return
    combined_data = data + data2

    result = combined_data[int(limit_start):int(limit_page_length)]

    return {"folders": result}



@frappe.whitelist()
def get_documents_files(owner,limit_start,limit_page_length):
    
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
    data = frappe.db.sql(query,(owner), as_dict=True)
    data2 = frappe.db.sql(query2,(owner), as_dict=True)


    combined_data = data + data2

    data = combined_data[int(limit_start):int(limit_page_length)]
    
   
    for item in data:
        if isinstance(item['creation'], datetime):
            item['creation'] = item['creation'].strftime('%b %d, %Y, %I:%M %p')

    # frappe.msgprint(str(data))
    
    return {
        "files": data,
    }



@frappe.whitelist()
def get_folder_contents(folder,drive_id,shared,limit_start=0, limit_page_length=20):    
   
    query="""
        SELECT
            dm.name as drive_id,
            dm.file_name AS file_name,
            dm.attached_to_name,
            dm.created_by,
            f.name as file_id,
            f.folder,
            f.file_type,
            f.creation,
            f.is_folder,
            f.file_url,
            0 AS shared
        FROM
            `tabDrive Manager` AS dm
        INNER JOIN
            `tabFile` AS f ON f.name = dm.attached_to_name
        WHERE
            dm.created_by = %s AND dm.folder = %s
        ORDER BY
            f.creation DESC
    """

    query2 = """
        select
            fac.for_user,
            fac.read,
            fac.write,
            fac.delete_file,
            fac.download,
            fac.share,
            dm.name as drive_id,
            dm.file_name as file_name,
            dm.created_by,
            f.name as file_id,
            f.folder,
            f.file_type,
            f.creation,
            f.is_folder,
            f.file_url,
            1 AS shared
        FROM
            `tabFile Access Control` as fac
        INNER JOIN
            `tabDrive Manager` as dm on fac.parent = dm.name
        LEFT JOIN
            `tabFile` as f on dm.attached_to_name = f.name
        WHERE
            fac.for_user = %s AND f.folder = %s 

    """
   
    query3 = """
        SELECT
            dm.name AS drive_id,
            dm.attached_to_name AS file_id,
            dm.file_name AS file_name,
            dm.created_by,
            dm.creation,
            dm.is_folder,
            f.file_url,
            f.file_type,
            1 AS can_read,
            1 AS can_write
        FROM  
            `tabDrive Manager` AS dm
        LEFT JOIN
            `tabFile` AS f ON f.name = dm.attached_to_name
        WHERE
            dm.folder = %s
        ORDER BY
            dm.creation DESC
    """

    query4 = """
        SELECT
            dm.name AS drive_id,
            dm.attached_to_name AS file_id,
            dm.file_name AS file_name,
            dm.created_by,
            dm.creation,
            dm.is_folder,
            f.file_url,
            f.file_type,
            1 AS can_read,
            1 AS can_write
        FROM  
            `tabDrive Manager` AS dm
        LEFT JOIN
            `tabFile` AS f ON f.name = dm.attached_to_name
        WHERE
            dm.folder = %s AND dm.created_by != %s
        ORDER BY
            dm.creation DESC
    """
    # folders_data = frappe.db.sql(query3, (attached_to_name,), as_dict=True)


    data = frappe.db.sql(query,(frappe.session.user,folder), as_dict=True)  # created_by session User

    data2 = frappe.db.sql(query2,(frappe.session.user,folder), as_dict=True)

    combined_data = data + data2



    upload_only = frappe.db.get_value("File Access Control", {'parent':drive_id,'for_user':frappe.session.user},"upload") or 0

    drive = frappe.get_doc("Drive Manager",drive_id)


    if frappe.db.exists("Drive Manager",{'name':drive_id,'created_by':frappe.session.user}):
        attached_name = drive.attached_to_name

        folders_data = frappe.db.sql(query4,(attached_name,frappe.session.user), as_dict=True)

        for row in folders_data:
            row["read"] = row.pop("can_read")
            row["write"] = row.pop("can_write")
            # row["file_url"] = frappe.get_value("File",{"folder":attached_to_name},"file_url")
       
        combined_data += folders_data
        

    if int(shared) and upload_only == 0:
       

        # frappe.msgprint(str("hello"))
    
        attached_name = drive.attached_to_name
        
        '''in this condition if from notification open-folder or only file get location in
            In this below query missing field name File_url so need to solve that
            this query if only upload then should not let return inside folder data
        '''
        folders_data = frappe.db.sql(query3,(attached_name), as_dict=True)
        # frappe.msgprint(str(folders_data))

        for row in folders_data:
            row["read"] = row.pop("can_read")
            row["write"] = row.pop("can_write")
            # row["file_url"] = frappe.get_value("File",{"folder":attached_to_name},"file_url")
       
        combined_data += folders_data
    

    result = combined_data[int(limit_start):int(limit_page_length)]

   
    
    for item in result:
        # frappe.msgprint(str(item['file_id']))
        if isinstance(item['creation'], datetime):
            item['creation'] = item['creation'].strftime('%b %d, %Y, %I:%M %p')
        persons = get_tags(item['file_id'])
        if persons:
            item['persons'] = persons if persons else None
        else:
            item['persons'] = None


    return {"files": result,"upload_only": 1}



    # folders_data = frappe.get_list("Drive Manager", filters = {"folder": drive.attached_to_name},fields = ["file_name","attached_to_name,created_by","folder"],order_by="creation desc")



'''@frappe.whitelist()
def get_shared_files(user,limit_start,limit_page_length):
    get_shared_list = frappe.get_all(
        "Shared Files",
        fields = ["file_name","name","shared_by","members","size","drive_id","creation","file_id","is_folder"],
        limit_start=limit_start,
        limit_page_length=limit_page_length
    )

    shared_data = []

    # notseen = frappe.db.count("Shared Files", filters={"seen":0}, debug=True)

    
    for i in get_shared_list:
        # frappe.msgprint(str(i.members))
        doc = frappe.get_doc("Drive Manager",i.drive_id)

        file_type = i.file_name.split(".")[-1]

        i["is_folder"] = doc.is_folder,
        i['file_type'] = file_type
        i['shared_by'] = frappe.get_value("User",{"email":i.shared_by},["full_name"],as_dict=True).full_name or i.shared_by
    
        only_members = i.members.split(', ')
        members_group = []
        for member in only_members:
            get_profile = frappe.get_value("User",{"email":member},["user_image","first_name","last_name","email"],as_dict=True) or {}
            members_group.append(get_profile)

        userpermissions = []

        seen = None

        for j in doc.user_permissions:
            if j.for_user == user:
                seen =  j.seen
                userpermissions.append({
                    "drive_id": doc.name,
                    "file_id": doc.attached_to_name,
                    "read": j.read,
                    "write": j.write,
                    "delete": j.delete_file,
                    "share": j.share,
                    "download": j.download,
                    "manage": j.manage,
                    "for_user": j.for_user,
                    "created_by": doc.created_by
                })
                # frappe.msgprint(str(j.read))
                # userpermissions.append(j)

        # frappe.msgprint(str(userpermissions))
               
        if user in only_members:
            # frappe.msgprint(str(premis.user_permissions))
            # frappe.msgprint(str(frappe.get_value("File",i.file_id,["name","file_url"],as_dict=True) or {}))
            
            i['seen'] = seen
            i['members_group'] = members_group
            i['size']= format_bytes(int(i.size)) if i.size else '0 B'
            i['creation'] = format_last_login(i.creation)
            i['user_permissions'] = userpermissions or []
            i["file_url"] = frappe.get_value("File",i.file_id,["name","file_url"],as_dict=True).file_url or {}


            # frappe.msgprint(str(i))
            shared_data.append(i)

    # frappe.msgprint(str(shared_data))
    
    return shared_data
'''

@frappe.whitelist()
def get_shared_files(user, limit_start=0, limit_page_length=20):

    shared_list = frappe.get_all(
        "Shared Files",
        fields=["file_name","name","shared_by","members","size","drive_id","creation","file_id","is_folder"],
        limit_start=limit_start,
        limit_page_length=limit_page_length
    )

    shared_data = []

    for i in shared_list:

        doc = frappe.get_doc("Drive Manager", i.drive_id)

        # ---- FIX 1: is_folder boolean ----
        i["is_folder"] = doc.is_folder
        # ---- FIX 2: file type ----
        if not doc.is_folder and "." in i.file_name:
            i['file_type'] = i.file_name.split(".")[-1]
        else:
            i['file_type'] = "Folder"

        # ---- FIX 3: shared_by full name ----
        full_name = frappe.get_value("User", {"email": i.shared_by}, "full_name")
        i['shared_by'] = full_name or i.shared_by

        # ---- Members ----
        members_list = i.members.split(', ')
        members_group = []
        for member in members_list:
            profile = frappe.get_value(
                "User",
                {"email": member},
                ["user_image", "first_name", "last_name", "email"],
                as_dict=True
            ) or {}
            members_group.append(profile)

        # ---- Permissions ----
        user_permissions = []
        seen = 0  # default

        shared = 1

        for row in doc.user_permissions:
            if row.for_user == user:
                seen = row.seen
                i["shared"] = shared
                # user_permissions.append({
                #     "drive_id": doc.name,
                #     "file_id": doc.attached_to_name,
                #     "read": row.read,
                #     "write": row.write,
                #     "delete": row.delete_file,
                #     "share": row.share,
                #     "download": row.download,
                #     "manage": row.manage,
                #     "for_user": row.for_user,
                #     "created_by": doc.created_by
                # })

                i["read"]= row.read
                i["write"]= row.write
                i["delete"]= row.delete_file
                i["share"]= row.share
                i["download"]= row.download
                i["manage"]= row.manage
                i["for_user"]= row.for_user
                i["created_by"]= doc.created_by
                i["created_by"]= doc.created_by

        # ---- Only send files where user is member ----
        if user in members_list:
            i['seen'] = seen
            i['members_group'] = members_group
            i['size'] = format_bytes(int(i.size)) if i.size else '0 B'
            i['creation'] = format_last_login(i.creation)
            # i['user_permissions'] = user_permissions

            # ---- FIX 4: file_url safe access ----
            file_url = frappe.get_value("File", i.file_id, "file_url")
            i["file_url"] = file_url or ""

            shared_data.append(i)

    return shared_data


@frappe.whitelist()
def get_notification(file_id=None, drive_id=None):
    if not file_id or not drive_id:
        return {}

    file = frappe.get_doc("File", file_id)
    drive = frappe.get_doc("Drive Manager", drive_id)

    # for_user,seen = frappe.db.get_value("File Access Control", {"parent": drive_id},["for_user", "seen"])

    # frappe.msgprint(str(seen))
    

    # return {"seen":seen}

    notify_details = {}

    notify_details["file_name"] =file.file_name,
    notify_details["drive_id"] =drive_id,
    notify_details["file_type"] = file.file_type,
    notify_details["file_size"] = format_bytes(drive.size),
    notify_details["file_url"] = file.file_url,
    notify_details["shared_by"] = drive.created_by,
    notify_details["creation"] = format_last_login(drive.creation),
    notify_details["folder"] = drive.folder
    notify_details["is_folder"]=drive.is_folder
    notify_details["shared"]=0

    for user in drive.user_permissions:
        if user.for_user == frappe.session.user and not user.seen:
            user.seen = 1
            drive.save()
            # frappe.db.set_value("File Access Control", {"parent": drive_id}, 'seen', 1)
            notify_details["seen"] = 1



    # shared_with = frappe.get_all(
    #     "File Access Control",
    #     filters={"parent": drive_id},
    #     fields=["for_user", "read", "write", "delete_file", "upload","download","share"]
    # )

    # frappe.msgprint(str(notify_details))

    return notify_details


@frappe.whitelist()
@frappe.read_only()
def search(owner,folder,keys=None):

	if not keys:
		return []

	query="""SELECT
		dm.name as drive_id,
		dm.file_name AS filename,
		dm.created_by,
		f.name as file_id,
		f.file_name,
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
		dm.created_by = %s
        AND  f.folder = %s
		AND f.file_name LIKE %s
	ORDER BY
		f.creation DESC
	"""
	# query="""SELECT

	data = frappe.db.sql(query, (owner,folder,"%" + (keys or "") + "%"), as_dict=True)
	# frappe.msgprint(str(data))

	# if someone shared file's
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
		
		where fac.for_user = %s and f.folder = %s and f.file_name LIKE %s
		"""
	# fac.for_user = %s AND f.file_type IN ('JPG', 'JPEG', 'MP3', 'MP4', 'PNG')
	data2 = frappe.db.sql(query2,(owner,folder,"%" + keys + "%",), as_dict=True)

	for item in data2:
		data.append(item)
	# frappe.msgprint(str(data2))

	for item in data:
		if isinstance(item['creation'], datetime):
			item['creation'] = item['creation'].strftime('%b %d, %Y, %I:%M %p')

	# frappe.msgprint(str(data))
     
	return data

	return {
		"files": data,
	}


@frappe.whitelist()
def get_all_files(owner,folder,limit_start=0, limit_page_length=20):

    query="""SELECT
        dm.name as drive_id,
        dm.file_name,
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
    LIMIT %s OFFSET %s
    """
    # query="""SELECT
    
    data = frappe.db.sql(query,(owner,folder,int(limit_page_length), int(limit_start)), as_dict=True)
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
            dm.file_name,
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
        LIMIT %s OFFSET %s
        """
    data2 = frappe.db.sql(query2,(owner,folder,int(limit_page_length), int(limit_start)), as_dict=True)

    for item in data2:
        data.append(item)
    # frappe.msgprint(str(data2))


    for item in data:
        persons = get_tags(item['file_id'])

        if persons:
            item['persons'] = persons if persons else None
        if isinstance(item['creation'], datetime):
            item['creation'] = item['creation'].strftime('%b %d, %Y, %I:%M %p')
    # frappe.msgprint(str(data))
    return data




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

@frappe.whitelist()
def get_person(file_id):
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
    




@frappe.whitelist()
def add_tags(file_id,tag):
    # frappe.msgprint(str(file_id))

    person = frappe.get_doc({
        "doctype": "Person",
        "person_name": tag,
        # "person_image": create profile_pc,
        # "user": user ?,
    })

    person.flags.ignore_permissions = True
    person.insert()
    docname = frappe.get_value("Photo",{"photo":file_id},"name")
    doc = frappe.get_doc('Photo',docname)
    if doc:
        for i in doc.people:
            # frappe.msgprint(str(i.face))
            # person = frappe.set_value("ROI",{"name":i.face},person.name)
            frappe.db.set_value("ROI", {"name": i.face}, 'person',person.name)

    return {"status":"Success"}


@frappe.whitelist()
def remove_tag(file_id,tag):
    person = frappe.get_value("ROI",{"image":file_id},"person")
    frappe.db.set_value("ROI", {"name": file_id}, 'person',None)
    if person:
        frappe.db.delete("Person",person)

    return {"status":"Success"}
    




# @frappe.whitelist()
# def get_shared_files(user):
#     get_shared_list = frappe.get_all("Shared Files",fields = ["file_name","name","shared_by","members","size","drive_id","creation","file_id","is_folder"])

#     shared_data = []

#     for i in get_shared_list:
#         # frappe.msgprint(str(i.members))
#         doc = frappe.get_doc("Drive Manager",i.drive_id)

#         file_type = i.file_name.split(".")[-1]

#         i['file_type'] = file_type
#         i['shared_by'] = frappe.get_value("User",{"email":i.shared_by},["full_name"],as_dict=True).full_name or i.shared_by

#         # frappe.msgprint(str())

    
#         only_members = i.members.split(', ')
#         members_group = []
#         for member in only_members:
#             get_profile = frappe.get_value("User",{"email":member},["user_image","first_name","last_name","email"],as_dict=True) or {}
#             members_group.append(get_profile)

#         userpermissions = []

#         for j in doc.user_permissions:
#             if j.for_user == user:
#                 userpermissions.append({
#                     "drive_id": doc.name,
#                     "read": j.read,
#                     "write": j.write,
#                     "delete": 0,
#                     "download": j.download,
#                     "share": j.share,
#                     "manage": j.manage,
#                     "for_user": j.for_user,
#                     "created_by": 0 

#                 })
#                 # frappe.msgprint(str(j.read))
#                 # userpermissions.append(j)

#         # frappe.msgprint(str(userpermissions))
               
#         if user in only_members:
#             # frappe.msgprint(str(premis.user_permissions))
#             # frappe.msgprint(str(frappe.get_value("File",i.file_id,["name","file_url"],as_dict=True) or {}))
#             i['members_group'] = members_group
#             i['size']= format_bytes(int(i.size)) if i.size else '0 B'
#             i['creation'] = format_last_login(i.creation)
#             i['user_permissions'] = userpermissions or []
#             i["file_url"] = frappe.get_value("File",i.file_id,["name","file_url"],as_dict=True).file_url or {}

#             # frappe.msgprint(str(i))
#             shared_data.append(i)
#     return shared_data
    # frappe.msgprint(str(get_shared_list))


@frappe.whitelist()
def delete_item(name):
    if not name:
        frappe.msgprint(_("No items selected for deletion."))
    file_id = frappe.get_value("Drive Manager", name, "attached_to_name")

    print("deleting file_id",file_id)

    # site_path = get_site_path()

    # frappe.msgprint(str(site_path))

    # print("hello path",site_path)

    # return


    filename = frappe.get_value("File",file_id,"file_name")

    audt_log = {
        "opration":"Delete",
        "session_user": frappe.session.user,
        "drive_id":name,
        "file_id":file_id,
        "filename":filename

    }

    audit_log= make_audit_dict(audt_log)

   

    if file_id:
        roi = frappe.get_value("ROI", {'image':file_id}, "name")
        photo = frappe.get_value("Photo", {'photo':file_id}, "name")
        
        frappe.db.delete("Drive Manager", name)
        frappe.db.delete("ROI", roi)
        frappe.db.delete("Photo", photo)
        frappe.db.delete("File", file_id) # this linked with above doctypes after them this will delete...
        create_audit_log(audit_log)
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

        filename = frappe.get_value("File",file_id,"file_name")

        is_folder,file_path,filename = frappe.get_value("Drive Manager",drive_id,["is_folder","folder","file_name"])
        
        if is_folder:
            # frappe.msgprint(str(is_folder))
            # frappe.msgprint(str(file_path))
            # frappe.msgprint(str(filename))
            folder = frappe.get_value("Drive Manager",drive_id,"attached_to_name")
            is_folder_files = frappe.get_list("Drive Manager", filters={"folder": folder}, fields=['name','file_name', 'attached_to_name', 'folder'])

            if is_folder_files:
                delete_is_folder_files(is_folder_files)
        try:
            if drive_id and frappe.db.exists("Drive Manager", drive_id):
                frappe.delete_doc("Drive Manager", drive_id, force=True)
            # Delete Drive
            if file_id and frappe.db.exists("File", file_id):
                roi = frappe.get_value("ROI", {'image':file_id},"name")
                photo = frappe.get_value("Photo", {'photo':file_id},"name")
                
                if roi and frappe.db.exists("ROI", roi):
                    frappe.db.delete("ROI", roi)
                if photo and frappe.db.exists("Photo", drive_id):
                    frappe.db.delete("Photo", photo)
                frappe.delete_doc("File", file_id, force=True)
        
            # Delete File
            
            status = "Success"
        except Exception as e:
            frappe.log_error(frappe.get_traceback(), "delete_bulk_items error")
            frappe.throw(frappe.get_traceback(), "delete_bulk_items error")

        # Append result for each item

        audit_log = {
            "file_id" :file_id,
            "drive_id": drive_id,
            "session_user": frappe.session.user,
            "opration":"Delete",
            "filename":filename
        }

        audit_log = make_audit_dict(audit_log)

        if status == "Success":
            # make_audit_dict()
            create_audit_log(audit_log)
            frappe.cache.set_value("file_id",file_id)
            frappe.cache.set_value("drive_id",drive_id)
            result = delete_physical_file(file_path,filename)
            print("Success Result :",result)

        if is_folder:
            results.append({
                "drive_id": drive_id,
                "file_id":file_id,
                "status": status,
                "is_folder":is_folder

            })
        else:
            results.append({
                "drive_id": drive_id,
                "file_id":file_id,
                "status": status,
                "is_folder":0

            })
    return results




def delete_is_folder_files(is_folder_files):
    total = len(is_folder_files)
    count = 0
    for row in is_folder_files:
        drive_id = row.get("name")
        file_id = row.get("attached_to_name")
        filename = row.get("file_name")
        folder_path = row.get("folder")   # ADD THIS
                
        if drive_id and frappe.db.exists("Drive Manager", drive_id):
            frappe.delete_doc("Drive Manager", drive_id, force=True)
        # Delete Drive
        if file_id and frappe.db.exists("File", file_id):
            roi = frappe.get_value("ROI", {'image':file_id}, "name")
            photo = frappe.get_value("Photo", {'photo':file_id}, "name")
            
            if roi and frappe.db.exists("ROI", roi):
                frappe.db.delete("ROI", roi)
            if photo and frappe.db.exists("Photo", photo):
                frappe.db.delete("Photo", photo)

            frappe.delete_doc("File", file_id, force=True)

        delete_physical_file(folder_path, filename)

        count += 1

        frappe.publish_progress(
            count * 100 / len(is_folder_files),
            title=f"Deleting files inside folder",
            description=f"Deleting {filename}", 
            doctype="Drive Manager"   # 👈 must pass a doctype or task_id
        )

    


# def create_scrap_file(filename,old_path,scrap_path):
#     dm = frappe.get_doc({
#         "doctype": "Scrap Book",
#         "file_name": filename,
#         "deleted_by": frappe.session.user,
#         "original_file_url":old_path,
#         "scrap_file_url":scrap_path,
#     })
#     dm.flags.ignore_permissions = True
#     dm.insert()


def create_scrap_file(filename,old_path,scrap_path):
    dm = frappe.get_doc({
        "doctype": "Scrap Book",
        "file_name": filename,
        "deleted_by": frappe.session.user,
        "original_file_url":old_path,
        "scrap_file_url":scrap_path,
        "deleted_file_id":frappe.cache.get_value("file_id"),
        "deleted_drive_id":frappe.cache.get_value("drive_id")
    })
    dm.flags.ignore_permissions = True
    dm.insert()

def delete_physical_file(folder_path, filename):
    """
    folder_path → like "Home/sagar/Screenshots"
    filename    → "abc.png" OR folder name
    """

    # Remove the "Home/" prefix
    if folder_path.startswith("Home/"):
        clean_path = folder_path.replace("Home/", "", 1)
    elif folder_path == "Home":
        clean_path = "" 
    else:
        clean_path = folder_path

    # Build full physical path
    full_path = frappe.get_site_path(
        "public", "files", "my-drive", clean_path, filename
    )

    scrap_path = frappe.get_site_path(
        "public", "files", "my-drive","Scrap Files", filename
    )

    scrap_folder = frappe.get_site_path(
        "public", "files", "my-drive","Scrap Files"
    )


    if not os.path.exists(full_path):
        return f"File/Folder not found: {full_path}"

    # Case 1: it's a FILE
    if os.path.isfile(full_path):
        # os.remove(full_path)
        if not os.path.exists(scrap_folder):
            os.makedirs(scrap_folder)
        shutil.move(full_path,scrap_path)
        create_scrap_file(filename,full_path,scrap_path)
        return f"Deleted file: {full_path}"

    # Case 2: it's a FOLDER (directory)
    if os.path.isdir(full_path):
        try:
            os.rmdir(full_path)      # works only if directory is empty
            return f"Deleted empty folder: {full_path}"
        except OSError:
            # directory not empty → need recursive delete
            shutil.rmtree(full_path)
            return f"Deleted folder with contents: {full_path}"



'''
def delete_physical_file(file_path, filename):
    # frappe.msgprint(str(file_path))
    if file_path == "Home":
        full_path = frappe.get_site_path("public", "files", "my-drive", filename)
        if os.path.exists(full_path):
            print("yess file is exist in directory")
            os.remove(full_path)
            return f"its in Home Dir Deleted: {full_path}"
        else:
            return f"File not found: {full_path}"
        
    else:
        # file_path = "Home/sagar/Screenshots"
        parts = file_path.split("/", 1)   # split into ["Home", "sagar/Screenshots"]
        clean_path = parts[1] 
        print(clean_path)
        full_path = frappe.get_site_path("public", "files", "my-drive",clean_path,filename)
        if os.path.exists(full_path):
            print("yess file is exist in directory")
            os.remove(full_path)
            return f"its not in Home Dir Deleted: {full_path}"
        else:
            return f"File not found: {full_path}"

        print("else of delete physical file")
        # frappe.msgprint(str(file_path),str(frappe.get_site_path()))
'''



    # frappe.msgprint(str(full_path))




@frappe.whitelist()
def upload_file():
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
                    "physical_path": file_path,
                    "created_by": frappe.session.user
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
    








@frappe.whitelist()
def upload_file_chunk(
        file_name,
        chunk_index,
        total_chunks,
        folder,
        upload_id
    ):
    chunk = frappe.request.files.get("file")
    if not chunk:
        frappe.throw("Chunk missing")

    temp_dir = get_site_path("private", "chunk_uploads", upload_id)
    os.makedirs(temp_dir, exist_ok=True)

    chunk_path = os.path.join(temp_dir, f"chunk_{chunk_index}")
    chunk.save(chunk_path)

    # If last chunk → merge
    if int(chunk_index) + 1 == int(total_chunks):
        return finalize_upload(
            upload_id,
            file_name,
            total_chunks,
            folder
        )

    return {"status": "chunk_received"}


def finalize_upload(upload_id, file_name, total_chunks, folder):
    site_path = get_site_path()
    my_drive_path = os.path.join(
        site_path, "public", "files", "my-drive"
    )
    os.makedirs(my_drive_path, exist_ok=True)

    target_folder_path = my_drive_path

    if folder and folder != "My Drive":
        parts = folder.split("/")
        if parts[0].lower() == "home":
            parts = parts[1:]

        for part in parts:
            if part.strip():
                target_folder_path = os.path.join(target_folder_path, part)
                os.makedirs(target_folder_path, exist_ok=True)

    # Handle duplicate names
    filename = file_name
    file_path = os.path.join(target_folder_path, filename)
    counter = 1
    name, ext = os.path.splitext(filename)

    while os.path.exists(file_path):
        filename = f"{name}_{counter}{ext}"
        file_path = os.path.join(target_folder_path, filename)
        counter += 1

    # Merge chunks
    temp_dir = get_site_path(
        "private", "chunk_uploads", upload_id
    )

    with open(file_path, "wb") as final_file:
        for i in range(int(total_chunks)):
            chunk_path = os.path.join(temp_dir, f"chunk_{i}")
            with open(chunk_path, "rb") as chunk:
                final_file.write(chunk.read())

    # Cleanup temp chunks
    # frappe.delete_doc_if_exists("File", upload_id)
    # frappe.utils.remove_folder(temp_dir)
    shutil.rmtree(temp_dir, ignore_errors=True)

    # Create File URL
    relative_path = os.path.relpath(file_path, my_drive_path)
    file_url = f"/files/my-drive/{relative_path.replace(os.sep, '/')}"

    frappe.flags.ignore_file_size_limit = True


    # Create File Doc
    file_doc = frappe.get_doc({
        "doctype": "File",
        "file_name": filename,
        "file_url": file_url,
        "folder": folder,
        "is_private": 0
    }).insert(ignore_permissions=True)

    # Create Drive Manager
    dm = frappe.get_doc({
        "doctype": "Drive Manager",
        "file_name": filename,
        "created_by": frappe.session.user,
        "folder": folder,
        "attached_to_name": file_doc.name
    })
    dm.flags.ignore_permissions = True
    dm.insert()

    get_tags(file_doc.name)

    return {
        "success": True,
        "uploaded_files": [{
            "file_id": file_doc.name,
            "drive_id": dm.name,
            "file_name": filename,
            "file_url": file_url,
            "folder": folder,
            "physical_path": file_path,
            "created_by": frappe.session.user
        }],
        "folder": folder,
        "total_uploaded": 1
    }



    








def format_bytes(size):
    # 1 KB = 1024 bytes, 1 MB = 1024 KB
    size = int(size)
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0