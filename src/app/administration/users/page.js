import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getServerOrganization } from "@lib/auth/utils";
import { userHasUserSettingsView } from "@/lib/auth/pages";

import NewUserPageClient from "./UserPageClient";

export default async function NewUserPage() {

    // Check if user has permission to view user-admin dashboard
    const cookieStore = await cookies();
    const organization = await getServerOrganization(cookieStore);
    const canViewUserAdminstration = await userHasUserSettingsView(cookieStore, organization.id);

    if (!canViewUserAdminstration) {
        redirect("/unauthorized");
    }

    return <NewUserPageClient />

}
