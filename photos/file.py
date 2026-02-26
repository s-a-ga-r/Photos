
def write_file(self):
	if self.file_url and self.file_url.startswith("/files/my-drive/"):
		print("Skipping save_file_on_filesystem for: "+self.file_url)
		return self.file_url
		pass
	else:
		# print("Not Skipping save_file_on_filesystem for: "+self.file_url)
		self.save_file_on_filesystem()

