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
      line_item_type = "Real-time bidding"
      AND creative_id IS NOT NULL
          AND (organizationId IS NULL OR organization_id = organizationId)
          AND (ARRAY_LENGTH(partnerIds) = 0 OR CAST(partner_id AS STRING) IN UNNEST(partnerIds))
          AND (ARRAY_LENGTH(advertiserIds) = 0 OR CAST(advertiser_id AS STRING) IN UNNEST(advertiserIds))
          AND (ARRAY_LENGTH(campaignIds) = 0 OR CAST(campaign_id AS STRING) IN UNNEST(campaignIds))
          AND (ARRAY_LENGTH(insertionOrderIds) = 0 OR CAST(insertion_order_id AS STRING) IN UNNEST(insertionOrderIds))
          AND (ARRAY_LENGTH(lineItemIds) = 0 OR CAST(line_item_id AS STRING) IN UNNEST(lineItemIds))
          AND date BETWEEN startDate AND endDate
    ),

      compact_creative_data AS (
    SELECT 
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
    GROUP BY creative_id, creative, thumbnail_url
  ),

  total_metrics AS (
    SELECT
      COUNT(*) AS total_creatives,
      SUM(clicks) AS total_clicks,
      SUM(impressions) AS total_impressions,
      SUM(completed_video_views) AS total_completed_views,
      SUM(youtube_views) AS total_youtube_views,
      SUM(total_media_cost_advertiser_currency) AS total_tmc,
      SUM(revenue_advertiser_currency) AS total_revenue
    FROM compact_creative_data
  ),

  topbottomfivecreatives AS (

    -- Clicks 
    -- Block 1: Top Clicks
    (
      SELECT 
        "clicks" AS metrics,
        "top" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "base_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY clicks DESC
      LIMIT 5
    )
    UNION ALL 
    -- Block 2: bottom Clicks
    (
      SELECT 
        "clicks" AS metrics,
        "bottom" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "base_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY clicks ASC
      LIMIT 5
    )
    UNION ALL



    -- Impressions
    -- Block 1: Top impressions
    (
      SELECT 
        "impressions" AS metrics,
        "top" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "base_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY impressions DESC
      LIMIT 5
    )
    UNION ALL 
    -- Block 2: bottom impressions
    (
      SELECT 
        "impressions" AS metrics,
        "bottom" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "base_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY impressions ASC
      LIMIT 5
    )
    UNION ALL 


    -- Completed Video Views
    -- Block 1: Top completed_video_views
    (
      SELECT 
        "Completed Views" AS metrics,
        "top" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "base_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY completed_video_views DESC
      LIMIT 5
    )
    UNION ALL 
    -- Block 2: bottom completed_video_views
    (
      SELECT 
        "Completed Views" AS metrics,
        "bottom" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "base_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY completed_video_views ASC
      LIMIT 5
    )

    UNION ALL
    -- YouTube Views
    -- Block 1: Top youtube_views
    (
      SELECT 
        "Youtube Views" AS metrics,
        "top" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "base_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY youtube_views DESC
      LIMIT 5
    )
        UNION ALL 
    -- Block 2: bottom youtube_views
    (
      SELECT 
        "Youtube Views" AS metrics,
        "bottom" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "base_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY youtube_views ASC
      LIMIT 5
    )


        UNION ALL
    -- total_media_cost_advertiser_currency
    -- Block 1: Top total_media_cost_advertiser_currency
    (
      SELECT 
        "TMC" AS metrics,
        "top" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "base_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY total_media_cost_advertiser_currency DESC
      LIMIT 5
    )
        UNION ALL 
    -- Block 2: bottom total_media_cost_advertiser_currency
    (
      SELECT 
        "TMC" AS metrics,
        "bottom" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "base_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY total_media_cost_advertiser_currency ASC
      LIMIT 5
    )


        UNION ALL
    -- revenue_advertiser_currency
    -- Block 1: Top revenue_advertiser_currency
    (
      SELECT 
        "Revenue" AS metrics,
        "top" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "base_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY revenue_advertiser_currency DESC
      LIMIT 5
    )
        UNION ALL 
    -- Block 2: bottom revenue_advertiser_currency
    (
      SELECT 
        "Revenue" AS metrics,
        "bottom" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "base_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY revenue_advertiser_currency ASC
      LIMIT 5
    )
    UNION ALL


        -- ctr 
    -- Block 1: Top ctr
    (
      SELECT 
        "ctr" AS metrics,
        "top" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "calculated_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY ctr DESC
      LIMIT 5
    )
    UNION ALL 
    -- Block 2: bottom ctr
    (
      SELECT 
        "ctr" AS metrics,
        "bottom" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "calculated_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY ctr ASC
      LIMIT 5
    )
    UNION ALL


    -- vtr 
    -- Block 1: Top vtr
    (
      SELECT 
        "vtr" AS metrics,
        "top" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "calculated_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY vtr DESC
      LIMIT 5
    )
    UNION ALL 
    -- Block 2: bottom vtr
    (
      SELECT 
        "vtr" AS metrics,
        "bottom" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "calculated_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY vtr ASC
      LIMIT 5
    )
    UNION ALL


        -- cpc 
    -- Block 1: Top cpc
    (
      SELECT 
        "cpc" AS metrics,
        "top" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "calculated_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY cpc DESC
      LIMIT 5
    )
    UNION ALL 
    -- Block 2: bottom cpc
    (
      SELECT 
        "cpc" AS metrics,
        "bottom" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "calculated_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY cpc ASC
      LIMIT 5
    )
    UNION ALL

        -- cpv 
    -- Block 1: Top cpv
    (
      SELECT 
        "cpv" AS metrics,
        "top" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "calculated_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY cpv DESC
      LIMIT 5
    )
    UNION ALL 
    -- Block 2: bottom cpv
    (
      SELECT 
        "cpv" AS metrics,
        "bottom" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "calculated_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY cpv ASC
      LIMIT 5
    )
    UNION ALL

        -- true_vtr 
    -- Block 1: Top true_vtr
    (
      SELECT 
        "true_vtr" AS metrics,
        "top" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "calculated_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY true_vtr DESC
      LIMIT 5
    )
    UNION ALL 
    -- Block 2: bottom true_vtr
    (
      SELECT 
        "true_vtr" AS metrics,
        "bottom" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "calculated_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY true_vtr ASC
      LIMIT 5
    )
    UNION ALL

        -- true_cpv 
    -- Block 1: Top true_cpv
    (
      SELECT 
        "true_cpv" AS metrics,
        "top" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "calculated_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY true_cpv DESC
      LIMIT 5
    )
    UNION ALL 
    -- Block 2: bottom true_cpv
    (
      SELECT 
        "true_cpv" AS metrics,
        "bottom" AS ordertype,
        c.creative_id, 
        c.creative,
        c.thumbnail_url,
        c.clicks,
        c.impressions,
        c.completed_video_views,
        c.youtube_views,
        c.total_media_cost_advertiser_currency,
        c.revenue_advertiser_currency,
        "calculated_metric" as type_metric,

          
        -- Computed Metrics with Imputation
        SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1) AS ctr,
        SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1) AS vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1) AS cpc,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1) AS cpv,
        SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1) AS true_vtr,
        SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1) AS true_cpv,

        -- PI Metrics
        SAFE_DIVIDE(SAFE_DIVIDE(c.clicks + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_ctr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.completed_video_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.clicks + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives)) AS pi_cpc,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.completed_video_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives)) AS pi_cpv,
        SAFE_DIVIDE(SAFE_DIVIDE(c.youtube_views + 0.5, c.impressions + 1), SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives)) AS pi_true_vtr,
        SAFE_DIVIDE(SAFE_DIVIDE(c.total_media_cost_advertiser_currency + 0.5, c.youtube_views + 1), SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives)) AS pi_true_cpv,

        -- IPI Metrics
        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_clicks - c.clicks) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_clicks + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_ctr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_completed_views - c.completed_video_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_completed_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_clicks - c.clicks) + 1) * t.total_clicks,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_clicks + 1 * t.total_creatives) * (t.total_clicks - c.clicks)
        ) AS ipi_cpc,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_completed_views - c.completed_video_views) + 1) * t.total_completed_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_completed_views + 1 * t.total_creatives) * (t.total_completed_views - c.completed_video_views)
        ) AS ipi_cpv,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_youtube_views - c.youtube_views) + 0.5, (t.total_impressions - c.impressions) + 1) * t.total_impressions,
          SAFE_DIVIDE(t.total_youtube_views + 0.5 * t.total_creatives, t.total_impressions + 1 * t.total_creatives) * (t.total_impressions - c.impressions)
        ) AS ipi_true_vtr,

        SAFE_DIVIDE(
          SAFE_DIVIDE((t.total_tmc - c.total_media_cost_advertiser_currency) + 0.5, (t.total_youtube_views - c.youtube_views) + 1) * t.total_youtube_views,
          SAFE_DIVIDE(t.total_tmc + 0.5 * t.total_creatives, t.total_youtube_views + 1 * t.total_creatives) * (t.total_youtube_views - c.youtube_views)
        ) AS ipi_true_cpv
      FROM compact_creative_data c
      CROSS JOIN total_metrics t
      ORDER BY true_cpv ASC
      LIMIT 5
    )

  )

  SELECT * FROM topbottomfivecreatives;
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
