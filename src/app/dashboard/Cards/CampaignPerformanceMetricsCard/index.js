import { cookies } from "next/headers"

import { userHasCardViewPermission } from "@lib/auth/cards"
import CampaignPerformanceMetricsCardClient from "./CampaignPerformanceMetricsCardClient";

export default async function CampaignPerformanceMetricsCard() {

    const cookieStore = await cookies();
    const userHasCardPermissions = await userHasCardViewPermission(cookieStore, null);

    if (userHasCardPermissions) {
        return <CampaignPerformanceMetricsCardClient />
    } else {
        return (<></>);
    }

}
