import { connectionPool } from "@db";
import { decode, getToken } from 'next-auth/jwt';

export async function cookieGetUserPermissions(cookieStore) {

    const sessionToken = cookieStore.get("__Secure-next-auth.session-token")?.value ?? "";
    const token = await decode({
        token: sessionToken,
        secret: process.env.NEXTAUTH_SECRET
    })

    if (
        (!token || !token.email || !token.permissions) ||
        (!Array.isArray(token.permissions) && token.permissions.length === 0)
    ) {
        return [];
    }

    return token.permissions;

}

export async function dbCheckUserExists(email)  {

    // AUTH-DISABLE
    return true;

    try {
        const query = `
            select 1 as exists
            from users
            where users.email = $1
        `
        const client = await connectionPool.connect();
        const result = await client.query(query, [email]);
        client.release();

        if (
            result &&
            result.rows &&
            Array.isArray(result.rows) &&
            result.rows.length > 0
        ) {
            return true;
        }

        return false;

    } catch (error) {
        console.error(`Error fetch permissions for email : ${email} : ${error}`);
        return false;
    }

}

export async function dbGetUserPermissions(email) {

    let userPermissions = [];
    let userId = "";

    // AUTH-DISABLE
    return userPermissions;

    try {
        const query = `
            select 
                users.id as user_id,
                roles.organizations_id,
                roles.resource_type,
                roles.resource_id,
                roles.access_level
            from users
            left join user_roles
                on users.id = user_roles.user_id
            left join roles
                on user_roles.role_id = roles.id
            where
                users.email = $1;
        `;

        const client = await connectionPool.connect(); 
        const result = await client.query(query, [email]);
        client.release();

        if (
            result &&
            result?.rows &&
            Array.isArray(result.rows)
        ) {
            userPermissions = result.rows.map(permission => {
                const organization = permission.organizations_id;
                const resourceType = permission.resource_type;
                const resourceId = permission.resource_id;
                const accessLevel = permission.access_level;
                return `${organization}:${resourceType}:${resourceId}:${accessLevel}`;
            });

            const uniqueUserIds = new Set(result.rows.map(userPermission => userPermission.user_id))
            if (uniqueUserIds.size !== 1) {
                throw Error(`Unique User-ID not found for email : ${email}`);
            }

            userId = [ ...uniqueUserIds ][0];

        }
        return userPermissions;

    } catch (error) {
        console.error(`Error fetch permissions for email : ${email} : ${error}`);
        return userPermissions;
    }

};
