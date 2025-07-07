import { 
    editExistingCompositeEvent,
    saveNewCompositeEvent 
} from "@lib/auth/composite-events";

export async function POST(request) {

    // Extracting user-permissions
    // -- Extracting the organizations the user has permission on
    const permissionString = request.headers.get("x-user-permissions");
    const permissions = permissionString?.split(",") ?? [];

    // Extracting request-body
    const requestJSON = await request.json();
    const compositeEvent = requestJSON?.compositeEvent;

    if (compositeEvent?.id) {
        let { event, error } = await editExistingCompositeEvent(permissions, compositeEvent);
        if (error) {
            return new Response(
                JSON.stringify({ "error" : "error saving composite-event to database" }),
                { status: 500 }
            )
        } else {
            return new Response(
                JSON.stringify({ event : event }),
                { 
                    status:200,
                    headers: { "Content-Type" : "application/json" }
                }
            );
        }
    } else {
        let { event, error } = await saveNewCompositeEvent(permissions, compositeEvent);
        if (error) {
            return new Response(
                JSON.stringify({ "error" : "error saving composite-event to database" }),
                { status: 500 }
            )
        } else {
            return new Response(
                JSON.stringify({ event : event }),
                { 
                    status:200,
                    headers: { "Content-Type" : "application/json" }
                }
            );
        }
    }

}
