import { connectionPool } from "@db";
import { cookieGetUserPermissions } from "./user";

import assert from "assert";

export async function campaignsAreValid(campaignIds, advertiserId) {
    try {

        const query = `
            select 1
            from campaigns
            where 
                id in (${campaignIds.map((_,i) => `$${i+1}`).join(", ")}) and
                advertiser_id = $${campaignIds.length + 1}
        `;
        const client = await connectionPool.connect();
        const result = await client.query(query, [ ...campaignIds, advertiserId ]);
        client.release();

        // Validating result
        assert(result, "Result is invalid");
        assert(result?.rows, "Result does not have rows");
        assert(Array.isArray(result?.rows), "Result rows are not valid");
        assert(result.rows.length === campaignIds.length, "All campaigns are not accounted for");

        return true;

    } catch (error) {
        console.error(`Error validating all campaigns : ${error}`)
        return false;
    }
}

export async function fetchUserCampaigns(cookieStore, organizationId, filters) {
    const permissions = await cookieGetUserPermissions(cookieStore);
    return await fetchPermissionCampaigns(permissions, organizationId, filters);
}

export async function fetchPermissionCampaigns(permissions, organizationId, filters) {

    const organizationFilter = organizationId;

    // Handling Advertiser Filters
    const advertiserFilter = filters?.advertiserIds ?? [];
    const advertiserFilterPlaceholder = advertiserFilter
        .map((_,i) => `$${i+1}`)
        .join(",")
    const hasAdvertiserFilter = advertiserFilter.length > 0

    const client = await connectionPool.connect();
    try {

        const query = `
            select 
                id,
                name,
                advertiser_id
            from campaigns
            where 
                ${hasAdvertiserFilter ? `advertiser_id in (${advertiserFilterPlaceholder}) and` : ""}
                true
        `;
        const result = await client.query(query, [...advertiserFilter]);

        // Checking result 
        assert(result, "Result is invalid");
        assert(result?.rows, "Result does not have rows");
        assert(Array.isArray(result?.rows), "Result rows are not valid");

        const campaigns = result.rows;
        return campaigns;

    } catch (error) {
        console.error(`Error fetching campaigns : ${error}`);
        return [];
    } finally {
        client.release();
    }

}
