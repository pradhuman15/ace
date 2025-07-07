import { cookies } from "next/headers"

import { userHasCardViewPermission } from "@lib/auth/cards"
import FunnelCardClient from "./FunnelCardClient";

export default async function FunnelCard() {

    const cookieStore = await cookies();
    const userHasCardPermissions = await userHasCardViewPermission(cookieStore, null);

    if (userHasCardPermissions) {
        return <FunnelCardClient />
    } else {
        return (<></>);
    }

}

