import React from "react"

import { cookies } from "next/headers";
import { getServerOrganization } from "@lib/auth/utils";
import { fetchUserAdvertisers } from "@lib/auth/advertisers";
import { cookieGetUserPermissions } from "@lib/auth/user";

import CampaignPixelConfigClient from "./CampaignPixelConfigClient"

export default async function CampaignCompositeEvents() {

    const cookieStore = await cookies();
    const organization = await getServerOrganization(cookieStore);
    const advertisers = await fetchUserAdvertisers(cookieStore, organization.id);

    const permissions = await cookieGetUserPermissions(cookieStore)

    return (
        <CampaignPixelConfigClient 
            advertiserList={advertisers} 
            configs={[]}
        />
    )

}

