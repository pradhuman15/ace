import { fetchPermissionFloodlights } from "@lib/auth/floodlights";

export async function POST(request) {

    // Extracting user-permissions
    // -- Extracting the organizations the user has permission on
    const organizationId = request.headers.get("x-organization");
    const permissionString = request.headers.get("x-user-permissions");
    const permissions = permissionString?.split(",") ?? [];

    // Extracting request-body
    const requestJSON = await request.json();
    const filters = requestJSON?.filters;

    try {
        const advertiserIds = filters?.advertiserIds ?? [];
        if (advertiserIds.length !== 1) {
            throw Error(`Invalid filters : Filter : ${filters}`);
        }
        const advertiserId = advertiserIds[0];
        const floodlights = await fetchPermissionFloodlights(permissions, organizationId, advertiserId);

        return new Response(
            JSON.stringify(floodlights),
            {
                status:200,
                headers: { "Content-Type" : "application/json" }
            }
        );
    } catch (error) {
        console.error(`Error while fetching floodlights : ${error}`)
        return new Response(
            JSON.stringify([]),
            {
                status:500,
                headers: { "Content-Type" : "application/json" }
            }
        )
    }

}

