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

    // Fetching conversions
    const campaignId = dataFilters?.campaignIds?.[0];
    const conversionData = await getCampaignConversions(campaignId, dataFilters);


    // Constructing items for bigquery query
    // -- Conversion pcWindow + pvWindow
    // -- Floodlight-Case-Statement
    // -- Floodlight-Rank-Case-Statement
    const pcWindow = conversionData?.[0]?.pcWindow ?? "1d";
    const pvWindow = conversionData?.[0]?.pvWindow ?? "1d";
    const conversionString = `click_through_conversions_${pcWindow} + view_through_conversions_${pvWindow}`;
    const floodlightCaseString = `
    (
        case
            ${conversionData.map(conversion => `
                when (floodlight_id in (${conversion.floodlights.join(",")}))
                    then "${conversion.name}"`
            ).join("\n")}
            else ""
        end
    )`;
    const rankCaseString = `
    (
        case
            ${conversionData.map(conversion => `
                when (floodlight_id in (${conversion.floodlights.join(",")}))
                    then ${conversion.rank}`
            ).join("\n")}
            else 0
        end
    )`;


    try {
        const bigquery = new BigQuery();

        const totalsQuery = `
            declare organization_id STRING DEFAULT "${dataFilters.organizationId || null}";
            declare partner_ids array<string> default ${JSON.stringify(dataFilters.partnerIds || [])};
            declare advertiser_ids array<string> default ${JSON.stringify(dataFilters.advertiserIds || [])};
            declare campaign_ids array<string> default ${JSON.stringify(dataFilters.campaignIds || [])};
            declare insertion_order_ids array<string> default ${JSON.stringify(dataFilters.insertionOrderIds || [])};
            declare line_item_ids array<string> default ${JSON.stringify(dataFilters.lineItemIds || [])};
            declare start_date date default "${startDate}";
            declare end_date date default "${endDate}"; 

            select 
                sum(total_media_cost) as spends,
                sum(impressions) as impressions,
                sum(clicks) as clicks,
                sum(youtube_views) as views,
                safe_divide(sum(total_media_cost), sum(impressions)) * 1000 as cpm,
                safe_divide(sum(total_media_cost), sum(youtube_views)) as cpv,
                safe_divide(sum(clicks), sum(impressions)) as ctr,
                safe_divide(sum(youtube_views), sum(impressions)) as vtr
            from \`ace-insights.data_mart.org_li_data\`
            where
                (organization_id IS NULL OR organization_id = organization_id)
                and (
                    array_length(partner_ids) = 0 OR 
                    CAST(partner_id as string) in unnest(partner_ids)
                )
                and (
                    array_length(advertiser_ids) = 0 OR
                    CAST(advertiser_id as string) in unnest(advertiser_ids)
                )
                and (
                    array_length(campaign_ids) = 0 OR
                    CAST(campaign_id as string) in unnest(campaign_ids)
                )
                and (
                    array_length(insertion_order_ids) = 0 OR
                    CAST(insertion_order_id as string) in unnest(insertion_order_ids)
                )
                and (
                    array_length(line_item_ids) = 0 OR
                    CAST(line_item_id as string) in unnest(line_item_ids)
                )
                and date between start_date and end_date
        `;

        const dateQuery = `
            declare organization_id STRING DEFAULT "${dataFilters.organizationId || null}";
            declare partner_ids array<string> default ${JSON.stringify(dataFilters.partnerIds || [])};
            declare advertiser_ids array<string> default ${JSON.stringify(dataFilters.advertiserIds || [])};
            declare campaign_ids array<string> default ${JSON.stringify(dataFilters.campaignIds || [])};
            declare insertion_order_ids array<string> default ${JSON.stringify(dataFilters.insertionOrderIds || [])};
            declare line_item_ids array<string> default ${JSON.stringify(dataFilters.lineItemIds || [])};
            declare start_date date default "${startDate}";
            declare end_date date default "${endDate}"; 

            select 
                date,
                sum(total_media_cost) as spends,
                sum(impressions) as impressions,
                sum(clicks) as clicks,
                sum(youtube_views) as views,
                safe_divide(sum(total_media_cost), sum(impressions)) * 1000 as cpm,
                safe_divide(sum(total_media_cost), sum(youtube_views)) as cpv,
                safe_divide(sum(clicks), sum(impressions)) as ctr,
                safe_divide(sum(youtube_views), sum(impressions)) as vtr
            from \`ace-insights.data_mart.org_li_data\`
            where
                (organization_id IS NULL OR organization_id = organization_id)
                and (
                    array_length(partner_ids) = 0 OR 
                    CAST(partner_id as string) in unnest(partner_ids)
                )
                and (
                    array_length(advertiser_ids) = 0 OR
                    CAST(advertiser_id as string) in unnest(advertiser_ids)
                )
                and (
                    array_length(campaign_ids) = 0 OR
                    CAST(campaign_id as string) in unnest(campaign_ids)
                )
                and (
                    array_length(insertion_order_ids) = 0 OR
                    CAST(insertion_order_id as string) in unnest(insertion_order_ids)
                )
                and (
                    array_length(line_item_ids) = 0 OR
                    CAST(line_item_id as string) in unnest(line_item_ids)
                )
                and date between start_date and end_date
            group by
                date
        `;

        const conversionTotalsQuery = `
            declare organization_id STRING DEFAULT "${dataFilters.organizationId || null}";
            declare partner_ids array<string> default ${JSON.stringify(dataFilters.partnerIds || [])};
            declare advertiser_ids array<string> default ${JSON.stringify(dataFilters.advertiserIds || [])};
            declare campaign_ids array<string> default ${JSON.stringify(dataFilters.campaignIds || [])};
            declare insertion_order_ids array<string> default ${JSON.stringify(dataFilters.insertionOrderIds || [])};
            declare line_item_ids array<string> default ${JSON.stringify(dataFilters.lineItemIds || [])};
            declare start_date date default "${startDate}";
            declare end_date date default "${endDate}"; 

            select 
                ${floodlightCaseString} as floodlight,
                ${rankCaseString} as rank_order,
                sum(${conversionString}) as conversions,
            from \`ace-insights.data_mart.org_li_data\`
            where
                floodlight_id is not null
                and (organization_id is null or organization_id = organization_id)
                and (
                    array_length(partner_ids) = 0 or 
                    cast(partner_id as string) in unnest(partner_ids)
                )
                and (
                    array_length(advertiser_ids) = 0 or
                    cast(advertiser_id as string) in unnest(advertiser_ids)
                )
                and (
                    array_length(campaign_ids) = 0 or
                    cast(campaign_id as string) in unnest(campaign_ids)
                )
                and (
                    array_length(insertion_order_ids) = 0 or
                    cast(insertion_order_id as string) in unnest(insertion_order_ids)
                )
                and (
                    array_length(line_item_ids) = 0 or
                    cast(line_item_id as string) in unnest(line_item_ids)
                )
                and date between start_date and end_date
            group by
                ${floodlightCaseString},
                ${rankCaseString}
        `;

        const conversionDateQuery = `
            declare organization_id STRING DEFAULT "${dataFilters.organizationId || null}";
            declare partner_ids array<string> default ${JSON.stringify(dataFilters.partnerIds || [])};
            declare advertiser_ids array<string> default ${JSON.stringify(dataFilters.advertiserIds || [])};
            declare campaign_ids array<string> default ${JSON.stringify(dataFilters.campaignIds || [])};
            declare insertion_order_ids array<string> default ${JSON.stringify(dataFilters.insertionOrderIds || [])};
            declare line_item_ids array<string> default ${JSON.stringify(dataFilters.lineItemIds || [])};
            declare start_date date default "${startDate}";
            declare end_date date default "${endDate}"; 

            select 
                date,
                ${floodlightCaseString} as floodlight,
                ${rankCaseString} as rank_order,
                sum(${conversionString}) as conversions,
            from \`ace-insights.data_mart.org_li_data\`
            where
                (organization_id IS NULL OR organization_id = organization_id)
                and (
                    array_length(partner_ids) = 0 OR 
                    CAST(partner_id as string) in unnest(partner_ids)
                )
                and (
                    array_length(advertiser_ids) = 0 OR
                    CAST(advertiser_id as string) in unnest(advertiser_ids)
                )
                and (
                    array_length(campaign_ids) = 0 OR
                    CAST(campaign_id as string) in unnest(campaign_ids)
                )
                and (
                    array_length(insertion_order_ids) = 0 OR
                    CAST(insertion_order_id as string) in unnest(insertion_order_ids)
                )
                and (
                    array_length(line_item_ids) = 0 OR
                    CAST(line_item_id as string) in unnest(line_item_ids)
                )
                and date between start_date and end_date
            group by
                date,
                ${floodlightCaseString},
                ${rankCaseString}
        `;

        // Running normal queries
        const [[totalsJob], [dateJob]] = await Promise.all([
            bigquery.createQueryJob({ query:totalsQuery }),
            bigquery.createQueryJob({ query:dateQuery }),
        ]);

        const [[totalsRows], [dateRows]] = await Promise.all([
            totalsJob.getQueryResults(),
            dateJob.getQueryResults(),
        ]);

        // Running conversion queries if conversionData is present
        let conversionTotalsJob, conversionDateJob;
        let conversionTotalsRows = [], conversionDateRows = [];
        if (conversionData.length > 0) {

            [[conversionTotalsJob], [conversionDateJob]] = await Promise.all([
                bigquery.createQueryJob({ query:conversionTotalsQuery }),
                bigquery.createQueryJob({ query:conversionDateQuery }),
            ]);
            [[conversionTotalsRows], [conversionDateRows]] = await Promise.all([
                conversionTotalsJob.getQueryResults(),
                conversionDateJob.getQueryResults(),
            ]);

            assert(conversionTotalsRows.length > 0, "Conversions-Totals-Rows are empty");
            assert(conversionDateRows.length > 0, "Conversions-Date-Rows are empty");

        }

        // Checking if data is not empty
        assert(totalsRows.length > 0, "Totals-Rows are empty");
        assert(dateRows.length > 0, "Date-Rows are empty");

        let conversionTotalsMap, conversionsDateMap;

        // Consolidating conversion totals
        conversionTotalsMap = conversionTotalsRows.reduce((map, row) => {
            if (!row.conversions) { return map; }
            map[`conversion_${row.rank_order + 1}`] = { 
                floodlight: row.floodlight,
                rank: row.rank_order + 1,
                conversions: row.conversions
            }
            return map;
        }, {});

        // Consolidating date-wise conversions data
        conversionsDateMap = conversionDateRows.reduce((map, row) => {
            if (!row.conversions) { return map; }
            const key = row.date.value;
            if (map?.[key]) {
                map[key][`conversion_${row.rank_order + 1}`] = {
                    floodlight: row.floodlight,
                    rank: row.rank_order + 1,
                    conversions: row.conversions
                };
            } else {
                map[key] = {
                    [`conversion_${row.rank_order + 1}`]: {
                        floodlight: row.floodlight,
                        rank: row.rank_order + 1,
                        conversions: row.conversions
                    }
                };
            }
            return map;
        }, {});

        const dateData = dateRows.map(row => ({
            date: row.date.value,
            impressions: row?.impressions ?? 0,
            clicks: row?.clicks ?? 0,
            views: row?.views ?? 0,
            spends: row?.spends ?? 0,
            cpm: row?.cpm ?? 0,
            cpv: row?.cpv ?? 0,
            ctr: row?.ctr ?? 0,
            vtr: row?.vtr ?? 0,
            ...(
                conversionData.length > 0 && 
                conversionsDateMap[row.date.value]
            )
        }));

        let totalsRow = totalsRows?.[0] ?? {};
        const totalsData = {
            impressions: totalsRow?.impressions ?? 0,
            clicks: totalsRow?.clicks ?? 0,
            views: totalsRow?.views ?? 0,
            spends: totalsRow?.spends ?? 0,
            cpm: totalsRow?.cpm ?? 0,
            cpv: totalsRow?.cpv ?? 0,
            ctr: totalsRow?.ctr ?? 0,
            vtr: totalsRow?.vtr ?? 0,
            ...(
                conversionData.length > 0 &&
                conversionTotalsMap
            )
        };

        return new Response(
            JSON.stringify({
                data: dateData,
                totals: totalsData,
            }),
            {
                status: 200,
                headers: { "Content-Type" : "application/json" }
            }
        )

    } catch (error) {
        console.error(`Error while fetching campaign-metric-card data : Error : ${error}`);
        return new Response(JSON.stringify({ error: `Error while fetching campaign-metrics-card data` }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }

}
