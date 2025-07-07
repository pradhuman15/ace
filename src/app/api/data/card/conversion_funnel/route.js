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
        return new Response(JSON.stringify({ error: "filters are invalid" }), {
            status: 400,
        });
    }
    const startDate = new Date(dataFilters.dateRange.start).toLocaleDateString(
        "en-CA",
    );
    const endDate = new Date(dataFilters.dateRange.end).toLocaleDateString(
        "en-CA",
    );

    // Fetching conversions
    const campaignId = dataFilters?.campaignIds?.[0];
    const conversionData = await getCampaignConversions(campaignId, dataFilters);
    const conversionNames = [...new Set(conversionData.map((row) => row.name))];

    if (conversionData.length === 0) {
        console.error(`Conversion Data not found for filters :`, dataFilters);
        return new Response(
            JSON.stringify({ error: `Conversion Data not found` }),
            {
                status: 404,
                headers: { "Content-Type": "application/json" },
            },
        );
    }

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
            ${conversionData
            .map(
                (conversion) => `
                when (floodlight_id in (${conversion.floodlights.join(",")}))
                    then "${conversion.name}"`,
            )
            .join("\n")}
            else ""
        end
    )`;
    const rankCaseString = `
    (
        case
            ${conversionData
            .map(
                (conversion) => `
                when (floodlight_id in (${conversion.floodlights.join(",")}))
                    then ${conversion.rank}`,
            )
            .join("\n")}
            else 0
        end
    )`;

    try {
        const bigquery = new BigQuery();

        const conversionQuery = `
            declare organization_id STRING DEFAULT "${dataFilters.organizationId || null}";
            declare partner_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.partnerIds || [])};
            declare advertiser_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.advertiserIds || [])};
            declare campaign_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.campaignIds || [])};
            declare insertion_order_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.insertionOrderIds || [])};
            declare start_date DATE DEFAULT "${startDate}";
            declare end_date DATE DEFAULT "${endDate}"; 

            select
                date,
                ${floodlightCaseString} as floodlight,
                ${rankCaseString} as rank_order,
                sum(${conversionString}) as conversions,
                sum(floodlight_impressions) as floodlight_impressions,
            from \`ace-insights.data_mart.conversion_data\` as conversion_data
            where
                (organization_id is null or organization_id = organization_id)
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
                and date between start_date and end_date
                and ${floodlightCaseString} != ""
                and ${rankCaseString} > 0
            group by
                date,
                ${floodlightCaseString},
                ${rankCaseString}
        `;

        const conversionTotalsQuery = `
            declare organization_id STRING DEFAULT "${dataFilters.organizationId || null}";
            declare partner_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.partnerIds || [])};
            declare advertiser_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.advertiserIds || [])};
            declare campaign_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.campaignIds || [])};
            declare insertion_order_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.insertionOrderIds || [])};
            declare start_date DATE DEFAULT "${startDate}";
            declare end_date DATE DEFAULT "${endDate}"; 

            select
                ${floodlightCaseString} as floodlight,
                ${rankCaseString} as rank_order,
                sum(${conversionString}) as conversions,
                sum(floodlight_impressions) as floodlight_impressions,
                corr(${conversionString}, floodlight_impressions) as correlation,
            from \`ace-insights.data_mart.conversion_data\` as conversion_data
            where
                (organization_id is null or organization_id = organization_id)
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
                and date between start_date and end_date
                and ${floodlightCaseString} != ""
                and ${rankCaseString} > 0
            group by
                ${floodlightCaseString},
                ${rankCaseString}
        `;

        const metricQuery = `
            declare organization_id STRING DEFAULT "${dataFilters.organizationId || null}";
            declare partner_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.partnerIds || [])};
            declare advertiser_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.advertiserIds || [])};
            declare campaign_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.campaignIds || [])};
            declare insertion_order_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.insertionOrderIds || [])};
            declare start_date DATE DEFAULT "${startDate}";
            declare end_date DATE DEFAULT "${endDate}"; 

            select 
                date,
                sum(impressions) as impressions,
                sum(clicks) as clicks,
                sum(total_media_cost) as spends,
                sum(youtube_views) as views
            from \`ace-insights.data_mart.org_li_data\`
            where
                (organization_id is null or organization_id = organization_id)
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
                and date between start_date and end_date
            group by date
        `;

        const metricTotalsQuery = `
            declare organization_id STRING DEFAULT "${dataFilters.organizationId || null}";
            declare partner_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.partnerIds || [])};
            declare advertiser_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.advertiserIds || [])};
            declare campaign_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.campaignIds || [])};
            declare insertion_order_ids ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.insertionOrderIds || [])};
            declare start_date DATE DEFAULT "${startDate}";
            declare end_date DATE DEFAULT "${endDate}"; 

            select 
                sum(impressions) as impressions,
                sum(clicks) as clicks,
                sum(total_media_cost) as spends,
                sum(youtube_views) as views
            from \`ace-insights.data_mart.org_li_data\`
            where
                (organization_id is null or organization_id = organization_id)
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
                and date between start_date and end_date
        `;

        // Querying data
        const [
            [conversionJob],
            [conversionTotalsJob],
            [metricJob],
            [metricTotalsJob],
        ] = await Promise.all([
            bigquery.createQueryJob({ query: conversionQuery }),
            bigquery.createQueryJob({ query: conversionTotalsQuery }),
            bigquery.createQueryJob({ query: metricQuery }),
            bigquery.createQueryJob({ query: metricTotalsQuery }),
        ]);

        const [
            [conversionRows],
            [conversionTotalsRows],
            [metricRows],
            [metricTotalsRows],
        ] = await Promise.all([
            conversionJob.getQueryResults(),
            conversionTotalsJob.getQueryResults(),
            metricJob.getQueryResults(),
            metricTotalsJob.getQueryResults(),
        ]);

        // Checking if empty data is not obtained
        assert(conversionRows.length > 0, "Conversion-Rows are empty");
        assert(metricRows.length > 0, "Metric-Rows are empty");
        assert(conversionTotalsRows.length > 0, "Conversion-Totals-Rows are empty");
        assert(metricTotalsRows.length > 0, "Metric-Totals-Rows are empty");

        // Checking if totals-data is right
        assert(
            conversionTotalsRows.length <= conversionNames.length,
            "Conversion-Totals-Rows does not have sufficient rows",
        );
        assert(
            metricTotalsRows.length === 1,
            "Metric-Totals-Rows returned more than one row",
        );

        // Contructing Date-wise data for charts
        const conversionDataMap = conversionRows.reduce((map, row) => {
            row.date = row.date.value;
            const key = `${row.date}_${row.floodlight}`;
            map[key] = row;
            return map;
        }, {});
        const metricDataMap = metricRows.reduce((map, row) => {
            row.date = row.date.value;
            for (const name of conversionNames) {
                const key = `${row.date}_${name}`;
                map[key] = row;
            }
            return map;
        }, {});

        const data = Object.keys(conversionDataMap).map((key) => ({
            date: conversionDataMap[key].date,
            impressions: metricDataMap[key]?.impressions ?? 0,
            clicks: metricDataMap[key]?.clicks ?? 0,
            spends: metricDataMap[key]?.spends ?? 0,
            views: metricDataMap[key]?.views ?? 0,
            floodlight: conversionDataMap[key]?.floodlight ?? "",
            rankOrder: conversionDataMap[key]?.rank_order ?? 0,
            conversions: conversionDataMap[key]?.conversions ?? 0,
            floodlightLoads: conversionDataMap[key]?.floodlight_impressions ?? 0,
            cpa: conversionDataMap?.[key]?.conversions
                ? (metricDataMap[key]?.spends ?? 0) /
                conversionDataMap[key]?.conversions
                : 0,
        }));

        // Contructing totals data for charts
        const totalsData = conversionTotalsRows.map((row) => ({
            floodlight: row.floodlight,
            rankOrder: row.rank_order,
            conversions: row.conversions,
            floodlightLoads: row.floodlight_impressions,
            correlation: row.correlation,
            impressions: metricTotalsRows[0]?.impressions ?? 0,
            clicks: metricTotalsRows[0]?.clicks ?? 0,
            spends: metricTotalsRows[0]?.spends ?? 0,
            views: metricTotalsRows[0]?.views ?? 0,
            cpa: (metricTotalsRows[0]?.spends ?? 0) / row.conversions,
        }));

        // Send data fetched from bq-query
        return new Response(
            JSON.stringify({
                data: data,
                totals: totalsData,
                conversions: conversionNames,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            },
        );
    } catch (error) {
        console.error(`Error while fetching funnel-card-data : ${error}`);
        return new Response(
            JSON.stringify({ error: `Error while fetching funnel-card data` }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            },
        );
    }
}
