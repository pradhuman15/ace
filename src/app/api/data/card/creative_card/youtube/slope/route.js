import { BigQuery } from "@google-cloud/bigquery";

export async function POST(request) {
  const { filters } = await request.json();

  const startDate = filters.dateRange?.start?.split("T")[0];
  const endDate = filters.dateRange?.end?.split("T")[0];




  const query = `
      DECLARE organizationId STRING DEFAULT "${filters.organizationId || null}";
      DECLARE partnerIds ARRAY<STRING> DEFAULT ${JSON.stringify(filters.partnerIds || [])};
      DECLARE advertiserIds ARRAY<STRING> DEFAULT ${JSON.stringify(filters.advertiserIds || [])};
      DECLARE campaignIds ARRAY<STRING> DEFAULT ${JSON.stringify(filters.campaignIds || [])};
      DECLARE insertionOrderIds ARRAY<STRING> DEFAULT ${JSON.stringify(filters.insertionOrderIds || [])};
      DECLARE lineItemIds ARRAY<STRING> DEFAULT ${JSON.stringify(filters.lineItemIds || [])};
      DECLARE startDate DATE DEFAULT "${startDate}";
      DECLARE endDate DATE DEFAULT "${endDate}";

    WITH creative_filtered_data AS (
      SELECT *
      FROM \`ace-insights.data_mart.org_creative_data\`
      WHERE
      line_item_type = "YouTube & partners"
      AND creative_id IS NOT NULL
      AND (organizationId IS NULL OR organization_id = organizationId)
      AND (ARRAY_LENGTH(partnerIds) = 0 OR CAST(partner_id AS STRING) IN UNNEST(partnerIds))
      AND (ARRAY_LENGTH(advertiserIds) = 0 OR CAST(advertiser_id AS STRING) IN UNNEST(advertiserIds))
      AND (ARRAY_LENGTH(campaignIds) = 0 OR CAST(campaign_id AS STRING) IN UNNEST(campaignIds))
      AND (ARRAY_LENGTH(insertionOrderIds) = 0 OR CAST(insertion_order_id AS STRING) IN UNNEST(insertionOrderIds))
      AND (ARRAY_LENGTH(lineItemIds) = 0 OR CAST(line_item_id AS STRING) IN UNNEST(lineItemIds))
      AND date BETWEEN startDate AND endDate
    ),

        
    raw_impressions_total AS (
      SELECT
        creative_id,
        SUM(impressions) AS raw_impressions
      FROM creative_filtered_data
      GROUP BY creative_id
    ),

    raw_impressions_daily AS (
      SELECT
        creative_id,
        date,
        SUM(impressions) AS raw_impression
      FROM creative_filtered_data
      GROUP BY creative_id, date
    ),

    compact_creative_data AS (
      SELECT 
        date,
        creative_id,
        creative,
        thumbnail_url,
        SUM(clicks) AS clicks,
        SUM(impressions) AS impressions,
        SUM(completed_video_views) AS completed_video_views,
        SUM(youtube_views) AS youtube_views,
        SUM(total_media_cost_advertiser_currency) AS total_media_cost_advertiser_currency,
        SUM(revenue_advertiser_currency) AS revenue_advertiser_currency
      FROM creative_filtered_data
      GROUP BY date, creative_id, creative, thumbnail_url
    ),

    indexed_data AS (
      SELECT *,
        DATE_DIFF(date, MIN(date) OVER (PARTITION BY creative_id), DAY) AS day_index
      FROM compact_creative_data
    ),

    derived_metrics_data AS (
      SELECT *,
        SAFE_DIVIDE(clicks, impressions) AS ctr,
        SAFE_DIVIDE(completed_video_views, impressions) AS vtr,
        SAFE_DIVIDE(total_media_cost_advertiser_currency, completed_video_views) AS cpv,
        SAFE_DIVIDE(youtube_views, impressions) AS true_vtr,
        SAFE_DIVIDE(total_media_cost_advertiser_currency, youtube_views) AS true_cpv,
        SAFE_DIVIDE(total_media_cost_advertiser_currency, clicks) AS cpc,
        impressions - LAG(impressions) OVER (PARTITION BY creative_id ORDER BY date) AS impressions_day_on_day
      FROM indexed_data
    ),

    metric_slopes AS (
      SELECT creative_id, 'impressions' AS metric,
        COVAR_POP(day_index, impressions) / NULLIF(VAR_POP(day_index), 0) AS slope
      FROM derived_metrics_data GROUP BY creative_id

      UNION ALL SELECT creative_id, 'clicks',
        COVAR_POP(day_index, clicks) / NULLIF(VAR_POP(day_index), 0)
      FROM derived_metrics_data GROUP BY creative_id

      UNION ALL SELECT creative_id, 'completed_video_views',
        COVAR_POP(day_index, completed_video_views) / NULLIF(VAR_POP(day_index), 0)
      FROM derived_metrics_data GROUP BY creative_id

      UNION ALL SELECT creative_id, 'youtube_views',
        COVAR_POP(day_index, youtube_views) / NULLIF(VAR_POP(day_index), 0)
      FROM derived_metrics_data GROUP BY creative_id

      UNION ALL SELECT creative_id, 'total_media_cost_advertiser_currency',
        COVAR_POP(day_index, total_media_cost_advertiser_currency) / NULLIF(VAR_POP(day_index), 0)
      FROM derived_metrics_data GROUP BY creative_id

      UNION ALL SELECT creative_id, 'revenue_advertiser_currency',
        COVAR_POP(day_index, revenue_advertiser_currency) / NULLIF(VAR_POP(day_index), 0)
      FROM derived_metrics_data GROUP BY creative_id

      UNION ALL
      SELECT creative_id, metric, slope FROM (
        SELECT creative_id, 'ctr' AS metric,
          COVAR_POP(day_index, ctr) / NULLIF(VAR_POP(day_index), 0) AS slope
        FROM derived_metrics_data
        WHERE ctr IS NOT NULL AND NOT IS_INF(ctr)
        GROUP BY creative_id

        UNION ALL

        SELECT creative_id, 'vtr',
          COVAR_POP(day_index, vtr) / NULLIF(VAR_POP(day_index), 0)
        FROM derived_metrics_data
        WHERE vtr IS NOT NULL AND NOT IS_INF(vtr)
        GROUP BY creative_id

        UNION ALL

        SELECT creative_id, 'cpv',
          COVAR_POP(day_index, cpv) / NULLIF(VAR_POP(day_index), 0)
        FROM derived_metrics_data
        WHERE cpv IS NOT NULL AND NOT IS_INF(cpv)
        GROUP BY creative_id

        UNION ALL

        SELECT creative_id, 'true_vtr',
          COVAR_POP(day_index, true_vtr) / NULLIF(VAR_POP(day_index), 0)
        FROM derived_metrics_data
        WHERE true_vtr IS NOT NULL AND NOT IS_INF(true_vtr)
        GROUP BY creative_id

        UNION ALL

        SELECT creative_id, 'true_cpv',
          COVAR_POP(day_index, true_cpv) / NULLIF(VAR_POP(day_index), 0)
        FROM derived_metrics_data
        WHERE true_cpv IS NOT NULL AND NOT IS_INF(true_cpv)
        GROUP BY creative_id

        UNION ALL

        SELECT creative_id, 'cpc',
          COVAR_POP(day_index, cpc) / NULLIF(VAR_POP(day_index), 0)
        FROM derived_metrics_data
        WHERE cpc IS NOT NULL AND NOT IS_INF(cpc)
        GROUP BY creative_id
      )
    ),

    top_bottom_creatives_by_metric AS (
      SELECT creative_id, metric FROM (
        SELECT creative_id, metric, slope,
          RANK() OVER (PARTITION BY metric ORDER BY slope DESC) AS rank_desc,
          RANK() OVER (PARTITION BY metric ORDER BY slope ASC) AS rank_asc
        FROM metric_slopes
        WHERE slope IS NOT NULL
      )
      WHERE rank_desc <= 5 OR rank_asc <= 5
    ),

    final_data AS (
      SELECT 
        d.date,
        d.creative_id,
        d.creative,
        d.thumbnail_url,
        d.day_index,
        d.impressions_day_on_day,
        s.metric,
        CASE s.metric
          WHEN 'impressions' THEN d.impressions
          WHEN 'clicks' THEN d.clicks
          WHEN 'completed_video_views' THEN d.completed_video_views
          WHEN 'youtube_views' THEN d.youtube_views
          WHEN 'total_media_cost_advertiser_currency' THEN d.total_media_cost_advertiser_currency
          WHEN 'revenue_advertiser_currency' THEN d.revenue_advertiser_currency
          WHEN 'ctr' THEN d.ctr
          WHEN 'vtr' THEN d.vtr
          WHEN 'cpv' THEN d.cpv
          WHEN 'true_vtr' THEN d.true_vtr
          WHEN 'true_cpv' THEN d.true_cpv
          WHEN 'cpc' THEN d.cpc
        END AS value,
        s.slope
      FROM derived_metrics_data d
      JOIN metric_slopes s 
        ON d.creative_id = s.creative_id AND s.metric IS NOT NULL
      JOIN top_bottom_creatives_by_metric t 
        ON d.creative_id = t.creative_id AND s.metric = t.metric
    )

    SELECT 
      f.*,
      rt.raw_impressions  -- attach total raw impressions only once
    FROM final_data f
    LEFT JOIN raw_impressions_total rt
      ON f.creative_id = rt.creative_id
    ORDER BY f.creative_id, f.metric, f.date;


  `;

  try {
    const bigquery = new BigQuery();
    const [job] = await bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();
    return new Response(JSON.stringify(rows), { status: 200 });
  } catch (error) {
    console.error("Query failed:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
