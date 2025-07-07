import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PROTECTED_PATHS = [ "/administration" ];

const redirectToInvalid = (req) => {
    const url = req.nextUrl.clone();
    url.pathname = "/invalid";
    return NextResponse.redirect(url);
}

const redirectToUnauthorized = (req) => {
    const url = req.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
}

// Hardcoded organization data to bypass cookie issues
const HARDCODED_ORGANIZATION = {
    id: "8c15c83a-683e-4577-8fe1-17dd63cbea0b",
    name: "Test-Organization-YP"
};

export async function middleware(req) {
    const { pathname } = req.nextUrl;
    
    if (pathname.startsWith("/api/auth")) {
        return NextResponse.next();
    }

    // AUTH-DISABLE - Use hardcoded organization data
    const disableCheckHeaders = new Headers(req.headers);
    disableCheckHeaders.set("x-user-permissions", "");
    disableCheckHeaders.set("x-organization", HARDCODED_ORGANIZATION.id);
    return NextResponse.next({ headers: disableCheckHeaders });

    // The rest of the middleware code is commented out since we're using hardcoded values
    /*
    if (
        pathname.startsWith("/api/organizations") ||
        pathname.startsWith("/api/set/organization")
    ) {

        // Decrypt token and check permissions
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        const permissions = token.permissions;
        if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
            console.error(`${pathname} : permissions-not-found`);
            return redirectToUnauthorized(req);
        }

        const newHeaders = new Headers(req.headers);
        newHeaders.set("x-user-permissions", permissions.join(","));
        return NextResponse.next({ headers: newHeaders });

    }

    // Use hardcoded organization instead of cookie parsing
    const organizationId = HARDCODED_ORGANIZATION.id;

    // Decrypt token and check permissions
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const permissions = token.permissions;
    if (!permissions || !Array.isArray(permissions)) {
        console.error(`${pathname} : permissions-not-found`);
        return redirectToUnauthorized(req);
    }

    // Checking permissions
    const validPermissions = permissions.filter(permission => {
        const permissionOrganization = permission?.split(":")?.[0] ?? "";
        return permissionOrganization === organizationId
    });
    if (validPermissions.length === 0) {
        console.error(`${pathname} : no-valid-permissions`);
        return redirectToUnauthorized(req);
    }

    const newHeaders = new Headers(req.headers);
    newHeaders.set("x-user-permissions", validPermissions.join(","));
    newHeaders.set("x-organization", organizationId);
    return NextResponse.next({ headers: newHeaders });
    */
}

export const config = {
    matcher: [
        '/api/:path*',
    ]
};