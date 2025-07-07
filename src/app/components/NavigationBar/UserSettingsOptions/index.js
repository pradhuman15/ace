import { cookies } from "next/headers";
import { getServerOrganization } from "@lib/auth/utils";
import { userHasUserSettingsView, userHasCampaignConfigView } from "@lib/auth/pages";
import UserSettingsOptionsClient from "./UserSettingsOptionsClient"
import { getServerSession } from "next-auth";

export default async function UserSettingsOption() {

    const session = await getServerSession();
    const cookieStore = await cookies();
    const organization = await getServerOrganization(cookieStore);

    let canViewUserSettings, canViewCampaignConfig;
    if (organization) {
        canViewUserSettings = await userHasUserSettingsView(cookieStore, organization.id);
        canViewCampaignConfig = await userHasCampaignConfigView(cookieStore, organization.id);
    } else {
        canViewUserSettings = false;
        canViewCampaignConfig = false;
    }

    return (
        <UserSettingsOptionsClient
            authenticated={!!session}
            canViewUserSettings={canViewUserSettings}
            canViewCampaignConfig={canViewCampaignConfig}
        />
    ) 

}
