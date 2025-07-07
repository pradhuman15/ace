import { BigQuery } from "@google-cloud/bigquery";
import { validateFilters } from "@lib/auth/filters";
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
      FROM \`ace-insights.data_mart.org_youtube_placement_data\`
      WHERE 
     (organizationId IS NULL OR organization_id = organizationId)
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
          placement,
          placement_name,
          SUM(Impressions) AS total,
          ROW_NUMBER() OVER (ORDER BY SUM(Impressions) DESC) AS rank
        FROM filtered_data
        GROUP BY placement, placement_name
        ORDER BY total DESC
        LIMIT 15
      )
      UNION ALL
      (
        SELECT
          'Youtube_Views' AS metric,
          placement,
          placement_name,
          SUM(Youtube_Views) AS total,
          ROW_NUMBER() OVER (ORDER BY SUM(Youtube_Views) DESC) AS rank
        FROM filtered_data
        GROUP BY placement, placement_name
        ORDER BY total DESC
        LIMIT 15
      )
      UNION ALL
      (
        SELECT
          'Tracked_Ads' AS metric,
          placement,
          placement_name,
          SUM(Tracked_Ads) AS total,
          ROW_NUMBER() OVER (ORDER BY SUM(Tracked_Ads) DESC) AS rank
        FROM filtered_data
        GROUP BY placement, placement_name
        ORDER BY total DESC
        LIMIT 15
      )
      UNION ALL
      (
        SELECT
          'Engagements' AS metric,
          placement,
          placement_name,
          SUM(Engagements) AS total,
          ROW_NUMBER() OVER (ORDER BY SUM(Engagements) DESC) AS rank
        FROM filtered_data
        GROUP BY placement, placement_name
        ORDER BY total DESC
        LIMIT 15
      )
    ),

    weekly_data AS (
      SELECT 
        DATE_TRUNC(f.date, WEEK(MONDAY)) AS week_start,
        CONCAT(FORMAT_DATE('%d/%m', DATE_TRUNC(f.date, WEEK(MONDAY))), ' - ', FORMAT_DATE('%d/%m', DATE_ADD(DATE_TRUNC(f.date, WEEK(MONDAY)), INTERVAL 6 DAY))) AS week_label,
        tp.metric,
        f.placement,
        f.placement_name,
        tp.rank,

        SUM(CASE WHEN tp.metric = 'Impressions' THEN f.Impressions ELSE 0 END) AS value_impressions,
        SUM(CASE WHEN tp.metric = 'Youtube_Views' THEN f.Youtube_Views ELSE 0 END) AS value_youtube_views,
        SUM(CASE WHEN tp.metric = 'Tracked_Ads' THEN f.Tracked_Ads ELSE 0 END) AS value_tracked_ads,
        SUM(CASE WHEN tp.metric = 'Engagements' THEN f.Engagements ELSE 0 END) AS value_engagements
      FROM filtered_data f
      JOIN top_placements tp 
        ON f.placement = tp.placement AND tp.placement_name = f.placement_name AND tp.metric IN ('Impressions','Youtube_Views','Tracked_Ads','Engagements')
      GROUP BY week_label, week_start, tp.metric, f.placement, f.placement_name, tp.rank
    ),

    final AS (
      SELECT
        week_start,
        week_label,
        metric,
        placement,
        placement_name,
        rank,
        value_impressions AS metric_value,
        ROUND(IFNULL(SAFE_DIVIDE(
            value_impressions,
            SUM(value_impressions) OVER (PARTITION BY week_label, metric)
        ), 0) * 100, 2) as share_percentage,
      FROM weekly_data
      WHERE metric = 'Impressions'
      
      UNION ALL

      SELECT
        week_start,
        week_label,
        metric,
        placement,
        placement_name,
        rank,
        value_youtube_views AS metric_value,
        ROUND(IFNULL(SAFE_DIVIDE(
            value_youtube_views,
            SUM(value_youtube_views) OVER (PARTITION BY week_label, metric)
        ), 0) * 100, 2) as share_percentage,
      FROM weekly_data
      WHERE metric = 'Youtube_Views'

      UNION ALL

      SELECT
        week_start,
        week_label,
        metric,
        placement,
        placement_name,
        rank,
        value_tracked_ads AS metric_value,
        ROUND(IFNULL(SAFE_DIVIDE(
            value_tracked_ads,
            SUM(value_tracked_ads) OVER (PARTITION BY week_label, metric)
        ), 0) * 100, 2) as share_percentage,
      FROM weekly_data
      WHERE metric = 'Tracked_Ads'

      UNION ALL

      SELECT
        week_start,
        week_label,
        metric,
        placement,
        placement_name,
        rank,
        value_engagements AS metric_value,
        ROUND(IFNULL(SAFE_DIVIDE(
            value_engagements,
            SUM(value_engagements) OVER (PARTITION BY week_label, metric)
        ), 0) * 100, 2) as share_percentage,
      FROM weekly_data
      WHERE metric = 'Engagements'
    )

    SELECT
      week_start as week,
      week_label,
      placement as app_url_id,
      placement_name as app_url,
      metric,
      rank,
      metric_value,
      share_percentage
    FROM final
    WHERE metric_value > 0
    ORDER BY 
        week_start, 
        metric, 
        share_percentage DESC;
  `;

  try {
    const bigquery = new BigQuery();
    const [job] = await bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();

    assert(rows.length > 0, "Channel-Mix-Trends-Youtube is empty");

    const channelData = rows.map(row => ({
        ...row,
        week: row.week.value
    }));

    return new Response(
        JSON.stringify({ channelData: channelData} ),
        { 
            status: 200,
            headers: { "Content-Type" : "application/json" }
        }
    );

  } catch (error) {
    console.error(`Error while fetching channel-mix-trends-youtube : ${error}`);
    return new Response(
        JSON.stringify({ error: `Error while fetching channel-mix-trends-youtube data` }),
        {
            status: 500,
            headers: { "Content-Type" : "application/json" }
        }
    );
  }
}
