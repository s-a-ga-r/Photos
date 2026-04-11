# Copyright (c) 2020, Gavin D'souza and Contributors
# See license.txt
from collections.abc import Iterable
from typing import TYPE_CHECKING
import frappe
from frappe.utils import get_site_path


if TYPE_CHECKING:
    from frappe.core.doctype.file.file import File
    from frappe.core.doctype.user.user import User
    from photos.photos.doctype.photo.photo import Photo


def get_image_path(file_url: str):
    if file_url.startswith("/private"):
        file_url_path = (file_url.lstrip("/"),)
    else:
        file_url_path = ("public", file_url.lstrip("/"))
    return frappe.get_site_path(*file_url_path)


def chunk(iterable: Iterable, chunk_size: int):
    """Creates list of elements split into groups of n."""
    for i in range(0, len(iterable), chunk_size):
        yield iterable[i : i + chunk_size]


def image_resize(image, width: int | None = None, height: int | None = None, inter: int | None = None):
    import cv2

    if inter is None:
        inter = cv2.INTER_AREA
    # initialize the dimensions of the image to be resized and
    # grab the image size
    dim = None
    (h, w) = image.shape[:2]

    # if both the width and height are None, then return the
    # original image
    if width is None and height is None:
        return image

    # check to see if the width is None
    if width is None:
        # calculate the ratio of the height and construct the
        # dimensions
        r = height / float(h)
        dim = (int(w * r), height)

    # otherwise, the height is None
    else:
        # calculate the ratio of the width and construct the
        # dimensions
        r = width / float(w)
        dim = (width, int(h * r))

    # resize the image
    resized = cv2.resize(image, dim, interpolation=inter)

    # return the resized image
    return resized


def get_file_dashboard(*args, **kwargs):
    return {
        "fieldname": "photo",
        "transactions": [
            {"label": "Photos", "items": ["Photo"], "fieldname": "photo"},
            {"label": "People", "items": ["ROI"], "fieldname": "image"},
        ],
    }


# after added image in file doctype it auto insert in Photo doctype


# def process_file(file: "File", event: str) -> "Photo":
#     if event != "after_insert":
#         raise NotImplementedError

#     if file.is_folder or not file.content_type.startswith("image"):
#         return
    
#     if frappe.db.exists("Drive Manager", {"attached_to_name": file.name}):
#         photo = frappe.new_doc("Photo")
#         photo.photo = file.name
#         frappe.msgprint(str("Processing file: {0}".format(file.name)))
#         return photo.save()
    

# def handle_file_update(doc, method):
#     if doc.attached_to_doctype == "YourCustomDoctype":
#         # Example: Create a folder based on a field in YourCustomDoctype
#         custom_folder_name = frappe.db.get_value("YourCustomDoctype", doc.attached_to_name, "your_field_for_folder_name")
#         if custom_folder_name:
#             new_file_url = f"/files/{custom_folder_name}/{doc.file_name}"
#             frappe.db.set_value("File", doc.name, "file_url", new_file_url)
#             # Frappe handles the actual file movement based on the updated file_url





# original code

def process_file(file: "File", event: str) -> "Photo":
    if event != "after_insert":
        raise NotImplementedError
    if file.is_folder or not file.content_type.startswith("image"):
        return
    if not file.content_type:
        return
    if not file.file_url.startswith("/files/my-drive/"):
        return
    photo = frappe.new_doc("Photo")
    photo.photo = file.name
    frappe.msgprint(str("Processing file: {0}".format(file.name)))
    return photo.save(ignore_permissions=True)

# Added by Sagar Patil
import os
from frappe.exceptions import LinkValidationError


def create_folder(folder:"File",event:str):
    if event != "after_insert":
        raise NotImplementedError

    if not folder.is_folder:
        return

    # creating folder kim
    print("site path",frappe.get_site_path())
    print("file url",folder.file_url)
    print("folder",folder.folder) # Home/kim_wexler
    print("folder",folder.name)  # Home/kim_wexler/kim

    print("file_name",folder.file_name)


    if folder.folder.startswith("Home/"):
        userbase_folder = folder.folder[len("Home/"):]
        print("Userbase Folder withou Home/ :",userbase_folder)
        my_drive_path = frappe.get_site_path(
            "public", "files", "my-drive",userbase_folder
        )
        print("my_drive_path : ",my_drive_path)
    else:
        print("else : its is just Home : ",folder.folder)
        userbase_folder = get_userbase_folder(frappe.session.user)
        print("userbase_folder",userbase_folder)
        my_drive_path = frappe.get_site_path(
            "public", "files", "my-drive",userbase_folder
        )
        print("else : my_drive_path : ",my_drive_path)
        
    target_folder_path = os.path.join(my_drive_path,folder.file_name)
    if not os.path.exists(target_folder_path):
        os.makedirs(target_folder_path)
        print("New Folder Created with :",target_folder_path)

    # print("is_new",folder.is_new)
    
    # full_path = frappe.get_site_path(
    #     "public", "files", "my-drive",get_userbase_folder(frappe.session.user)
    # )

    # if not os.path.exists(full_path):
    #     userbase_folder = os.path.join(full_path,folder.file_name)
    #     os.makedirs(userbase_folder)
    
    print("folder creating in drive manager from utils ",folder.folder)
    try:
        drive = frappe.new_doc("Drive Manager")
        drive.file_name = folder.file_name
        drive.attached_to_name = folder.name
        drive.is_folder = folder.is_folder
        drive.created_by = frappe.session.user
        head, tail = os.path.split(folder.name)
        drive.folder = head
        if folder.folder == "Home":
            drive.is_user_folder = 1
        frappe.msgprint(str("{0} Created Folder Successfully".format(folder.file_name)))
        return drive.save()
    except LinkValidationError:
        frappe.msgprint("Parent folder not found. Cannot create Drive Manager entry.")
    except Exception as e:
        # Catch any other unexpected error
        frappe.msgprint(f"Unexpected error: {str(e)}")



def create_user(user:"User",event:str):
    if event != "after_insert":
        raise NotImplementedError
    try:
        drv_access = frappe.new_doc("Drive Access")
        drv_access.user = user.email
        drv_access.view_only = 1
        # frappe.msgprint(str("{0} Created Folder Successfully".format(user.email)))

        return drv_access.save()
    except LinkValidationError:
        frappe.msgprint("Parent folder not found. Cannot create Drive Manager entry.")



@frappe.whitelist()
def get_user_folder(user,folder):
    user_folder = frappe.db.get_value("User", user, "username")
    user_base_folder = f'{folder}/{user_folder}'
    return user_base_folder