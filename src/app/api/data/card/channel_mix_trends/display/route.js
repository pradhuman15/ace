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
  const floodlightCaseString = conversionData?.length === 0 ? "''" : `
  (
      CASE
          ${conversionData.map(conversion => `
          WHEN (cast(floodlight_id as int64) in (${conversion.floodlights.join(",")})) THEN "${conversion.name}"`
          ).join("")}
          ELSE ""
      END
  )`;
  const rankCaseString = conversionData?.length === 0 ? "0" : `
  (
      CASE
          ${conversionData.map(conversion => `
          WHEN (cast(floodlight_id as int64) in (${conversion.floodlights.join(",")})) THEN ${conversion.rank}`
          ).join("")}
          ELSE 0
      END
  )`;

  const query = `

    DECLARE organizationId STRING DEFAULT "${dataFilters.organizationId || null}";
    DECLARE partnerIds ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.partnerIds || [])};
    DECLARE advertiserIds ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.advertiserIds || [])};
    DECLARE campaignIds ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.campaignIds || [])};
    DECLARE insertionOrderIds ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.insertionOrderIds || [])};
    DECLARE lineItemIds ARRAY<STRING> DEFAULT ${JSON.stringify(dataFilters.lineItemIds || [])};
    DECLARE startDate DATE DEFAULT "${startDate}";
    DECLARE endDate DATE DEFAULT "${endDate}";



    WITH filtered_data AS (
      SELECT *
      FROM \`ace-insights.data_mart.org_placement_data\`
      WHERE
      line_item_type = "Real-time bidding"
          AND (organizationId IS NULL OR organization_id = organizationId)
          AND (ARRAY_LENGTH(partnerIds) = 0 OR CAST(partner_id AS STRING) IN UNNEST(partnerIds))
          AND (ARRAY_LENGTH(advertiserIds) = 0 OR CAST(advertiser_id AS STRING) IN UNNEST(advertiserIds))
          AND (ARRAY_LENGTH(campaignIds) = 0 OR CAST(campaign_id AS STRING) IN UNNEST(campaignIds))
          AND (ARRAY_LENGTH(insertionOrderIds) = 0 OR CAST(insertion_order_id AS STRING) IN UNNEST(insertionOrderIds))
          AND (ARRAY_LENGTH(lineItemIds) = 0 OR CAST(line_item_id AS STRING) IN UNNEST(lineItemIds))
          AND date BETWEEN startDate AND endDate
    ),

    top_placements AS (
      (
        SELECT
          'Impressions' AS metric,
          app_url_id,
          app_url,
          SUM(Impressions) AS total,
          ROW_NUMBER() OVER (ORDER BY SUM(Impressions) DESC) AS rank
        FROM filtered_data
        GROUP BY app_url_id, app_url
        ORDER BY total DESC
        LIMIT 15
      )
      UNION ALL
      (
        SELECT
          'Clicks' AS metric,
          app_url_id,
          app_url,
          SUM(clicks) AS total,
          ROW_NUMBER() OVER (ORDER BY SUM(clicks) DESC) AS rank
        FROM filtered_data
        GROUP BY app_url_id, app_url
        ORDER BY total DESC
        LIMIT 15
      )
      UNION ALL
      (
        SELECT
          'Revenue' AS metric,
          app_url_id,
          app_url,
          SUM(revenue_advertiser_currency) AS total,
          ROW_NUMBER() OVER (ORDER BY SUM(revenue_advertiser_currency) DESC) AS rank
        FROM filtered_data
        GROUP BY app_url_id, app_url
        ORDER BY total DESC
        LIMIT 15
      )
      UNION ALL
      (
        SELECT
          'Total-Media-Cost' AS metric,
          app_url_id,
          app_url,
          SUM(total_media_cost_advertiser_currency) AS total,
          ROW_NUMBER() OVER (ORDER BY SUM(total_media_cost_advertiser_currency) DESC) AS rank
        FROM filtered_data
        GROUP BY app_url_id, app_url
        ORDER BY total DESC
        LIMIT 15
      )
    ),

    top_conversion_data_raw as (
        SELECT 
            app_url_id,
            app_url,
            ${floodlightCaseString} AS floodlight,
            ${rankCaseString} AS rank_order,
            CONCAT("conversion_", cast(${rankCaseString} as string)) AS metric,
            SUM(${conversionString}) as conversions,
            ROW_NUMBER() over (
                PARTITION BY ${floodlightCaseString}
                ORDER BY SUM(${conversionString}) DESC
            ) AS rank,
        FROM filtered_data
        GROUP BY
            ${
                [
                    "app_url_id",
                    "app_url",
                    "floodlight_id",
                    conversionData.length === 0 ? null : floodlightCaseString,
                    conversionData.length === 0 ? null : rankCaseString,
                ].filter(Boolean).join(",")
            }
        HAVING 
            SUM(${conversionString}) > 0
    ),

    top_conversion_data as (
      SELECT 
          app_url_id,
          app_url,
          rank_order,
          metric,
          rank,
          sum(conversions) as conversions
      FROM top_conversion_data_raw
      WHERE 
        rank <= 15 and
        rank_order > 0
      GROUP BY
          app_url_id,
          app_url,
          rank_order,
          metric,
          rank
    ),

    weekly_data AS (
      SELECT 
        DATE_TRUNC(f.date, WEEK(MONDAY)) AS week_start,
        CONCAT(FORMAT_DATE('%d/%m', DATE_TRUNC(f.date, WEEK(MONDAY))), ' - ', FORMAT_DATE('%d/%m', DATE_ADD(DATE_TRUNC(f.date, WEEK(MONDAY)), INTERVAL 6 DAY))) AS week_label,

        tp.metric,
        f.app_url_id,
        f.app_url,
        tp.rank,

        SUM(CASE WHEN tp.metric = 'Impressions' THEN f.Impressions ELSE 0 END) AS value_impressions,
        SUM(CASE WHEN tp.metric = 'Clicks' THEN f.clicks ELSE 0 END) AS value_clicks,
        SUM(CASE WHEN tp.metric = 'Revenue' THEN f.revenue_advertiser_currency ELSE 0 END) AS value_revenue,
        SUM(CASE WHEN tp.metric = 'Total-Media-Cost' THEN f.total_media_cost_advertiser_currency ELSE 0 END) AS value_tmc,

        SUM(0) as value_conversion_1,
        SUM(0) as value_conversion_2,
        SUM(0) as value_conversion_3,
        SUM(0) as value_conversion_4,

      FROM filtered_data f
      JOIN top_placements tp 
      ON 
        f.app_url_id = tp.app_url_id AND
        tp.app_url = f.app_url AND
        tp.metric IN ('Impressions','Clicks','Revenue','Total-Media-Cost')
      GROUP BY 
        week_label,
        week_start,
        tp.metric,
        f.app_url_id,
        f.app_url,
        tp.rank

      UNION ALL

      SELECT 
        DATE_TRUNC(f.date, WEEK(MONDAY)) AS week_start,
        CONCAT(FORMAT_DATE('%d/%m', DATE_TRUNC(f.date, WEEK(MONDAY))), ' - ', FORMAT_DATE('%d/%m', DATE_ADD(DATE_TRUNC(f.date, WEEK(MONDAY)), INTERVAL 6 DAY))) AS week_label,

        tp.metric,
        f.app_url_id,
        f.app_url,
        tp.rank,

        SUM(0) AS value_impressions,
        SUM(0) AS value_clicks,
        SUM(0) AS value_revenue,
        SUM(0) AS value_tmc,

        SUM(if(tp.rank_order = 1, ${conversionString}, 0)) AS value_conversion_1,
        SUM(if(tp.rank_order = 2, ${conversionString}, 0)) AS value_conversion_2,
        SUM(if(tp.rank_order = 3, ${conversionString}, 0)) AS value_conversion_3,
        SUM(if(tp.rank_order = 4, ${conversionString}, 0)) AS value_conversion_4,

      FROM filtered_data f
      JOIN top_conversion_data tp 
      ON 
        f.app_url_id = tp.app_url_id AND
        tp.app_url = f.app_url AND
        tp.rank is not null
      GROUP BY 
        week_label,
        week_start,
        tp.metric,
        f.app_url_id,
        f.app_url,
        tp.rank
    ),

    final AS (
      SELECT
        week_start,
        week_label,
        metric,
        app_url_id,
        app_url,
        rank,
        value_impressions AS metric_value,
        ROUND(IFNULL(SAFE_DIVIDE(
            value_impressions,
            SUM(value_impressions) OVER (PARTITION BY week_label, metric)
        ), 0) * 100, 2) as share_percentage,
      FROM weekly_data
      WHERE metric = 'Impressions'
      
      UNION ALL

      select
        week_start,
        week_label,
        metric,
        app_url_id,
        app_url,
        rank,
        value_clicks as metric_value,
        ROUND(IFNULL(SAFE_DIVIDE(
            value_clicks,
            SUM(value_clicks) OVER (PARTITION BY week_label, metric)
        ), 0) * 100, 2) as share_percentage,
      from weekly_data
      where metric = 'Clicks'

      UNION ALL

      SELECT
        week_start,
        week_label,
        metric,
        app_url_id,
        app_url,
        rank,
        value_revenue AS metric_value,
        ROUND(IFNULL(SAFE_DIVIDE(
            value_revenue,
            SUM(value_revenue) OVER (PARTITION BY week_label, metric)
        ), 0) * 100, 2) as share_percentage,
      FROM weekly_data
      WHERE metric = 'Revenue'

      UNION ALL

      SELECT
        week_start,
        week_label,
        metric,
        app_url_id,
        app_url,
        rank,
        value_tmc AS metric_value,
        ROUND(IFNULL(SAFE_DIVIDE(
            value_tmc,
            SUM(value_tmc) OVER (PARTITION BY week_label, metric)
        ), 0) * 100, 2) as share_percentage,
      FROM weekly_data
      WHERE metric = 'Total-Media-Cost'

      UNION ALL

      SELECT
        week_start,
        week_label,
        metric,
        app_url_id,
        app_url,
        rank,
        value_conversion_1 AS metric_value,
        ROUND(IFNULL(SAFE_DIVIDE(
            value_conversion_1,
            SUM(value_conversion_1) OVER (PARTITION BY week_label, metric)
        ), 0) * 100, 2) as share_percentage,
      FROM weekly_data
      WHERE metric = 'conversion_1'

      UNION ALL

      SELECT
        week_start,
        week_label,
        metric,
        app_url_id,
        app_url,
        rank,
        value_conversion_2 AS metric_value,
        ROUND(IFNULL(SAFE_DIVIDE(
            value_conversion_2,
            SUM(value_conversion_2) OVER (PARTITION BY week_label, metric)
        ), 0) * 100, 2) as share_percentage,
      FROM weekly_data
      WHERE metric = 'conversion_2'

      UNION ALL

      SELECT
        week_start,
        week_label,
        metric,
        app_url_id,
        app_url,
        rank,
        value_conversion_3 AS metric_value,
        ROUND(IFNULL(SAFE_DIVIDE(
            value_conversion_3,
            SUM(value_conversion_3) OVER (PARTITION BY week_label, metric)
        ), 0) * 100, 2) as share_percentage,
      FROM weekly_data
      WHERE metric = 'conversion_3'

      UNION ALL

      SELECT
        week_start,
        week_label,
        metric,
        app_url_id,
        app_url,
        rank,
        value_conversion_4 AS metric_value,
        ROUND(IFNULL(SAFE_DIVIDE(
            value_conversion_4,
            SUM(value_conversion_4) OVER (PARTITION BY week_label, metric)
        ), 0) * 100, 2) as share_percentage,
      FROM weekly_data
      WHERE metric = 'conversion_4'
    )

    SELECT DISTINCT
      week_start as week,
      week_label,
      app_url_id,
      app_url,
      metric,
      rank,
      metric_value,
      share_percentage
    FROM final
    ORDER BY 
        week_start, 
        metric, 
        share_percentage DESC;
  `;

  try {

    const bigquery = new BigQuery();
    const [job] = await bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();

    assert(rows.length > 0, "Channel-Mix-Trends-Display is empty");

    const channelData = rows.map(row => ({
        ...row,
        week: row.week.value
    }));

    return new Response(
        JSON.stringify({
            channelData: channelData,
            conversionData: conversionData
        }),
        { 
            status: 200,
            headers: { "Content-Type" : "application/json" }
        }
    );

  } catch (error) {
    console.error(`Error while fetching channel-mix-trends-display : ${error}`);
    return new Response(
        JSON.stringify({ error: `Error while fetching channel-mix-trends-display data` }),
        {
            status: 500,
            headers: { "Content-Type" : "application/json" }
        }
    );
  }
}
