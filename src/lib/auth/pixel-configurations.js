import { connectionPool } from "@db";
import { campaignsAreValid } from "./campaigns";
import { floodlightsAreValid } from "./floodlights";
import { compositeEventsAreValid } from "./composite-events";

import assert from "assert";

export async function validatePixelConfiguration(permissions, pixelConfig) {

    try {

        assert(pixelConfig?.id, "Pixel Config does not have a campaign-id");
        assert(pixelConfig?.name, "Pixel Config does not have a campaign-name");
        assert(pixelConfig?.advertiser?.id, "Pixel Config does not have valid advertiser");
        assert(pixelConfig?.advertiser?.name, "Pixel Config does not have valid advertiser");
        assert(pixelConfig?.pcWindow, "Pixel Config does not have valid pc-window");
        assert(pixelConfig?.pvWindow, "Pixel Config does not have valid pv-window");

        assert(pixelConfig?.conversions, "Pixel Configuration does not have conversions");
        assert(Array.isArray(pixelConfig?.conversions), "Pixel Configuration does not have conversions");
        assert(pixelConfig?.conversions.length > 0, "Pixel Configuration does not have conversions");
        assert(
            pixelConfig.conversions.every(
                conv => (conv?.id && conv?.name && conv?.advertiserId)
            ),
            "Pixel Conversions do not have a valid form"
        )

        assert(
            Array
                .from({ length: pixelConfig.conversions.length }, (_, index) => index + 1)
                .every(rank => pixelConfig.conversions.find(conv => conv.rank === rank)),
            "There are issues with rank allocation"
        );

        assert(
            pixelConfig.conversions
                .every(conv => conv.advertiserId === pixelConfig.advertiser.id),
            "All conversions do not belong to the same advertiser"
        );

        const campaignValidity = await campaignsAreValid([pixelConfig.id], pixelConfig.advertiser.id);
        assert(campaignValidity, "campaign is not present in the dataabase");

        const floodlightConversions = pixelConfig.conversions.filter(conv => !isNaN(conv.id));
        const compositeConversions = pixelConfig.conversions.filter(conv => isNaN(conv.id));

        if (floodlightConversions.length > 0) {
            const floodlightValidity = await floodlightsAreValid(
                floodlightConversions.map(floodlight => floodlight.id),
                pixelConfig.advertiser.id
            )
            assert(floodlightValidity, "Pixel Configuration - constituent Floodlights are invalid");
        }

        if (compositeConversions.length > 0) {
            const compositeConversionValidity = await compositeEventsAreValid(
                compositeConversions.map(event => event.id),
                pixelConfig.advertiser.id
            )
            assert(compositeConversionValidity, "Pixel Configuration - constitiuent Composite-Events are invalid");
        }

    } catch (error) {
        console.error(`Error while validating pixel-configuration : ${error}`);
        return error;
    }

    return null
}

export async function savePixelConfiguration(permissions, pixelConfiguration) {


    const error = await validatePixelConfiguration(permissions, pixelConfiguration);
    if (error) {
        console.error(`Error saving pixel-configuration : ${error}`)
        return { config: null, error: error }
    }

    const campaignId = pixelConfiguration.id;
    const advertiserId = pixelConfiguration.advertiser.id;
    const pcWindow = pixelConfiguration.pcWindow;
    const pvWindow = pixelConfiguration.pvWindow;
    const floodlightConversions = pixelConfiguration.conversions.filter(conv => !isNaN(conv.id));
    const compositeConversions = pixelConfiguration.conversions.filter(conv => isNaN(conv.id));

    const client = await connectionPool.connect();  
    try {
        
        await client.query("begin");

        // floodlight delete query
        const deleteQuery1 = `
            delete 
            from campaign_floodlight_rankings
            where campaign_id = $1
        `
        const deleteResult1 = await client.query(deleteQuery1, [campaignId]);

        // composite-evens delete query
        const deleteQuery2 = `
            delete
            from campaign_composite_event_rankings
            where campaign_id = $1
        `
        const deleteResult2 = await client.query(deleteQuery2, [campaignId]);

        if (floodlightConversions.length > 0) {

            // floodlight insert query
            const insertQuery = `
                insert into campaign_floodlight_rankings
                (campaign_id, floodlight_id, rank_order, pc_window, pv_window)
                values
                ${
                    floodlightConversions
                        .map((_, i) => (`($${i*5+1}, $${i*5+2}, $${i*5+3}, $${i*5+4}, $${i*5+5})`))
                        .join(",\n")
                }
            `
            const insertResult = await client.query(
                insertQuery, 
                floodlightConversions
                    .map(fl => [campaignId, fl.id, fl.rank, pcWindow, pvWindow]) 
                    .flatMap(arr => [...arr])
            )
        }

        if (compositeConversions.length > 0) {

            // composite-evens insert query
            const insertQuery = `
                insert into campaign_composite_event_rankings
                (campaign_id, composite_event_id, rank_order, pc_window, pv_window)
                values
                ${
                    compositeConversions
                        .map((_, i) => (`($${i*5+1}, $${i*5+2}, $${i*5+3}, $${i*5+4}, $${i*5+5})`))
                        .join(",\n")
                }
            `
            const insertResult = await client.query(
                insertQuery, 
                compositeConversions
                    .map(event => [campaignId, event.id, event.rank, pcWindow, pvWindow]) 
                    .flatMap(arr => [...arr])
            )
        }

        await client.query("commit");

    } catch (error) {
        await client.query("rollback");
        console.error(`Error while saving pixel-configuration in database : ${error}`);
        return { config:null, error:error };
    } finally {
        client.release();
    }

    return { config:pixelConfiguration, error:null };
}

export async function fetchPixelConfiguration(organizationId, campaignId) {

    const client = await connectionPool.connect();
    try {
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
            where campaign_id = $1
            order by campaign_id, rank_order
        `;
        const result = await client.query(query, [campaignId]);
        if (
            result &&
            result?.rows &&
            Array.isArray(result?.rows) &&
            result.rows.length > 0
        ) {
            const pixelConfig = result.rows[0];
            return {
                id: pixelConfig.campaign_id,
                name: pixelConfig.campaign,
                advertiser: { id: pixelConfig.advertiser_id, name: pixelConfig.advertiser },
                pcWindow: pixelConfig.pc_window,
                pvWindow: pixelConfig.pv_window,
                conversions : result.rows.map(
                    row => ({
                        id: row.conversion_id,
                        name: row.conversion,
                        rank: row.rank_order,
                        advertiserId: row.advertiser_id,
                    })
                )
            }

        } else {
            const errorMessage = `Invalid data from database : ${result}`
            throw new Error(errorMessage)
        }
    } catch (error) {
        console.error(`Error : Unable to fetch data from database : ${error}`)
        return null;
    } finally {
        client.release();
    }

}
