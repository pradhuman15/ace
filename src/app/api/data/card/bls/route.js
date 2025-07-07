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

    WITH filtered_data AS (
      SELECT *
      FROM \`ace-insights.data_mart.org_bls_data\`
       WHERE
         (organizationId IS NULL OR organization_id = organizationId)
         AND (ARRAY_LENGTH(partnerIds) = 0 OR CAST(partner_id AS STRING) IN UNNEST(partnerIds))
         AND (ARRAY_LENGTH(advertiserIds) = 0 OR CAST(advertiser_id AS STRING) IN UNNEST(advertiserIds))
         AND ( ARRAY_LENGTH(campaignIds) = 0 OR ARRAY_LENGTH(ARRAY( SELECT x FROM UNNEST(campaigns) AS x WHERE x IN UNNEST(ARRAY(SELECT CAST(y AS INT64) FROM UNNEST(campaignIds) AS y)) )) > 0 )
         AND ( ARRAY_LENGTH(insertionOrderIds) = 0 OR ARRAY_LENGTH(ARRAY( SELECT x FROM UNNEST(attachedIOs) AS x WHERE x IN UNNEST(insertionOrderIds) )) > 0 )
         AND flightStartDate <= endDate AND flightEndDate >= startDate
    )
    select * from filtered_data;

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

