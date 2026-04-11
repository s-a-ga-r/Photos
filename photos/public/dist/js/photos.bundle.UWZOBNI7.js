(() => {
  // ../photos/photos/public/js/photos.bundle.js
  frappe.provide("frappe.router");
  var previousRoute = null;
  frappe.router.on("change", () => {
    const currentRoute = frappe.get_route_str();
    if (currentRoute === "Workspaces/Document Management") {
      frappe.set_route("my-drive-v2");
      previousRoute = currentRoute;
      console.log("the route :", frappe.get_route_str());
      return;
    }
    if (currentRoute !== "Workspaces/Document Management") {
      $(".btn-reset.sidebar-toggle-btn").remove();
      if (previousRoute == "my-drive-v2") {
        window.location.reload();
        return;
      }
    }
    previousRoute = currentRoute;
  });
})();
//# sourceMappingURL=photos.bundle.UWZOBNI7.js.map
