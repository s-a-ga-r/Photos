(() => {
  // ../photos/photos/public/js/photos.bundle.js
  frappe.router.on("change", () => {
    const route = frappe.get_route_str();
    var from_rout = false;
    if (route === "Workspaces/Document Management") {
      frappe.set_route("my-drive-v2");
      from_rout = true;
    }
    if (route !== "Workspaces/Document Management") {
      if (from_rout) {
        console.log("get called");
        window.location.reload();
        from_rout = false;
      }
    }
  });
})();
//# sourceMappingURL=photos.bundle.RKD4L52F.js.map
