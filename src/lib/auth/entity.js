import { connectionPool } from "@db";
import { cookieGetUserPermissions } from "./user";

export async function fetchPartners(permissions, organizationId) {
    const organizationPermissions = permissions.filter(
        (permission) => (permission?.split(":")?.[0] ?? "") === organizationId,
    );

    // Extracting partner-permissions
    const permissionPartners = organizationPermissions
    .filter((permission) => (permission?.split(":")?.[2] ?? "") === "partner")
    .map((permission) => permission?.split(":")?.[2] ?? "");
    const partnerPlaceholders = permissionPartners.map((_, i) => `$${i + 1}`);

    // Constructing where clause that is applied to the query
    const clauses = [];
    if (permissionPartners.length > 0) {
        clauses.push(`partners.id in (${partnerPlaceholders.join(",")})`);
    }
    const clauseString = `and (${clauses.join(" or ")})`;

    const query = `
        select partner.id, partner.name
        from organization_partners 
        left join partners
            on organization_partners.partner_id = partners.id
        where 
            organization_partners.organization_id = $1
        ${clauses.length === 0 ? "" : clauseString}
    `;
    const client = await connectionPool.connect();
    const result = client.query(query, [organizationId, ...partnerPlaceholders]);
    connectionPool.release();

    if (result && result.rows && Array.isArray(result.rows)) {
        return result.rows.map((partner) => ({
            id: partner.id,
            name: partner.name,
        }));
    }

    return [];
}

export async function fetchAdvertisers(organizationId, partnerId) {
    const client = await connectionPool.connect();
    let result;

    if (organizationId && partnerId) {
        const query = `
            select advertiser.id, advertiser.name
            from organization_partners 
            left join advertisers
                on organization_partners.partner_id = advertisers.partner_id
            where
                organization_partners.organization_id = $1 and
                organization_partners.partner_id = $2
        `;
        result = client.query(query, [organizationId, partnerId]);
        client.release();
    } else if (organizationId && !partnerId) {
        const query = `
            select advertiser.id, advertiser.name
            from organization_partners 
            left join advertisers
                on organization_partners.partner_id = advertisers.partner_id
            where
                organization_partners.organization_id = $1
        `;
        result = client.query(query, [organizationId]);
        client.release();
    } else {
        console.error(`fetchAdvertisers: organizationId not found`);
        return [];
    }

    if (result && result.rows && Array.isArray(result.rows)) {
        return result.rows.map((advertiser) => ({
            id: advertiser.id,
            name: advertiser.name,
        }));
    }

    return [];
}
