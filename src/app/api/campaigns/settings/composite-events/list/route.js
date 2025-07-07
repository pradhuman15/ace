import { validateAdvertisers } from "@lib/auth/filters"
import { fetchPermissionCompositeEvents } from "@lib/auth/composite-events";

export async function POST(request) {

    // Extracting user-permissions
    // -- Extracting the organizations the user has permission on
    const organizationId = request.headers.get("x-organization");
    const permissionString = request.headers.get("x-user-permissions");
    const permissions = permissionString?.split(",") ?? [];

    // Extracting request-body
    const requestJSON = await request.json();
    const advertiserIds = requestJSON?.advertiserIds ?? null;

    // Check validity of advertisers we are trying to fetch data for
    let valid, errors;
    valid, errors = await validateAdvertisers(permissions, advertiserIds);
    if (errors) {
        console.error(`Filters are not valid : Errors : ${errors.join(", ")}`);
        return new Response(
            JSON.stringify({ "error" : "fitlers are invalid" }),
            { status: 400 }
        )
    }

    try {
        if (advertiserIds.length !== 1) {
            throw Error(`Invalid filters : AdvetisersIds : ${advertiserIds}`);
        }
        const advertiserId = advertiserIds[0];
        const compositeEvents = await fetchPermissionCompositeEvents(permissions, organizationId, advertiserId);

        return new Response(
            JSON.stringify(compositeEvents),
            {
                status:200,
                headers: { "Content-Type" : "application/json" }
            }
        );
    } catch (error) {
        console.error(`Error while fetching compositeEvents : ${error}`)
        return new Response(
            JSON.stringify([]),
            {
                status:500,
                headers: { "Content-Type" : "application/json" }
            }
        )
    }

}
