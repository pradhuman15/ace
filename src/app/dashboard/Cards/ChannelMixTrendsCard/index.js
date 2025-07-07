import { cookies } from "next/headers"

import { userHasCardViewPermission } from "@lib/auth/cards"
import ChannelMixTrendsCards from "./Card";

export default async function ChannelMixTrendsCard() {

    const cookieStore = await cookies();
    const userHasCardPermissions = await userHasCardViewPermission(cookieStore, null);

    if (userHasCardPermissions) {
        return <ChannelMixTrendsCards />
    } else {
        return (<></>);
    }

}
