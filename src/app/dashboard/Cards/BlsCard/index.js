import { cookies } from "next/headers"

import { userHasCardViewPermission } from "@lib/auth/cards"
import Bls_Card from "./bls";

export default async function CreativeAnalysisCard() {

    const cookieStore = await cookies();
    const userHasCardPermissions = await userHasCardViewPermission(cookieStore, null);

    if (userHasCardPermissions) {
        return <Bls_Card />
    } else {
        return (<></>);
    }

}
