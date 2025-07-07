import React from "react"

import { cookies } from "next/headers";
import { getServerOrganization, campaignIsValid } from "@lib/auth/utils";
import { userHasCampaignConfigurationView } from "@lib/auth/pages";
import { fetchPixelConfiguration } from "@lib/auth/pixel-configurations";
import { redirect } from "next/navigation";

import CampaignPixelConfigurationsViewClient from "./CampaignPixelConfigurationsViewClient";

export default async function CampaignPixelConfigurationsView({ params }) {

    const cookieStore = await cookies();
    const organization = await getServerOrganization(cookieStore);

    // Checking if user has permission to fetch access composite-event-edit page 
    const userHasViewPermission = await userHasCampaignConfigurationView(
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

    return (
        <CampaignPixelConfigurationsViewClient pixelConfig={pixelConfig} />
    )

}


