import { connectionPool } from "@db";
import { fetchPermissionCampaigns } from "@lib/auth/campaigns";

export async function POST(request) {

    // Extracting user-permissions
    // -- Extracting the organizations the user has permission on
    const organizationId = request.headers.get("x-organization");
    const permissionString = request.headers.get("x-user-permissions");
    const permissions = permissionString?.split(",") ?? [];

    // Extracting request-body
    const requestJSON = await request.json();
    const filters = requestJSON?.filters ?? null;

    const campaigns = await fetchPermissionCampaigns(permissions, organizationId, filters);
    return new Response(
        JSON.stringify(campaigns),
        {
            status: 200,
            headers: { "Content-Type" : "application/json" }
        }
    )

}
