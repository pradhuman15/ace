import { connectionPool } from "@db";
import { cookieGetUserPermissions } from "./user";

import assert from "assert";

export async function insertionOrdersAreValid(insertionOrderIds, advertiserId) {
    try {

        const query = `
            select 1
            from insertion_orders
            where 
                id in (${insertionOrderIds.map((_,i) => `$${i+1}`).join(", ")}) and
                advertiser_id = $${insertionOrderIds.length + 1}
        `;
        const client = await connectionPool.connect();
        const result = await client.query(query, [ ...insertionOrderIds, advertiserId ]);
        client.release();

        // Validating result
        assert(result, "Result is invalid");
        assert(result?.rows, "Result does not have rows");
        assert(Array.isArray(result?.rows), "Result rows are not valid");
        assert(result.rows.length === insertionOrderIds.length, "All insertionOrders are not accounted for");

        return true;

    } catch (error) {
        console.error(`Error validating all insertionOrders : ${error}`)
        return false;
    }
}

export async function fetchUserInsertionOrders(cookieStore, organizationId, filters) {
    const permissions = await cookieGetUserPermissions(cookieStore);
    return await fetchPermissionInsertionOrders(permissions, organizationId, filters);
}

export async function fetchPermissionInsertionOrders(permissions, organizationId, filters) {

    const organizationFilter = organizationId;

    // Handling Advertiser Filters
    const advertiserFilter = filters?.advertiserIds ?? [];
    const advertiserFilterPlaceholder = advertiserFilter
        .map((_,i) => `$${i+1}`)
        .join(",")
    const hasAdvertiserFilter = advertiserFilter.length > 0

    // Hanlding Campaign Filters
    const campaignFilter = filters?.campaignIds ?? [];
    const campaignFilterPlaceholder = campaignFilter
        .map((_,i) => `$${i+1+advertiserFilter.length}`)
        .join(",")
    const hasCampaignFilter = campaignFilter.length > 0

    const client = await connectionPool.connect();
    try {

        const query = `
            select 
                id,
                name,
                campaign_id,
                advertiser_id
            from insertion_orders
            where 
                ${hasAdvertiserFilter ? `advertiser_id in (${advertiserFilterPlaceholder}) and` : ""}
                ${hasCampaignFilter ? `campaign_id in (${campaignFilterPlaceholder}) and` : ""}
                true
        `;

        const result = await client.query(
            query,
            [
                ...advertiserFilter, 
                ...campaignFilter
            ]
        );

        // Checking result 
        assert(result, "Result is invalid");
        assert(result?.rows, "Result does not have rows");
        assert(Array.isArray(result?.rows), "Result rows are not valid");

        const insertionOrders = result.rows;
        return insertionOrders;

    } catch (error) {
        console.error(`Error fetching insertionOrders : ${error}`);
        return [];
    } finally {
        client.release();
    }

}

