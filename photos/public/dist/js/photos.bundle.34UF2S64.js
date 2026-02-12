(() => {
  // ../photos/photos/public/js/photos.bundle.js
  frappe.provide("frappe.router");
  var previousRoute = null;
  frappe.router.on("change", () => {
    const currentRoute = frappe.get_route_str();
    console.log("get_route_str", currentRoute);
    if (currentRoute === "Workspaces/Document Management") {
      frappe.set_route("my-drive-v2");
      previousRoute = currentRoute;
      console.log("the route :", frappe.get_route_str());
      return;
    }
    if (currentRoute !== "Workspaces/Document Management") {
      if (previousRoute == "my-drive-v2") {
        console.log("currentRoute", currentRoute);
        window.location.reload();
        return;
      }
    }
    previousRoute = currentRoute;
  });
})();
//# sourceMappingURL=photos.bundle.34UF2S64.js.map
