import { connectionPool } from "@db";
import { organizationIsValid } from "@lib/auth/utils";

import { NextResponse } from "next/server";

export async function POST(request) {

    // Extracting user-permissions
    // -- Extracting the organizations the user has permission on
    const permissionString = request.headers.get("x-user-permissions");
    const permissions = permissionString?.split(",") ?? []
    const allowedOrganizations = [ ...new Set(
        permissions.map(permission => permission?.split(":")?.[0] ?? "")
    )];

    // Extracting request-body
    const requestJSON = await request.json();
    const id = requestJSON?.id ?? null;
    const name = requestJSON?.name ?? null;

    // Validating request body
    if (!id || !name) {
        console.error(`Invalid id or name in request body`);
        const reposnse = NextResponse.json({ message: "failure" }, { status: 400 });
        return reposnse;
    }

    // Setting Cookie if everythign is valid
    // -- check if user has permisison on the post-organization
    // -- check if post-organization is a valid organization
    // -- NOTE: may remove database-access step to validate organization to increase speed
    if (
        organizationIsValid(id) && 
        allowedOrganizations.includes(id)
    ) {
        const response = NextResponse.json({ message: "success" });
        response.cookies.set(
            "__Secure-org-token",
            btoa(JSON.stringify({ id, name })),
            {
                httpOnly: true,
                secure: true,
                path: "/",
                sameSite: "lax"
            }
        )
        return response
    } else {
        console.error(`Invalid organization setting : ${id}`);
        const reposnse = NextResponse.json({ message: "failure" }, { status: 401 });
        return reposnse;
    }

}
