import { connectionPool } from "@db";

export async function getServerOrganization(cookieStore) {

    // AUTH-DISABLE
    return {
        id: "8c15c83a-683e-4577-8fe1-17dd63cbea0b",
        name: "Test-Organization-YP"
    }

    const organizationToken = cookieStore.get("__Secure-org-token")?.value ?? "";
    if (organizationToken) {
        const organization = JSON.parse(atob(organizationToken));
        return organization;
    } else {
        return null;
    }
}

export async function organizationIsValid(organizationId) {

    // AUTH-DISABLE
    return true;

    try {
        const query = `select id, name from organizations where id = $1`;
        const client = await connectionPool.connect();
        const result = await client.query(query, [organizationId]);
        client.release();

        if (
            result &&
                result?.rows &&
                Array.isArray(result.rows) &&
                result.rows.length > 0
        ) {
            return true;
        }
    } catch (error) {
        console.error(`Error while fetching organization-details`);
        return false;
    }

    return false;
}

export async function compositeEventIsValid(compositeEventId) {
    try {
        const query = `select 1 from composite_events where id = $1`;
        const client = await connectionPool.connect();
        const result = await client.query(query, [compositeEventId]);
        client.release();

        if (
            result &&
                result?.rows &&
                Array.isArray(result.rows) &&
                result.rows.length > 0
        ) {
            return true;
        }
    } catch (error) {
        console.error(`Error while verifying composite-events : Error : ${error}`);
        return false;
    }
}

export async function campaignIsValid(campaignId) {
    try {
        const query = `select 1 from campaigns where id = $1`;
        const client = await connectionPool.connect();
        const result = await client.query(query, [campaignId]);
        client.release();

        if (
            result &&
                result?.rows &&
                Array.isArray(result.rows) &&
                result.rows.length > 0
        ) {
            return true;
        }
    } catch (error) {
        console.error(`Error while verifying composite-events : Error : ${error}`);
        return false;
    }
}
