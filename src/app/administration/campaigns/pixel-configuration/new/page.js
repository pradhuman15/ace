import React from "react"

import { cookies } from "next/headers";
import { getServerOrganization } from "@lib/auth/utils";
import { userHasCampaignConfigurationNew } from "@lib/auth/pages";
import { fetchUserAdvertisers } from "@lib/auth/advertisers";
import { redirect } from "next/navigation";

import CampaignPixelConfigurationNewClient from "./CampaignPixelConfigurationNewClient";

export default async function CampaignPixelConfigurationNew() {

    const cookieStore = await cookies();
    const organization = await getServerOrganization(cookieStore);

    // Checking if user has permission to fetch access composite-event-edit page 
    const userHasViewPermission = await userHasCampaignConfigurationNew(cookieStore, organization.id);
    if (!userHasViewPermission) {
        redirect("/unauthorized")
    }

    const advertisers = await fetchUserAdvertisers(cookieStore, organization.id);

    return (
        <CampaignPixelConfigurationNewClient 
            advertiserList={advertisers}
        />
    )
}


