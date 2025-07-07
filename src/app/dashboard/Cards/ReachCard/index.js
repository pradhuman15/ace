import { cookies } from "next/headers"

import { userHasCardViewPermission } from "@lib/auth/cards"
import ReachCardClient from "./ReachCardClient";

export default async function ReachCard() {

    const cookieStore = await cookies();
    const userHasCardPermissions = await userHasCardViewPermission(cookieStore, null);

    if (userHasCardPermissions) {
        return <ReachCardClient />
    } else {
        return (<></>);
    }

}


