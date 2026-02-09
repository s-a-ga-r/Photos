from frappe.core.doctype.file.file import File
import frappe


_original_check = File.check_max_file_size


def patched_check_max_file_size(self):
    # ONLY skip when flag is set
    if getattr(frappe.flags, "ignore_file_size_limit", False):
        return self.file_size
    
    # return _original_check(self)
    
    return True
    


def apply_patch():
    File.check_max_file_size = patched_check_max_file_size
