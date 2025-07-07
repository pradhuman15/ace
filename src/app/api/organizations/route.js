import { connectionPool } from "@db";

export async function GET(request) {

    // Extracting user-permissions
    // -- Extracting the organizations the user has permission on
    const permissionString = request.headers.get("x-user-permissions");
    const permissions = permissionString?.split(",") ?? []
    const allowedOrganizations = [ ...new Set(
        permissions.map(permission => permission?.split(":")?.[0] ?? "")
    )];

    let organizations = [];
    try {
        const placeholders = allowedOrganizations.map((_, i) => `$${i+1}`).join(", ")
        const query = `select id, name from organizations where id in (${placeholders})`;
        const client = await connectionPool.connect();
        const result = await client.query(query, allowedOrganizations);
        client.release();

        if (
            result &&
            result?.rows &&
            Array.isArray(result?.rows)
        ) {
            organizations = result.rows.map(resultRow => ({
                id: resultRow.id,
                name: resultRow.name
            }));
        } else {
            const errorMessage = `Error : Invalid data from database : ${result}`
            console.error()
            throw new Error(`Invalid data obtained `)
        }
    } catch (error) {
        console.error(`Error while fetching organizations : ${error}`);
        return new Response(
            JSON.stringify({ "error": "Internal Error" }),
            { status: 500 }
        )
    }

    return new Response(
        JSON.stringify(organizations),
        {
            status: 200,
            headers: { "Content-Type" : "application/json" }
        }
    )
}
