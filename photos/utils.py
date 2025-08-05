# Copyright (c) 2020, Gavin D'souza and Contributors
# See license.txt
from collections.abc import Iterable
from typing import TYPE_CHECKING

import frappe

if TYPE_CHECKING:
    from frappe.core.doctype.file.file import File

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

    photo = frappe.new_doc("Photo")
    photo.photo = file.name

    frappe.msgprint(str("Processing file: {0}".format(file.name)))

    return photo.save()
