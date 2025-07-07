export async function GET(request) {

    const partners = [
        { id: 1, organization_id: 1, name: "Partner-1" },
        { id: 2, organization_id: 1, name: "Partner-2" },
        { id: 3, organization_id: 1, name: "Partner-3" },
        { id: 4, organization_id: 1, name: "Partner-4" },
    ]

    return new Response(
        JSON.stringify(partners),
        {
            status: 200,
            headers: { "Content-Type" : "application/json" }
        }
    )
}

