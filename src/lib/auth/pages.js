import { cookieGetUserPermissions } from "./user";

export async function userHasUserSettingsView(cookieStore, organizationId) {

    // AUTH-DISABLE
    return true;

    try {
        const requiredPermission = `${organizationId}:organization:${organizationId}:admin`;
        const userPermissions = await cookieGetUserPermissions(cookieStore);
        return userPermissions.some(permission => permission === requiredPermission)
    } catch (error) {
        console.error(`Error while verifying org-admin permissions : org : ${organizationId}`);
        return false;
    }
}

export async function userHasCampaignConfigView(cookieStore, organizationId) {

    // AUTH-DISABLE
    return true;

    try {
        const orgAdminPermission = `${organizationId}:organization:${organizationId}:admin`;
        const advertiserAdminPermission = new RegExp(`${organizationId}:advertiser:\d+:admin`);
        const advertiserEditPermission = new RegExp(`${organizationId}:advertiser:\d+:editor`);
        const userPermissions = await cookieGetUserPermissions(cookieStore);
        return userPermissions.some(
            permission => (
                permission === orgAdminPermission ||
                advertiserAdminPermission.test(permission) ||
                advertiserEditPermission.test(permission)
            )
        )
    } catch (error) {
        console.error(`Error while verifying org-admin permissions : org : ${organizationId}`);
        return false;
    }
}

export async function userHasDashboardView(cookieStore, organizationId) {

    // AUTH-DISABLE
    return true;

    try{
        const userPermissions = await cookieGetUserPermissions(cookieStore);
        const organizationPermissions = userPermissions.filter(
            permission => (permission.split(":")?.[0] ?? "") === organizationId
        );
        return organizationPermissions.length > 0
    } catch (error) {
        console.error(`Error while verifying dashboard-view permissions : org : ${organizationId}`);
        return false;
    }
}

export async function userHasCompositeEventEdit(cookieStore, organizationId) {
    return await userHasCampaignConfigView(cookieStore, organizationId);
}

export async function userHasCompositeEventView(cookieStore, organizationId) {
    return await userHasCampaignConfigView(cookieStore, organizationId);
}

export async function userHasCompositeEventNew(cookieStore, organizationId) {
    return await userHasCampaignConfigView(cookieStore, organizationId);
}

export async function userHasCampaignConfigurationEdit(cookieStore, organizationId) {
    return await userHasCampaignConfigView(cookieStore, organizationId);
}

export async function userHasCampaignConfigurationView(cookieStore, organizationId) {
    return await userHasCampaignConfigView(cookieStore, organizationId);
}

export async function userHasCampaignConfigurationNew(cookieStore, organizationId) {
    return await userHasCampaignConfigView(cookieStore, organizationId);
}
