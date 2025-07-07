import { connectionPool } from "@db"
import { validateAdvertisers } from "@lib/auth/filters"

export async function POST(request) {

    // Extracting user-permissions
    // -- Extracting the organizations the user has permission on
    const permissionString = request.headers.get("x-user-permissions");
    const permissions = permissionString?.split(",") ?? [];

    // Extracting request-body
    const requestJSON = await request.json();
    const advertiserIds = requestJSON?.advertiserIds ?? null;

    // Check validity of advertisers we are trying to fetch data for
    let valid, errors;
    valid, errors = await validateAdvertisers(permissions, advertiserIds);
    if (errors) {
        console.error(`Filters are not valid : Errors : ${errors.join(", ")}`);
        return new Response(
            JSON.stringify({ "error" : "fitlers are invalid" }),
            { status: 400 }
        )
    }

    let campaignPixelConfig = [];
    try {
        let result;
        const client = await connectionPool.connect();

        if (advertiserIds.length > 0) {
            const placeholders = advertiserIds.map((_, i) => `$${i+1}`).join(", ");
            const query = `
                with 

                    consolidated_conversion_data as (
                        select 
                            campaigns.advertiser_id,
                            advertisers.name as advertiser,
                            campaign_composite_event_rankings.campaign_id,
                            campaigns.name as campaign,
                            composite_events.name as conversion,
                            composite_events.id::text as conversion_id,
                            campaign_composite_event_rankings.rank_order,
                            campaign_composite_event_rankings.pc_window,
                            campaign_composite_event_rankings.pv_window
                        from campaign_composite_event_rankings
                        left join campaigns
                        on campaign_composite_event_rankings.campaign_id = campaigns.id
                        left join advertisers
                        on campaigns.advertiser_id = advertisers.id
                        left join composite_events
                        on campaign_composite_event_rankings.composite_event_id = composite_events.id
                        
                        union all
                        
                        select 
                            campaigns.advertiser_id,
                            advertisers.name as advertiser,
                            campaign_floodlight_rankings.campaign_id,
                            campaigns.name as campaign,
                            floodlights.name as conversion,
                            floodlights.id::text as conversion_id,
                            campaign_floodlight_rankings.rank_order,
                            campaign_floodlight_rankings.pc_window,
                            campaign_floodlight_rankings.pv_window
                        from campaign_floodlight_rankings
                        left join campaigns
                        on campaign_floodlight_rankings.campaign_id = campaigns.id
                        left join advertisers
                        on campaigns.advertiser_id = advertisers.id
                        left join floodlights
                        on 
                            campaign_floodlight_rankings.floodlight_id = floodlights.id and 
                            campaigns.advertiser_id = floodlights.advertiser_id
                    )

                select 
                    advertiser_id,
                    advertiser,
                    campaign_id,
                    campaign,
                    conversion,
                    conversion_id,
                    rank_order,
                    pc_window,
                    pv_window
                from consolidated_conversion_data
                where advertiser_id in (${placeholders})
                order by campaign_id, rank_order
            `;
            result = await client.query(query, advertiserIds);
            client.release();
        } else {
            const query = `
                with 

                    consolidated_conversion_data as (
                        select 
                            campaigns.advertiser_id,
                            advertisers.name as advertiser,
                            campaign_composite_event_rankings.campaign_id,
                            campaigns.name as campaign,
                            composite_events.name as conversion,
                            composite_events.id::text as conversion_id,
                            campaign_composite_event_rankings.rank_order,
                            campaign_composite_event_rankings.pc_window,
                            campaign_composite_event_rankings.pv_window
                        from campaign_composite_event_rankings
                        left join campaigns
                        on campaign_composite_event_rankings.campaign_id = campaigns.id
                        left join advertisers
                        on campaigns.advertiser_id = advertisers.id
                        left join composite_events
                        on campaign_composite_event_rankings.composite_event_id = composite_events.id
                        
                        union all
                        
                        select 
                            campaigns.advertiser_id,
                            advertisers.name as advertiser,
                            campaign_floodlight_rankings.campaign_id,
                            campaigns.name as campaign,
                            floodlights.name as conversion,
                            floodlights.id::text as conversion_id,
                            campaign_floodlight_rankings.rank_order,
                            campaign_floodlight_rankings.pc_window,
                            campaign_floodlight_rankings.pv_window
                        from campaign_floodlight_rankings
                        left join campaigns
                        on campaign_floodlight_rankings.campaign_id = campaigns.id
                        left join advertisers
                        on campaigns.advertiser_id = advertisers.id
                        left join floodlights
                        on 
                            campaign_floodlight_rankings.floodlight_id = floodlights.id and 
                            campaigns.advertiser_id = floodlights.advertiser_id
                    )

                select 
                    advertiser_id,
                    advertiser,
                    campaign_id,
                    campaign,
                    conversion,
                    conversion_id,
                    rank_order,
                    pc_window,
                    pv_window
                from consolidated_conversion_data
                order by campaign_id, rank_order
            `;
            result = await client.query(query);
            client.release();
        }
        if (
            result &&
            result?.rows &&
            Array.isArray(result?.rows)
        ) {
            campaignPixelConfig = result.rows.map(row => ({
                id: row.campaign_id,
                name: row.campaign,
                advertiserId: row.advertiser_id,
                advertiser: row.advertiser,
                conversionId: row.conversion_id,
                conversion: row.conversion,
                rank: row.rank_order,
                pcWindow: row.pc_window,
                pvWindow: row.pv_window,
            }));
        } else {
            const errorMessage = `Error : Invalid data from database : ${result}`
            console.error(errorMessage)
            throw new Error(errorMessage)
        }

    } catch (error) {
        console.error(`Error while fetching composite-events : ${error}`);
        return new Response(
            JSON.stringify({ "error": "Internal Error" }),
            { status: 500 }
        );
    }

    return new Response(
        JSON.stringify(campaignPixelConfig),
        {
            status: 200,
            headers: { "Content-Type" : "application/json" }
        }
    );

}
