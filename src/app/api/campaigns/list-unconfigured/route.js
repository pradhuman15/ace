import { connectionPool } from "@db";
import { validateAdvertisers } from "@lib/auth/filters"

import assert from "assert";

export async function POST(request) {

    // Extracting user-permissions
    // -- Extracting the organizations the user has permission on
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

    const client = await connectionPool.connect();

    try {
        const placeholders = advertiserIds.map((_,i) => `$${i+1}`)
        const query = `
            select 
                id,
                name
            from campaigns
            where 
                advertiser_id in (${placeholders}) and
                (
                    id not in (select distinct campaign_id from campaign_floodlight_rankings) and
                    id not in (select distinct campaign_id from campaign_composite_event_rankings)
                )
        `
        const result = await client.query(query, advertiserIds);

        assert(result, "Result is invalid");
        assert(result?.rows, "Result does not have rows");
        assert(Array.isArray(result?.rows), "Result rows are not valid");

        const campaigns = result.rows;
        return new Response(
            JSON.stringify(campaigns),
            {
                status: 200,
                headers: { "Content-Type" : "application/json" }
            }
        )

    } catch (error) {
        console.error(`Error while fetching campaigns : ${error}`);
        return new Response(
            JSON.stringify({ "error" : "Internal Error" }),
            { status:500 }
        )
    } finally {
        client.release();
    }
}

