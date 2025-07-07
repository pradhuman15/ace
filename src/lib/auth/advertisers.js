import { connectionPool } from "@db"
import { cookieGetUserPermissions } from "./user";

import assert from "assert";

export async function advertisersAreValid(advertiserIds) {

    try {
        const query = `
            select 1
            from advertisers
            where 
                id in (${advertiserIds.map((_,i) => `$${i+1}`).join(", ")})
        `;
        const client = await connectionPool.connect();
        const result = await client.query(query, advertiserIds);
        client.release();

        if (
            result &&
            result?.rows &&
            Array.isArray(result.rows) &&
            result.rows.length === advertiserIds.length
        ) {
            return true;
        }
    } catch (error) {
        return false;
    }

    return true;

}

export async function fetchUserAdvertisers(cookieStore, organizationId, filters) {
    const permissions = await cookieGetUserPermissions(cookieStore);
    return await fetchPermissionAdvertisers(permissions, organizationId, filters);
}

// Key thing to remember while configuring these permissions is that 
// permissions can at most go to the granularity of advertisers and not beyond that
// Hence, we need to only check for organization and advertiser 
// -- In advertiser endpoint we dont have to look into hierarchies too much either 
export async function fetchPermissionAdvertisers(permissions, organizationId, filters) {

    // Extracting organization-permissions
    const organizationPermissions = permissions.filter(
        permission => ( permission?.split(":")?.[0] ?? "" ) === organizationId
    );

    // Extracting partner-permissions
    const permissionPartners = organizationPermissions
        .filter(permission => ( permission?.split(":")?.[2] ?? "" ) === "partner")
        .map(permission => ( permission?.split(":")?.[2] ?? "" ))
    const partnerPlaceholders = permissionPartners.map((_,i) => `$${i+1}`);


    // Extracting advertiser-perissions
    const permissionAdvertisers = organizationPermissions
        .filter(permission => ( permission?.split(":")?.[1] ?? "" ) === "advertiser")
        .map(permission => ( permission?.split(":")?.[2] ?? "" ))
    const advertiserPlaceholders = permissionPartners.map((_,i) => `$${i+1+permissionPartners.length}`);


    // Constructing where clause that is applied to the query
    const clauses = [];
    if (permissionPartners.length > 0) {
        clauses.push(`partners.id in (${partnerPlaceholders.join(",")})`);
    }
    if (permissionAdvertisers.length > 0) {
        clauses.push(`advertisers.id in (${advertiserPlaceholders.join(",")})`);
    }
    const clauseString = `and (${clauses.join(" or ")})`;

    try {

        const query = `
            select
                advertisers.id,
                advertisers.name
            from advertisers
            left join partners
                on advertisers.partner_id = partners.id
            left join organization_partners
                on partners.id = organization_partners.partner_id
            where 
                organization_partners.organization_id = $1
                ${ clauses.length === 0 ? "" : clauseString}
        `;
        const client = await connectionPool.connect();
        const result = await client.query(
            query,
            [ 
                organizationId,
                ...permissionPartners,
                ...permissionAdvertisers 
            ]
        );
        client.release();

        // Checking result 
        assert(result, "Result is invalid");
        assert(result?.rows, "Result does not have rows");
        assert(Array.isArray(result?.rows), "Result rows are not valid");

        const advertisers = result.rows.map(row => ({ id: row.id, name: row.name }))
        return advertisers;

    } catch (error) {
        console.error(`Error while fetching user-advertisers : organizationId : ${organizationId}`)
        return [];
    }


}
