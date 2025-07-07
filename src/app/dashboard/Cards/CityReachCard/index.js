import { cookies } from "next/headers"

import { userHasCardViewPermission } from "@lib/auth/cards"
import RegionCityReachData from "./cityReach";

export default async function CreativeAnalysisCard() {

    const cookieStore = await cookies();
    const userHasCardPermissions = await userHasCardViewPermission(cookieStore, null);

    if (userHasCardPermissions) {
        return <RegionCityReachData />
    } else {
        return (<></>);
    }

}
