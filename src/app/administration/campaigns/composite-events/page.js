import React from "react"

import { cookies } from "next/headers";
import { getServerOrganization } from "@lib/auth/utils";
import { fetchUserAdvertisers } from "@lib/auth/advertisers";
import { fetchPermissionCompositeEvents } from "@lib/auth/composite-events";
import { cookieGetUserPermissions } from "@lib/auth/user";

import CampaignCompositeEventClient from "./CampaignCompositeEventClient"

export default async function CampaignCompositeEvents() {

    const cookieStore = await cookies();
    const organization = await getServerOrganization(cookieStore);
    const advertisers = await fetchUserAdvertisers(cookieStore, organization.id);

    const permissions = await cookieGetUserPermissions(cookieStore)
    const compositeEvents = await fetchPermissionCompositeEvents(permissions, organization.id, null);

    return (
        <CampaignCompositeEventClient 
            advertiserList={advertisers} 
            events={compositeEvents}
        />
    )

}
