import React from "react";

import { cookies } from "next/headers";
import { getServerOrganization, compositeEventIsValid } from "@lib/auth/utils";
import { userHasCompositeEventNew } from "@lib/auth/pages";
import { fetchUserAdvertisers } from "@lib/auth/advertisers";
import { fetchCompositeEvent } from "@lib/auth/composite-events";
import { redirect } from "next/navigation";

import CampaignCompositeEventNewClient from "./CampaignCompositeEventNewClient";

export default async function CampaignCompositeEventNew() {

    const cookieStore = await cookies();
    const organization = await getServerOrganization(cookieStore);

    // Checking if user has permission to fetch access composite-event-edit page 
    const userHasCompositeEventNewPermission = await userHasCompositeEventNew(cookieStore, organization.id);
    if (!userHasCompositeEventNewPermission) {
        redirect("/unauthorized")
    }

    const advertisers = await fetchUserAdvertisers(cookieStore, organization.id);

    return (
        <CampaignCompositeEventNewClient 
            advertiserList={advertisers}
        />
    )
}
