import { BigQuery } from "@google-cloud/bigquery";
import { validateFilters } from "@lib/auth/filters";
import { getCampaignConversions } from "@/lib/auth/conversions";

import assert from "assert";

export async function POST(request) {

    // Extracting user-permissions
    // -- Extracting the organizations the user has permission on
    const permissionString = request.headers.get("x-user-permissions");
    const permissions = permissionString?.split(",") ?? [];

    // Extracting request-body
    const requestJSON = await request.json();
    const dataFilters = requestJSON?.filters;

    // Validating filters
    const { valid, errors } = await validateFilters(permissions, dataFilters);
    if (errors) {
        console.error(`Filters are not valid : Errors : ${errors.join(", ")}`);
        return new Response(
            JSON.stringify({ "error" : "filters are invalid" }),
            { status: 400 }
        );
    }
    const startDate = new Date(dataFilters.dateRange.start).toLocaleDateString("en-CA");
    const endDate = new Date(dataFilters.dateRange.end).toLocaleDateString("en-CA");

    const bigquery = new BigQuery();

    // IO data variables
    let ioReachTrends = [];
    let ioReachTotals = [];
    let ioFrequencyEvents = [];
    let ioError = null;

    // Campaign data variables
    let campaignReachTrends = [];
    let campaignReachTotals = [];
    let campaignFrequencyEvents = [];
    let campaignError = null;

    try {

        const ioReachTrendQuery = `
            declare organization_id STRING DEFAULT "${dataFilters.organizationId || null}";
            declare partner_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.partnerIds || [])};
            declare advertiser_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.advertiserIds || [])};
            declare campaign_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.campaignIds || [])};
            declare insertion_order_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.insertionOrderIds || [])};
            declare start_date DATE DEFAULT "${startDate}";
            declare end_date DATE DEFAULT "${endDate}"; 

            select distinct
                organization_id,
                date,
                partner_id,
                advertiser_id,
                campaign_id,
                insertion_order_id,
                impressions,
                reach_1plus_incremental,
                reach_1plus_cumulative,
                reach_3plus_incremental,
                reach_3plus_cumulative
            from \`ace-insights.data_mart.ace_io_reach\`
            where
                true
                -- (organization_id IS NULL OR organization_id = organization_id)
                AND (ARRAY_LENGTH(partner_ids) = 0 OR CAST(partner_id AS STRING) IN UNNEST(partner_ids))
                AND (ARRAY_LENGTH(advertiser_ids) = 0 OR CAST(advertiser_id AS STRING) IN UNNEST(advertiser_ids))
                AND (ARRAY_LENGTH(campaign_ids) = 0 OR CAST(campaign_id AS STRING) IN UNNEST(campaign_ids))
                AND (ARRAY_LENGTH(insertion_order_ids) = 0 OR CAST(insertion_order_id AS STRING) IN UNNEST(insertion_order_ids))
                AND date BETWEEN start_date AND end_date
        `;

        const ioReachTotalQuery = `
            declare organization_id STRING DEFAULT "${dataFilters.organizationId || null}";
            declare partner_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.partnerIds || [])};
            declare advertiser_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.advertiserIds || [])};
            declare campaign_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.campaignIds || [])};
            declare insertion_order_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.insertionOrderIds || [])};
            declare start_date DATE DEFAULT "${startDate}";
            declare end_date DATE DEFAULT "${endDate}"; 

            with 

                insertion_order_rank as (
                    select distinct
                        insertion_order_id as id,
                        insertion_order as name,
                        row_number() over (partition by insertion_order_id order by date desc) as rank
                    from \`deeplake-bridge.mapping_metdata.dv3_entity_mapping\`
                    where
                        true
                        -- (organization_id IS NULL OR organization_id = organization_id)
                        AND (ARRAY_LENGTH(partner_ids) = 0 OR CAST(partner_id AS STRING) IN UNNEST(partner_ids))
                        AND (ARRAY_LENGTH(advertiser_ids) = 0 OR CAST(advertiser_id AS STRING) IN UNNEST(advertiser_ids))
                        AND (ARRAY_LENGTH(campaign_ids) = 0 OR CAST(campaign_id AS STRING) IN UNNEST(campaign_ids))
                        AND (ARRAY_LENGTH(insertion_order_ids) = 0 OR CAST(insertion_order_id AS STRING) IN UNNEST(insertion_order_ids))
                        AND date BETWEEN start_date AND end_date
                ),

                insertion_order_map as (
                    select distinct id, name
                    from insertion_order_rank
                    where rank = 1
                )

            select 
                raw_data.organization_id,
                raw_data.partner_id,
                raw_data.advertiser_id,
                raw_data.campaign_id,
                raw_data.insertion_order_id,
                insertion_order_map.name as insertion_order,
                sum(impressions) as impressions,
                sum(reach_1plus_incremental) as reach_1plus_cumulative,
                sum(reach_3plus_incremental) as reach_3plus_cumulative,
                case
                    when sum(reach_1plus_incremental) is null then 0
                    when sum(reach_1plus_incremental) = 0 then 0
                    when sum(reach_3plus_incremental) is null then 0
                    when sum(reach_3plus_incremental) = 0 then 0
                    else (sum(reach_3plus_incremental) / sum(reach_1plus_incremental)) 
                end as ratio_1plus_3plus,
                case
                    when sum(reach_1plus_incremental) is null then "CRITICAL"
                    when sum(reach_1plus_incremental) = 0 then "CRITICAL"
                    when sum(reach_3plus_incremental) is null then "CRITICAL"
                    when sum(reach_3plus_incremental) = 0 then "CRITICAL"
                    when (sum(reach_3plus_incremental) / sum(reach_1plus_incremental)) < 0.35 then "CRITICAL"
                    when (sum(reach_3plus_incremental) / sum(reach_1plus_incremental)) < 0.45 then "WARNING"
                    else "HEALTHY"
                end as status
            from \`ace-insights.data_mart.ace_io_reach\` as raw_data
            left join insertion_order_map
            on raw_data.insertion_order_id = insertion_order_map.id
            where
                true
                -- (organization_id IS NULL OR organization_id = organization_id)
                AND (ARRAY_LENGTH(partner_ids) = 0 OR CAST(partner_id AS STRING) IN UNNEST(partner_ids))
                AND (ARRAY_LENGTH(advertiser_ids) = 0 OR CAST(advertiser_id AS STRING) IN UNNEST(advertiser_ids))
                AND (ARRAY_LENGTH(campaign_ids) = 0 OR CAST(campaign_id AS STRING) IN UNNEST(campaign_ids))
                AND (ARRAY_LENGTH(insertion_order_ids) = 0 OR CAST(insertion_order_id AS STRING) IN UNNEST(insertion_order_ids))
                AND date BETWEEN start_date AND end_date
            group by 
                raw_data.organization_id,
                raw_data.partner_id,
                raw_data.advertiser_id,
                raw_data.campaign_id,
                raw_data.insertion_order_id,
                insertion_order_map.name
        `;


        const ioFreqEventsQuery = `
            declare organization_id STRING DEFAULT "${dataFilters.organizationId || null}";
            declare partner_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.partnerIds || [])};
            declare advertiser_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.advertiserIds || [])};
            declare campaign_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.campaignIds || [])};
            declare insertion_order_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.insertionOrderIds || [])};
            declare start_date DATE DEFAULT "${startDate}";
            declare end_date DATE DEFAULT "${endDate}"; 

            select 
                organization_id,
                advertiser_id,
                campaign_id,
                insertion_order_id,
                max_views,
                max_impressions,
                time_unit,
                time_unit_count,
                is_unlimited,
                update_time,
            from \`ace-insights.data_mart.ace_io_freq_cap_data\`
            where
                true
                -- (organization_id IS NULL OR organization_id = organization_id)
                AND (ARRAY_LENGTH(partner_ids) = 0 OR CAST(partner_id AS STRING) IN UNNEST(partner_ids))
                AND (ARRAY_LENGTH(advertiser_ids) = 0 OR CAST(advertiser_id AS STRING) IN UNNEST(advertiser_ids))
                AND (ARRAY_LENGTH(campaign_ids) = 0 OR CAST(campaign_id AS STRING) IN UNNEST(campaign_ids))
                AND (ARRAY_LENGTH(insertion_order_ids) = 0 OR CAST(insertion_order_id AS STRING) IN UNNEST(insertion_order_ids))
                AND update_time BETWEEN start_date AND end_date
        `;

        // Querying data
        const [
            [ioReachTrendJob],
            [ioReachTotalJob],
            [ioFreqEventsJob],
        ] = await Promise.all([
            bigquery.createQueryJob({ query:ioReachTrendQuery }),
            bigquery.createQueryJob({ query:ioReachTotalQuery }),
            bigquery.createQueryJob({ query:ioFreqEventsQuery }),
        ]);

        // Extracting rows of data
        const [
            [ioReachTrendRows],
            [ioReachTotalRows],
            [ioFreqEventsRows],
        ] = await Promise.all([
            ioReachTrendJob.getQueryResults(),
            ioReachTotalJob.getQueryResults(),
            ioFreqEventsJob.getQueryResults(),
        ]);

        // Checking if empty data is not obtained
        assert(ioReachTrendRows.length > 0, "IO Reach Trends data is empty");
        assert(ioReachTotalRows.length > 0, "IO Reach Totals is empty");
        assert(ioFreqEventsRows.length > 0, "IO Freq-Events Rows is empty");

        // Reach-Trends data to be transmitted
        ioReachTrends = ioReachTrendRows.map(row => ({
            campaignId: row.campaign_id,
            insertionOrderId: row.insertion_order_id,
            date: row.date.value,
            impressions: row.impressions,
            cumlativeReach1Plus: row.reach_1plus_cumulative,
            incrementalReach1Plus: row.reach_1plus_incremental,
            cumlativeReach3Plus: row.reach_3plus_cumulative,
            incrementalReach3Plus: row.reach_3plus_incremental,
            ratio: row.reach_3plus_cumulative / row.reach_1plus_cumulative,
        }));

        // Reach-Totals data to be transmitted
        ioReachTotals = ioReachTotalRows.map(row => ({
            campaignId: row.campaign_id,
            insertionOrderId: row.insertion_order_id,
            insertionOrder: row.insertion_order,
            status: row.status,
            impressions: row.impressions,
            reach_1plus: row.reach_1plus_cumulative,
            reach_3plus: row.reach_3plus_cumulative,
            ratio: row.ratio_1plus_3plus
        }));

        // IO Frequency Events to be transmitted
        ioFrequencyEvents = ioFreqEventsRows.map(row => ({
            campaignId: row.campaign_id,
            insertionOrderId: row.insertion_order_id,
            timeUnit: row.time_unit,
            timeUnitCount: row.time_unit_count,
            maxImpressions: row.max_impressions,
            maxViews: row.max_views,
            isUnlimited: row.is_unlimited,
            updateDate: row.update_time.value
        }));

    } catch(error) {
        ioError = error;
    }

    try {

        const campaignReachTrendQuery = `
            declare organization_id STRING DEFAULT "${dataFilters.organizationId || null}";
            declare partner_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.partnerIds || [])};
            declare advertiser_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.advertiserIds || [])};
            declare campaign_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.campaignIds || [])};
            declare insertion_order_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.insertionOrderIds || [])};
            declare start_date DATE DEFAULT "${startDate}";
            declare end_date DATE DEFAULT "${endDate}"; 

            select distinct
                organization_id,
                date,
                partner_id,
                advertiser_id,
                campaign_id,
                impressions,
                reach_1plus_incremental,
                reach_1plus_cumulative,
                reach_3plus_incremental,
                reach_3plus_cumulative
            from \`ace-insights.data_mart.ace_campaign_reach\`
            where
                true
                -- (organization_id IS NULL OR organization_id = organization_id)
                AND (ARRAY_LENGTH(partner_ids) = 0 OR CAST(partner_id AS STRING) IN UNNEST(partner_ids))
                AND (ARRAY_LENGTH(advertiser_ids) = 0 OR CAST(advertiser_id AS STRING) IN UNNEST(advertiser_ids))
                AND (ARRAY_LENGTH(campaign_ids) = 0 OR CAST(campaign_id AS STRING) IN UNNEST(campaign_ids))
                AND date BETWEEN start_date AND end_date
        `;

        const campaignReachTotalQuery = `
            -- declare organization_id STRING DEFAULT "${dataFilters.organizationId || null}";
            declare partner_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.partnerIds || [])};
            declare advertiser_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.advertiserIds || [])};
            declare campaign_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.campaignIds || [])};
            declare start_date DATE DEFAULT "${startDate}";
            declare end_date DATE DEFAULT "${endDate}"; 

            with 

                campaign_rank as (
                    select distinct
                        campaign_id as id,
                        campaign as name,
                        row_number() over (partition by campaign_id order by date desc) as rank
                    -- from \`ace-insights.data_mart.org_li_data\`
                    from \`deeplake-bridge.mapping_metdata.dv3_entity_mapping\`
                    where
                        true
                        -- (organization_id IS NULL OR organization_id = organization_id)
                        AND (ARRAY_LENGTH(partner_ids) = 0 OR CAST(partner_id AS STRING) IN UNNEST(partner_ids))
                        AND (ARRAY_LENGTH(advertiser_ids) = 0 OR CAST(advertiser_id AS STRING) IN UNNEST(advertiser_ids))
                        AND (ARRAY_LENGTH(campaign_ids) = 0 OR CAST(campaign_id AS STRING) IN UNNEST(campaign_ids))
                        AND date BETWEEN start_date AND end_date
                ),

                campaign_map as (
                    select distinct id, name
                    from campaign_rank
                    where rank = 1
                )

            select 
                raw_data.organization_id,
                raw_data.partner_id,
                raw_data.advertiser_id,
                raw_data.campaign_id,
                campaign_map.name as campaign,
                sum(impressions) as impressions,
                sum(reach_1plus_incremental) as reach_1plus_cumulative,
                sum(reach_3plus_incremental) as reach_3plus_cumulative,
                case
                    when sum(reach_1plus_incremental) is null then 0
                    when sum(reach_1plus_incremental) = 0 then 0
                    when sum(reach_3plus_incremental) is null then 0
                    when sum(reach_3plus_incremental) = 0 then 0
                    else (sum(reach_3plus_incremental) / sum(reach_1plus_incremental)) 
                end as ratio_1plus_3plus,
                case
                    when sum(reach_1plus_incremental) is null then "CRITICAL"
                    when sum(reach_1plus_incremental) = 0 then "CRITICAL"
                    when sum(reach_3plus_incremental) is null then "CRITICAL"
                    when sum(reach_3plus_incremental) = 0 then "CRITICAL"
                    when (sum(reach_3plus_incremental) / sum(reach_1plus_incremental)) < 0.35 then "CRITICAL"
                    when (sum(reach_3plus_incremental) / sum(reach_1plus_incremental)) < 0.45 then "WARNING"
                    else "HEALTHY"
                end as status
            from \`ace-insights.data_mart.ace_campaign_reach\` as raw_data
            left join campaign_map
            on raw_data.campaign_id = campaign_map.id
            where
                true
                -- (organization_id IS NULL OR organization_id = organization_id)
                AND (ARRAY_LENGTH(partner_ids) = 0 OR CAST(partner_id AS STRING) IN UNNEST(partner_ids))
                AND (ARRAY_LENGTH(advertiser_ids) = 0 OR CAST(advertiser_id AS STRING) IN UNNEST(advertiser_ids))
                AND (ARRAY_LENGTH(campaign_ids) = 0 OR CAST(campaign_id AS STRING) IN UNNEST(campaign_ids))
                AND date BETWEEN start_date AND end_date
            group by 
                raw_data.organization_id,
                raw_data.partner_id,
                raw_data.advertiser_id,
                raw_data.campaign_id,
                campaign_map.name
        `;

        const campaignFreqEventsQuery = `
            declare organization_id STRING DEFAULT "${dataFilters.organizationId || null}";
            declare partner_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.partnerIds || [])};
            declare advertiser_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.advertiserIds || [])};
            declare campaign_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.campaignIds || [])};
            declare start_date DATE DEFAULT "${startDate}";
            declare end_date DATE DEFAULT "${endDate}"; 

            select 
                organization_id,
                advertiser_id,
                campaign_id,
                max_views,
                max_impressions,
                time_unit,
                time_unit_count,
                is_unlimited,
                update_time,
            from \`ace-insights.data_mart.ace_campaign_freq_cap_data\`
            where
                true
                -- (organization_id IS NULL OR organization_id = organization_id)
                AND (ARRAY_LENGTH(partner_ids) = 0 OR CAST(partner_id AS STRING) IN UNNEST(partner_ids))
                AND (ARRAY_LENGTH(advertiser_ids) = 0 OR CAST(advertiser_id AS STRING) IN UNNEST(advertiser_ids))
                AND (ARRAY_LENGTH(campaign_ids) = 0 OR CAST(campaign_id AS STRING) IN UNNEST(campaign_ids))
                AND update_time BETWEEN start_date AND end_date
        `;

        // Querying data
        const [
            [campaignReachTrendJob],
            [campaignReachTotalJob],
            [campaignFreqEventsJob],
        ] = await Promise.all([
            bigquery.createQueryJob({ query:campaignReachTrendQuery }),
            bigquery.createQueryJob({ query:campaignReachTotalQuery }),
            bigquery.createQueryJob({ query:campaignFreqEventsQuery }),
        ]);

        // Extracting rows of data
        const [
            [campaignReachTrendRows],
            [campaignReachTotalRows],
            [campaignFreqEventsRows],
        ] = await Promise.all([
            campaignReachTrendJob.getQueryResults(),
            campaignReachTotalJob.getQueryResults(),
            campaignFreqEventsJob.getQueryResults(),
        ]);

        assert(campaignReachTrendRows.length > 0, "Campaign Reach Trends data is empty");
        assert(campaignReachTotalRows.length > 0, "Campaign Reach Totals is empty");
        assert(campaignFreqEventsRows.length > 0, "Campaign Freq-Events Rows is empty");

        // Reach-Trends data to be transmitted
        campaignReachTrends = campaignReachTrendRows.map(row => ({
            campaignId: row.campaign_id,
            date: row.date.value,
            impressions: row.impressions,
            cumlativeReach1Plus: row.reach_1plus_cumulative,
            incrementalReach1Plus: row.reach_1plus_incremental,
            cumlativeReach3Plus: row.reach_3plus_cumulative,
            incrementalReach3Plus: row.reach_3plus_incremental,
            ratio: row.reach_3plus_cumulative / row.reach_1plus_cumulative,
        }));

        // Reach-Totals data to be transmitted
        campaignReachTotals = campaignReachTotalRows.map(row => ({
            campaignId: row.campaign_id,
            campaign: row.campaign,
            status: row.status,
            impressions: row.impressions,
            reach_1plus: row.reach_1plus_cumulative,
            reach_3plus: row.reach_3plus_cumulative,
            ratio: row.ratio_1plus_3plus
        }));

        // IO Frequency Events to be transmitted
        campaignFrequencyEvents = campaignFreqEventsRows.map(row => ({
            campaignId: row.campaign_id,
            timeUnit: row.time_unit,
            timeUnitCount: row.time_unit_count,
            maxImpressions: row.max_impressions,
            maxViews: row.max_views,
            isUnlimited: row.is_unlimited,
            updateDate: row.update_time.value
        }));

    } catch(error) {
        campaignError = error;
    }

    if (ioError && campaignError) {
        console.error(`Reach data has errors :\nCampaign-Error : ${campaignError}\nIO-Error : ${ioError}`);
        return new Response(
            JSON.stringify({ error: `Error while fetching campaign-metrics-card data` }), 
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    } else {
        // Send data fetched from bq-query
        return new Response(
            JSON.stringify({
                ioTrends: ioReachTrends,
                ioTotals: ioReachTotals,
                ioFreqEvents: ioFrequencyEvents,
                campaignTrends: campaignReachTrends,
                campaignTotals: campaignReachTotals,
                campaignFreqEvents: campaignFrequencyEvents,
            }),
            {
                status: 200,
                headers: { "Content-Type" : "application/json" },
            }
        );
    }

}
