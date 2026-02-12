// Better approach - don't override, just intercept


// frappe.router.on('change', () => {
//     const route = frappe.get_route_str();
//     console.log("route",route);
    
//     var from_rout = false

//     if (route === "Workspaces/Document Management") {
//         frappe.set_route("my-drive-v2");

//         from_rout = true
//         console.log("route is ",frappe.get_route_str());
        
//     }

//     if (route !== "Workspaces/Document Management") {
//         // frappe.set_route("my-drive-v2");

//         if(from_rout){

//             console.log("get called");

//             // frappe.desk.sidebar.make();

//             window.location.reload();

//             from_rout =  false
            

//         }
        
//     }

// });



frappe.provide('frappe.router');

// 🎯 Track the previous route
let previousRoute = null;

frappe.router.on('change', () => {
    const currentRoute = frappe.get_route_str();

    console.log("get_route_str",currentRoute);
    
    
    // Redirect workspace to custom page
    if (currentRoute === "Workspaces/Document Management") {
        frappe.set_route("my-drive-v2");
        previousRoute = currentRoute;
        console.log("the route :",frappe.get_route_str());
        return;

    }

    if (currentRoute !=="Workspaces/Document Management"){

        if (previousRoute =="my-drive-v2"){
            console.log("currentRoute",currentRoute);
            window.location.reload();
            return;
        
        }
    }    
    
    // Update previous route
    previousRoute = currentRoute;
});





// frappe.router.on('change', () => {
//     const route = frappe.get_route_str();

//     if (route === "my-drive-v2") {
//         enable_my_drive_ui();
//     } else {
//         restore_workspace_sidebar();
//     }
// });



// let original_sidebar_html = null;

// frappe.router.on('change', () => {
//     if (!original_sidebar_html && $('.layout-side-section').length) {
//         original_sidebar_html = $('.layout-side-section').clone(true, true);
//     }
// });


// function enable_my_drive_ui() {
//     $('body').addClass('my-drive-active');

//     // You can hide or reuse sidebar here
//     $('.layout-side-section').show();
// }


// function enable_my_drive_ui() {
//     $('.layout-side-section').hide();
//     $('#my-drive-sidebar').show();
// }

// function restore_workspace_sidebar() {
//     if (!original_sidebar_html) return;

//     $('.layout-side-section').replaceWith(
//         original_sidebar_html.clone(true, true)
//     );

//     // Rebind Desk sidebar
//     frappe.desk.sidebar.make();
// }


// function restore_workspace_sidebar() {
//     console.log("Restoring workspace sidebar");

//     $('body').removeClass('my-drive-active');

//     // 1️⃣ Remove page-level overrides
//     $('.layout-side-section')
//         .removeAttr('style')
//         .show();

//     $('.list-sidebar')
//         .removeClass('opened')
//         .empty(); // VERY IMPORTANT

//     // 2️⃣ Force Desk to rebuild sidebar
//     if (frappe.desk && frappe.desk.sidebar) {
//         frappe.desk.sidebar.make();
//     }

//     // 3️⃣ Refresh workspace (ensures links load)

//     // if (frappe.workspace) {
//     //     var message = __("Only Workspace Manager can edit public workspaces");
//     //     // frappe.workspace.refresh();
//     //     frappe.show_message(message);
//     // }
// }






// frappe.provide('frappe.router');

// const original_render = frappe.router.render;

// frappe.router.render = function() {
//     const route = frappe.get_route_str();
//     console.log("Current route:", route);
//     console.log("frappe.get_route()",frappe.get_route());    

//     // $('body').removeClass('my-drive-v2-active');

//      if (route !== "Workspaces/Document Management") {

//         console.log("rout is not my drive");

//         $("#page-my-drive-v2").css('margin-display', 'none');

//         if ($(".page-title button").length > 1) {
//             console.log("length is ",$(".page-title button").length);

//             // $(".page-title button").first().remove();

//             // window.location.reload();

//             let sidebar = $(".layout-side-section");
//             console.log(sidebar);
            

// 			let innerSidebar = $(".list-sidebar");

//             sidebar.show();
//             innerSidebar.addClass("opened");
    
//             console.log("removed one check");

//             $(".layout-side-section").show();
// 		    $(".list-sidebar").addClass("opened");

            
            
//         }
        
      
//     }
		
// 		// 🎯 IMPORTANT: Reset sidebar state for other pages
		

//     if (route === "Workspaces/Document Management") {
//         // window.location.reload();
//         console.log("Redirecting to my-drive-v2");
//         frappe.set_route("my-drive-v2");
//         return;
//     }
   
//     // Call original render for other routes
//     return original_render.call(this);
// };





