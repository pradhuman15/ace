import { BigQuery } from "@google-cloud/bigquery";

export async function POST(request) {
  const { filters,insertion_order_id } = await request.json();

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
      DECLARE insertion_order STRING DEFAULT "${insertion_order_id || null}";

    WITH filtered_data AS (
     SELECT date,city_id,city,region_id,region,reach 
     FROM \`ace-insights.data_mart.org_io_city_reach\`
     WHERE CAST(insertion_order_id AS STRING) = CAST(insertion_order AS STRING)
      AND (organizationId IS NULL OR organization_id = organizationId)
      AND (ARRAY_LENGTH(partnerIds) = 0 OR CAST(partner_id AS STRING) IN UNNEST(partnerIds))
      AND (ARRAY_LENGTH(advertiserIds) = 0 OR CAST(advertiser_id AS STRING) IN UNNEST(advertiserIds))
      AND (ARRAY_LENGTH(campaignIds) = 0 OR CAST(campaign_id AS STRING) IN UNNEST(campaignIds))
      AND date BETWEEN startDate AND endDate
    )
    SELECT * FROM filtered_data;
  
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

