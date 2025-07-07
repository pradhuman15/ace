import React from "react"

import { cookies } from "next/headers";
import { getServerOrganization, campaignIsValid } from "@lib/auth/utils";
import { userHasCampaignConfigurationEdit } from "@lib/auth/pages";
import { fetchPixelConfiguration } from "@lib/auth/pixel-configurations";
import { fetchCompositeEvents } from "@lib/auth/composite-events";
import { fetchFloodlights } from "@lib/auth/floodlights";
import { redirect } from "next/navigation";

import CampaignPixelConfigurationEditClient from "./CampaignPixelConfigurationEditClient";

export default async function CampaignPixelConfigurationEdit({ params }) {

    const cookieStore = await cookies();
    const organization = await getServerOrganization(cookieStore);

    // Checking if user has permission to fetch access composite-event-edit page 
    const userHasViewPermission = await userHasCampaignConfigurationEdit(
        cookieStore,
        organization.id
    );
    if (!userHasViewPermission) {
        redirect("/unauthorized")
    }

    // Checking if composite-event-id is valid
    const parameters = await params;
    const campaignId = parameters.campaign_id;
    const eventIdIsValid = await campaignIsValid(campaignId);
    if (!eventIdIsValid) {
        redirect("/unauthorized");
    }

    // Fetching composite-event
    const pixelConfig = await fetchPixelConfiguration(organization.id, campaignId);
    if (!pixelConfig) {
        redirect("/unauthorized");
    }

    const compositeEvents = await fetchCompositeEvents(organization.id, pixelConfig.advertiser.id);
    const floodlights = await fetchFloodlights(organization.id, pixelConfig.advertiser.id);

    return (
        <CampaignPixelConfigurationEditClient 
            pixelConfig={pixelConfig} 
            compositeEvents={compositeEvents}
            floodlights={floodlights}
        />
    )
}

