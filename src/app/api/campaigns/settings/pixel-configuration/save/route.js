import { 
    savePixelConfiguration
} from "@lib/auth/pixel-configurations";

export async function POST(request) {

    // Extracting user-permissions
    // -- Extracting the organizations the user has permission on
    const permissionString = request.headers.get("x-user-permissions");
    const permissions = permissionString?.split(",") ?? [];

    // Extracting request-body
    const requestJSON = await request.json();
    const pixelConfiguration = requestJSON?.pixelConfiguration;

    let {config, error } = await savePixelConfiguration(permissions, pixelConfiguration);
    if (error) {
        return new Response(
            JSON.stringify({ "error" : "error saving pixel-configuration to database" }),
            { status: 500 }
        )
    } else {
        return new Response(
            JSON.stringify({ pixelConiguration : config }),
            { 
                status:200,
                headers: { "Content-Type" : "application/json" }
            }
        );
    }

}
