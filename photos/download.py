# Copyright (c) 2020, Gavin D'souza and Contributors
# See license.txt
from collections.abc import Iterable
from typing import TYPE_CHECKING

import os
import json
import frappe

if TYPE_CHECKING:
    from frappe.core.doctype.file.file import File

    from photos.photos.doctype.photo.photo import Photo




# @frappe.whitelist()
# def download(bulk_files):
    



@frappe.whitelist()
def download(file_id):

    # Get the File doc
    file_doc = frappe.get_doc("File",file_id)

    # Physical file path
    file_path = frappe.get_site_path("public", file_doc.file_url.lstrip("/"))



    if not os.path.exists(file_path):
        frappe.throw("File not found on server.")

    # Prepare response for download
    frappe.local.response.filename = file_doc.file_name
    frappe.local.response.filecontent = open(file_path, "rb").read()
    frappe.local.response.type = "download"

@frappe.whitelist()
def download_scrap_file(scrap_id):
    # frappe.msgprint(str(scrap_id))
    sb_doc = frappe.get_doc("Scrap Book",scrap_id)
    if not os.path.exists(sb_doc.scrap_file_url):
        frappe.throw("File not found on server.")

    # Prepare response for download
    frappe.local.response.filename = sb_doc.file_name
    frappe.local.response.filecontent = open(sb_doc.scrap_file_url, "rb").read()
    frappe.local.response.type = "download"



@frappe.whitelist()
def can_download(scrap_id):
    if not frappe.db.exists("Scrap Book", scrap_id):
        return False
    sb_doc = frappe.get_doc("Scrap Book",scrap_id)

    if not os.path.exists(sb_doc.scrap_file_url):
         return frappe.utils.os.path.exists(sb_doc.scrap_file_url)



# @frappe.whitelist()
# def download_pdf_file(file_id):
#     file_doc = frappe.get_doc("File", file_id)
#     file_path = frappe.get_site_path("public", file_doc.file_url.lstrip("/"))

#     if not os.path.exists(file_path):
#         frappe.throw("File not found")

#     frappe.local.response.filename = file_doc.file_name
#     frappe.local.response.filecontent = open(file_path, "rb").read()
#     frappe.local.response.type = "download"




    '''file_doc = frappe.get_doc("File", file_id)

    file_url = file_doc.file_url
    file_name = file_doc.file_name

    # Full physical path (works for public files)
    file_path = frappe.get_site_path("public", file_url.lstrip("/"))

    if not os.path.exists(file_path):
        frappe.throw("File not found on server.")

    # Detect file type
    ext = os.path.splitext(file_name)[1].lower()

    # If you want special handling:
    if ext in [".pdf"]:
        # Optional: force download
        frappe.local.response.headers["Content-Disposition"] = (
            f'attachment; filename="{file_name}"'
        )

    elif ext in [".xls", ".xlsx"]:
        # Optional: Excel-specific header
        frappe.local.response.headers["Content-Type"] = (
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    # Common download logic for ALL formats
    frappe.local.response.filename = file_name
    frappe.local.response.filecontent = open(file_path, "rb").read()
    frappe.local.response.type = "download"'''