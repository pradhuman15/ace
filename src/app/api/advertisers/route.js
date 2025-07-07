import { fetchPermissionAdvertisers } from "@lib/auth/advertisers";

export async function GET(request) {

    // Extracting user-permissions
    // -- Extracting the organizations the user has permission on
    const organizationId = request.headers.get("x-organization");
    const permissionString = request.headers.get("x-user-permissions");
    const permissions = permissionString?.split(",") ?? [];

    const advertisers = await fetchPermissionAdvertisers(permissions, organizationId, null);
    return new Response(
        JSON.stringify(advertisers),
        {
            status: 200,
            headers: { "Content-Type" : "application/json" }
        }
    )

}
