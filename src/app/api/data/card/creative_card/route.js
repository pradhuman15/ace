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

    CREATE TEMP TABLE creative_summary AS
    SELECT
      CASE 
        WHEN line_item_type = "YouTube & partners" THEN "youtube"
        WHEN line_item_type = "Real-time bidding (Video)" THEN "no_youtube"
        WHEN line_item_type = "Real-time bidding" THEN "display"
        ELSE "other"
      END AS type,
      creative_id,
      clicks,
      impressions,
      total_media_cost_advertiser_currency AS spend
    FROM \`ace-insights.data_mart.org_creative_data\`
    WHERE
      creative_id IS NOT NULL
      AND (organizationId IS NULL OR organization_id = organizationId)
      AND (ARRAY_LENGTH(partnerIds) = 0 OR CAST(partner_id AS STRING) IN UNNEST(partnerIds))
      AND (ARRAY_LENGTH(advertiserIds) = 0 OR CAST(advertiser_id AS STRING) IN UNNEST(advertiserIds))
      AND (ARRAY_LENGTH(campaignIds) = 0 OR CAST(campaign_id AS STRING) IN UNNEST(campaignIds))
      AND (ARRAY_LENGTH(insertionOrderIds) = 0 OR CAST(insertion_order_id AS STRING) IN UNNEST(insertionOrderIds))
      AND (ARRAY_LENGTH(lineItemIds) = 0 OR CAST(line_item_id AS STRING) IN UNNEST(lineItemIds))
      AND date BETWEEN startDate AND endDate;

    SELECT
      type,
      COUNT(DISTINCT creative_id) AS creative_count,
      SUM(clicks) AS clicks,
      SUM(impressions) AS impressions,
      SUM(spend) AS spend
    FROM creative_summary
    WHERE type IN ("display", "youtube", "no_youtube")
    and creative_id IS NOT NULL
    GROUP BY type;
  `;

  try {
    const bigquery = new BigQuery();
    const [job] = await bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();
  const output = {
    display: { creative_count: 0, clicks: 0, impressions: 0, spend: 0 },
    youtube: { creative_count: 0, clicks: 0, impressions: 0, spend: 0 },
    no_youtube: { creative_count: 0, clicks: 0, impressions: 0, spend: 0 },
  };

  for (const row of rows) {
    output[row.type] = {
      creative_count: Number(row.creative_count),
      clicks: Number(row.clicks),
      impressions: Number(row.impressions),
      spend: Number(row.spend),
    };
  }

  return new Response(JSON.stringify(output), { status: 200 });
  } catch (error) {
    console.error("Query failed:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}