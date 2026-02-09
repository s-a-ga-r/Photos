
frappe.provide('frappe.router');

const original_render = frappe.router.render;

frappe.router.render = function() {
    const route = frappe.get_route_str();
    console.log("Current route:", route);
    
    if (route === "document-management" || route === "Workspace/document-management") {
        console.log("Redirecting to my-drive-v2");
        frappe.set_route("my-drive-v2");
        return;
    }
    
    // Call original render for other routes
    return original_render.call(this);
};



// frappe.router.on("change", () => {
//     if (frappe.get_route_str() === "document-management") {
//         console.log("set route my-drive-v2");
        
//         frappe.set_route("my-drive-v2");
//     }
// });


// $(document).on('click', '.workspace-sidebar-item[data-page-name="document-management"]', function(e) {
//     e.preventDefault();
//     e.stopPropagation();
//     frappe.set_route('my-drive');
//     return false;
// });



// frappe.router.render = function () {

//     if (frappe.get_route_str() === "document-management") {
//         console.log("seting route my-drive-v2");
        
//         frappe.set_route("my-drive-v2");
//     }



//     // if (this.current_route[0]) {
//     //     console.log("where am i",this.current_route[0]);
//     //     console.log("where am i sagar",this.current_route);
//     //     console.log("frappe routing ",frappe.get_route_str());
        
        
//     //     this.render_page();
//     // } else {
//     //     // Redirect to our custom workspace
//     //     frappe.set_route(['app', 'my-drive-v2']);
//     // }
// }