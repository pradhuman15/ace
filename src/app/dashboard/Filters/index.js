import React from "react";

import { cookies } from "next/headers";
import { getServerOrganization } from "@lib/auth/utils";
import { fetchUserAdvertisers } from "@lib/auth/advertisers";
import { fetchUserCampaigns } from "@lib/auth/campaigns";
import { fetchUserInsertionOrders } from "@lib/auth/insertion-orders";

import DashboardFiltersClient from "./FiltersClient";

export default async function DashboardFilters() {

    const cookieStore = await cookies();
    const organization = await getServerOrganization(cookieStore);

    const advertisers = await fetchUserAdvertisers(cookieStore, organization.id, null);
    const campaigns = await fetchUserCampaigns(cookieStore, organization.id, null);
    const insertionOrders = await fetchUserInsertionOrders(cookieStore, organization.id, null);

    return (
        <DashboardFiltersClient 
            advertiserList={advertisers} 
            campaignList={campaigns}
            insertionOrderList={insertionOrders}
        />
    )

}
