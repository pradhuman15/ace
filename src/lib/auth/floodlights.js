import { connectionPool } from "@db";
import { cookieGetUserPermissions } from "./user";

import assert from "assert";

export async function floodlightsAreValid(floodlightIds, advertiserId) {
    try {
        const query = `
            select 1
            from floodlights
            where 
                id in (${floodlightIds.map((_,i) => `$${i+1}`).join(", ")}) and
                advertiser_id = $${floodlightIds.length + 1}
        `;
        const client = await connectionPool.connect();
        const result = await client.query(query, [ ...floodlightIds, advertiserId ]);
        client.release();

        // Validating result
        assert(result, "Result is invalid");
        assert(result?.rows, "Result does not have rows");
        assert(Array.isArray(result?.rows), "Result rows are not valid");
        assert(result.rows.length === floodlightIds.length, "All floodlights are not accounted for");

        return true;

    } catch (error) {
        console.error(`Error validating all floodlights : ${error}`);
        return false;
    }
}

export async function fetchUserFloodlights(cookieStore, organizationId) {
    const permissions = await cookieGetUserPermissions(cookieStore);
    return fetchPermissionFloodlights(permissions, organizationId, filters)
}

export async function fetchPermissionFloodlights(permissions, organizationId, advertiserId) {

    if (!advertiserId) {
        console.error(`Error while fetch user-floodlights : Error : advertiserId not provided`);
        return [];
    }

    try {
        const query = `
            select
                floodlights.id,
                floodlights.name,
                floodlights.advertiser_id as advertiser_id,
                advertisers.name as advertiser
            from floodlights
            left join advertisers
            on
                floodlights.advertiser_id = advertisers.id
            where floodlights.advertiser_id = $1
        `;
        const client = await connectionPool.connect();
        const result = await client.query(query, [advertiserId]);
        client.release();

        // Validating query result
        assert(result, "Result is invalid");
        assert(result?.rows, "Result does not have rows");
        assert(Array.isArray(result?.rows), "Result rows are not valid");

        // Consolidating result and return 
        const floodlights = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            advertiserId: row.advertiser_id,
            advertiser: row.advertiser,
        }));
        return floodlights;

    } catch (error) {
        console.error(`Error while fetching user-floodlights : Error : ${error}`);
        return [];
    }

}

export async function fetchFloodlights(organizationId, advertiserId) {

    if (!advertiserId) {
        console.error(`Error while fetch user-floodlights : Error : advertiserId not provided`);
        return [];
    }

    try {
        const query = `
            select
                floodlights.id,
                floodlights.name,
                floodlights.advertiser_id as advertiser_id,
                advertisers.name as advertiser
            from floodlights
            left join advertisers
            on
                floodlights.advertiser_id = advertisers.id
            where floodlights.advertiser_id = $1
        `;
        const client = await connectionPool.connect();
        const result = await client.query(query, [advertiserId]);
        client.release();

        // Validating query result
        assert(result, "Result is invalid");
        assert(result?.rows, "Result does not have rows");
        assert(Array.isArray(result?.rows), "Result rows are not valid");

        // Consolidating result and return 
        const floodlights = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            advertiserId: row.advertiser_id,
            advertiser: row.advertiser,
        }));
        return floodlights;

    } catch (error) {
        console.error(`Error while fetching user-floodlights : Error : ${error}`);
        return [];
    }

}
