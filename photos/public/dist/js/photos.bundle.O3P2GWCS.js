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
    if (previousRoute === "my-drive-v2" && (currentRoute === "" || currentRoute === "Workspace")) {
      console.log("Reloading after leaving my-drive-v2");
      previousRoute = null;
      window.location.reload();
      return;
    }
    console.log("currentRoute :", currentRoute);
    previousRoute = currentRoute;
  });
})();
//# sourceMappingURL=photos.bundle.O3P2GWCS.js.map
