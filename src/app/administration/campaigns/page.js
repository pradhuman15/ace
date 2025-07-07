import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getServerOrganization } from "@lib/auth/utils";
import { userHasCampaignConfigView } from "@/lib/auth/pages";

import CampaignAdminPageClient from "./CampaignAdminPageClient";

export default async function CampaignAdminPage() {

    // Check if user has permission to view user-admin dashboard
    const cookieStore = await cookies();
    const organization = await getServerOrganization(cookieStore);
    const canViewCampaignConfig = await userHasCampaignConfigView(cookieStore, organization.id);

    if (!canViewCampaignConfig) {
        redirect("/unauthorized");
    }

    return <CampaignAdminPageClient />

}
