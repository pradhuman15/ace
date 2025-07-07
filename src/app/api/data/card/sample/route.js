import { validateFilters } from "@lib/auth/filters";

export async function POST(request) {

    // Extracting user-permissions
    // -- Extracting the organizations the user has permission on
    const permissionString = request.headers.get("x-user-permissions");
    const permissions = permissionString?.split(",") ?? [];

    // Extracting request-body
    const requestJSON = await request.json();
    const dataFilters = requestJSON?.filters;

    const { valid, errors } = await validateFilters(permissions, dataFilters);
    if (errors) {
        console.error(`Filters are not valid : Errors : ${errors.join(", ")}`);
        return new Response(
            JSON.stringify({ "error" : "filters are invalid" }),
            { status: 400 }
        )
    }

}

