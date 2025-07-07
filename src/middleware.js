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

// TODO: decrypt credentials
// TODO: check for organization parameter
// TODO: check organization paramter matches with user permissions
// TODO: forward permissions which are appliicable
export async function middleware(req) {
    // Create response object at the beginning
    const response = NextResponse.next();

    const { pathname } = req.nextUrl;
    if (pathname.startsWith("/api/auth")) {
        return NextResponse.next();
    }

    // AUTH-DISABLE - Commented out to fix request scope errors
    // const disableCheckHeaders = new Headers(req.headers);
    // disableCheckHeaders.set("x-user-permissions", "");
    // disableCheckHeaders.set("x-organization", "8c15c83a-683e-4577-8fe1-17dd63cbea0b");
    // return NextResponse.next({ headers: disableCheckHeaders });

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

    // Validate organization paramter that has to be sent with every request
    let organizationCookie, organizationData, organizationId;
    try {
        organizationCookie = req.cookies.get("__Secure-org-token")?.value ?? null;
        organizationData = JSON.parse(atob(organizationCookie))
        organizationId = organizationData?.id ?? null;
        if (!organizationId) {
            console.error(`${pathname} : Invalid value in organization-cookie`);
            return redirectToInvalid(req);
        }
    } catch (error) {
        console.error(`${pathname} : Error while extracting cookie : invalid-cookie : ${error}`);
        // Clear the malformed cookie to prevent repeated errors
        const invalidResponse = redirectToInvalid(req);
        invalidResponse.cookies.delete("__Secure-org-token");
        return invalidResponse;
    }


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

}

export const config = {
    matcher: [
        '/api/:path*',
        '/',
        '/dashboard/:path*',
        '/administration/:path*',
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ]
};

// decrypts cookie to check credentials
// if organization parameter fails to match with permissions from decrypted cookie then 401 is sent.
// helps to validate filter-object that shall be used to fetch filtered data while constructing cards.
// filter permissions from all permissions to only permissions the user has for the current organization
// then only the permission 1_advertiser_123_viewer is sent forward because for processing of the request other permission is not necessary.