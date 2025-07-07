import { connectionPool } from "@db";

import assert from "assert";

export async function getCampaignConversions(campaignId, dataFilters) {

    const filters = [];
    if (
        dataFilters?.advertiserIds &&
        dataFilters.advertiserIds.length > 0
    ) {
        // Setting up placeholder to place within the query
        // -- +2 because the first place-holder will be campaignId
        const placeholders = dataFilters.advertiserIds.map((_,i) => `$${i+2}`);
        filters.push(`advertiser_id in (${placeholders.join(", ")})`);
    }
    const filterString = filters.join(" and ");

    try {
        const query = `
            with 

                combined_data as (
                    select 
                        campaigns.advertiser_id,
                        ranking.campaign_id,
                        concat(floodlights.name, ' (', ranking.floodlight_id, ')') as name,
                        ranking.floodlight_id,
                        ranking.rank_order,
                        ranking.pc_window,
                        ranking.pv_window
                    from campaign_floodlight_rankings as ranking
                    left join campaigns 
                        on ranking.campaign_id = campaigns.id 
                    left join floodlights 
                    on 
                        ranking.floodlight_id = floodlights.id and
                        campaigns.advertiser_id = floodlights.advertiser_id 
                        
                    union all 
                    
                    select 
                        campaigns.advertiser_id,
                        ranking.campaign_id,
                        composite_events.name as name,
                        components.floodlight_id,
                        ranking.rank_order,
                        ranking.pc_window,
                        ranking.pv_window
                    from campaign_composite_event_rankings as ranking
                    left join campaigns 
                        on ranking.campaign_id = campaigns.id 
                    left join composite_event_components as components 
                        on ranking.composite_event_id = components.composite_event_id
                    left join composite_events
                        on ranking.composite_event_id = composite_events.id
                )

            select
                campaign_id,
                name,
                floodlight_id,
                rank_order,
                pc_window,
                pv_window
            from combined_data
            where 
                campaign_id = $1 
                ${filters.length > 0 ? `and ${filterString}` : ""}
            order by
                campaign_id,
                rank_order
        `;

        const client = await connectionPool.connect();
        const result = await client.query(
            query,
            [
                campaignId,
                ...dataFilters.advertiserIds
            ]
        );
        client.release();

        // Validating result
        assert(result, "Result is invalid");
        assert(result?.rows, "Result does not have rows");
        assert(Array.isArray(result?.rows), "Result rows are not valid");

        // Conversion data parsing
        const conversionData = result.rows;

        const conversionMap = conversionData.reduce((map, row) => {
            const key = row.name;
            if (key in map) {
                const currentItem = map[key];
                const currentFloodlights = map[key]?.floodlights ?? [];
                map[key] = {
                    ...map[key],
                    floodlights: [ ...currentFloodlights, row.floodlight_id ]
                }
            } else {
                map[key] = {
                    name: row.name,
                    rank: row.rank_order,
                    campaignId: row.campaign_id,
                    pcWindow: row.pc_window,
                    pvWindow: row.pv_window,
                    floodlights: [row.floodlight_id]
                }
            }
            return map;
        }, {})

        // Return Conversion-Map
        return Object.values(conversionMap);

    } catch (error) {
        console.error(`Error while fetching conversions for campaign : ${campaignId} : ${error}`);
        return [];
    }

}
