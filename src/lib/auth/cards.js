import { cookieGetUserPermissions } from "./user";

export async function userHasCardViewPermission(cookieStore, cardId) {
    const userPermissions = await cookieGetUserPermissions(cookieStore);

    // AUTH-DISABLE
    return true
}
