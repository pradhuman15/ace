import { connectionPool } from "@db";
import { fetchPermissionInsertionOrders } from "@lib/auth/insertion-orders";

export async function POST(request) {

    // Extracting user-permissions
    // -- Extracting the organizations the user has permission on
    const organizationId = request.headers.get("x-organization");
    const permissionString = request.headers.get("x-user-permissions");
    const permissions = permissionString?.split(",") ?? [];

    // Extracting request-body
    const requestJSON = await request.json();
    const filters = requestJSON?.filters ?? null;

    const insertionOrders = await fetchPermissionInsertionOrders(permissions, organizationId, filters);
    return new Response(
        JSON.stringify(insertionOrders),
        {
            status: 200,
            headers: { "Content-Type" : "application/json" }
        }
    )

}

