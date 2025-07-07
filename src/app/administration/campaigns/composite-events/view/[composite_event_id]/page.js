import React from "react"

import { cookies } from "next/headers";
import { getServerOrganization, compositeEventIsValid } from "@lib/auth/utils";
import { userHasCompositeEventView } from "@lib/auth/pages";
import { fetchCompositeEvent } from "@lib/auth/composite-events";
import { redirect } from "next/navigation";

import CampaignCompositeEventViewClient from "./CampaignCompositeEventViewClient";

export default async function CampaignCompositeEventsView({ params }) {

    const cookieStore = await cookies();
    const organization = await getServerOrganization(cookieStore);

    // Checking if user has permission to fetch access composite-event-edit page 
    const userHasCompositeEventViewPermission = await userHasCompositeEventView(cookieStore, organization.id);
    if (!userHasCompositeEventViewPermission) {
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

    return (
        <CampaignCompositeEventViewClient compositeEvent={compositeEvent} />
    )

}

