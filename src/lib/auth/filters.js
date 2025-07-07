import assert from "assert";

export async function validateOrganization(permissions, organizationId) {
    const organizationPermissions = permissions.filter(
        (permission) => permission.split(":")?.[0] === organizationId,
    );
    if (organizationPermissions.length === 0) {
        return false, `Organization permission not found for user`;
    }

    // Returns error if any else null
    return null;
}

export async function validateAdvertisers(permissions, adertiserIds) {
    // Returns error if any else null
    return null;
}

export async function validateCampaigns(permissions, campaignIds) {
    // Returns error if any else null
    return null;
}

export async function validateInsertionOrders(permissions, insertionOrders) {
    // Returns error if any else null
    return null;
}

export async function validateLineItems(permissions, lineItems) {
    // Returns error if any else null
    return null;
}

export async function validateFilters(permissions, dataFilters) {

    // AUTH-DISABLE
    return { valid: true, errors: null };

    try {

        let error;

        // Validating orgaization
        const organizationId = dataFilters?.organizationId;
        assert(organizationId, "Organization is invalid");
        error = await validateOrganization(permissions, organizationId);
        assert(!error, "Organization is not valid");

        // Validating advertisers
        const advertiserIds = dataFilters?.advertiserIds;
        assert(advertiserIds, "Advertiser-Ids is invalid");
        assert(Array.isArray(advertiserIds), "Advertiser-Ids is not an array");
        error = await validateAdvertisers(permissions, advertiserIds);
        assert(!error, "Advertiser-Ids is not valid");

        // Validating campaigns
        const campaignIds = dataFilters?.campaignIds;
        assert(campaignIds, "Campaign-Ids is invalid");
        assert(Array.isArray(campaignIds), "Campaign-Ids is not an array");
        error = await validateCampaigns(permissions, campaignIds);
        assert(!error, "Campaign-Ids is not valid");

        // Validating insertionOrders
        const insertionOrderIds = dataFilters?.insertionOrderIds;
        assert(insertionOrderIds, "InsertionOrder-Ids is invalid");
        assert(Array.isArray(insertionOrderIds), "InsertionOrder-Ids is not an array");
        error = await validateInsertionOrders(permissions, insertionOrderIds);
        assert(!error, "InsertionOrder-Ids is not valid");

        // Validating lineItems
        const lineItemIds = dataFilters?.lineItemIds;
        assert(lineItemIds, "LineItem-Ids is invalid");
        assert(Array.isArray(lineItemIds), "LineItem-Ids is not an array");
        error = await validateLineItems(permissions, lineItemIds);
        assert(!error, "LineItem-Ids is not valid");

        return { valid: true, errors: null };

    } catch (error) {
        return { valid: false, errors: error };
    }

}
