import React from "react"

import { cookies } from "next/headers";
import { getServerOrganization, compositeEventIsValid } from "@lib/auth/utils";
import { userHasCompositeEventEdit } from "@lib/auth/pages";
import { fetchUserAdvertisers } from "@lib/auth/advertisers";
import { fetchCompositeEvent } from "@lib/auth/composite-events";
import { redirect } from "next/navigation";

import CampaignCompositeEventEditClient from "./CampaignCompositeEventEditClient";

export default async function CampaignCompositeEventsEdit({ params }) {

    const cookieStore = await cookies();
    const organization = await getServerOrganization(cookieStore);

    // Checking if user has permission to fetch access composite-event-edit page 
    const userHasCompositeEventEditPermission = await userHasCompositeEventEdit(cookieStore, organization.id);
    if (!userHasCompositeEventEditPermission) {
        redirect("/unauthorized")
    }

    // Checking if composite-event-id is valid
    const parameters = await params;
    const compositeEventId = parameters.composite_event_id;
    const eventIdIsValid = await compositeEventIsValid(compositeEventId);
    if (!eventIdIsValid) {
        redirect("/unauthorized");
    }

    // Fetching composite-event
    const compositeEvent = await fetchCompositeEvent(organization.id, compositeEventId);
    if (!compositeEvent) {
        redirect("/unauthorized");
    }

    const advertisers = await fetchUserAdvertisers(cookieStore, organization.id);

    return (
        <CampaignCompositeEventEditClient 
            compositeEvent={compositeEvent} 
            advertiserList={advertisers}
        />
    )

}


