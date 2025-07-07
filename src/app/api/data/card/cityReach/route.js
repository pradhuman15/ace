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

        -- Step 1: Base data between selected date range
      WITH base_data AS (
        SELECT DISTINCT
          date,
          insertion_order_id,
          region_id,
          region,
          city_id,
          city,
          SAFE_CAST(reach AS INT64) AS reach,
          SAFE_CAST(freq AS FLOAT64) AS freq
        FROM \`ace-insights.data_mart.org_io_city_reach\`
        WHERE
             (organizationId IS NULL OR organization_id = organizationId)
                AND (ARRAY_LENGTH(partnerIds) = 0 OR CAST(partner_id AS STRING) IN UNNEST(partnerIds))
                AND (ARRAY_LENGTH(advertiserIds) = 0 OR CAST(advertiser_id AS STRING) IN UNNEST(advertiserIds))
                AND (ARRAY_LENGTH(campaignIds) = 0 OR CAST(campaign_id AS STRING) IN UNNEST(campaignIds))
                AND (ARRAY_LENGTH(insertionOrderIds) = 0 OR CAST(insertion_order_id AS STRING) IN UNNEST(insertionOrderIds))
           AND date BETWEEN startDate AND endDate
      ),

      -- Step 2: Start and End data (on specific dates)
      start_data AS (
        SELECT * FROM base_data WHERE date = startDate
      ),
      end_data AS (
        SELECT * FROM base_data WHERE date = endDate
      ),

      -- Step 3: City/Region segregated full data
      region_data AS (
        SELECT * FROM base_data WHERE city_id IS NULL AND reach > 0
      ),
      city_data AS (
        SELECT * FROM base_data WHERE city_id IS NOT NULL AND reach > 0
      ),

      -- Step 4: City/Region Start (only those with valid reach on start_date)
      city_start_data AS (
        SELECT DISTINCT insertion_order_id, region_id, region, city_id, city, reach, freq
        FROM start_data
        WHERE city_id IS NOT NULL AND reach > 0
      ),
      region_start_data AS (
        SELECT DISTINCT insertion_order_id, region_id, region, city_id, city, reach, freq
        FROM start_data
        WHERE city_id IS NULL AND reach > 0
      ),

      -- Step 5: City/Region End (only those with valid reach on end_date)
      city_end_data AS (
        SELECT DISTINCT insertion_order_id, region_id, region, city_id, city, reach, freq
        FROM end_data
        WHERE city_id IS NOT NULL AND reach > 0
      ),
      region_end_data AS (
        SELECT DISTINCT insertion_order_id, region_id, region, city_id, city, reach, freq
        FROM end_data
        WHERE city_id IS NULL AND reach > 0
      ),

      -- Step 6: Forward fill for missing city_start_data


      city_start_filled AS (
        SELECT *
        FROM (
          SELECT *, ROW_NUMBER() OVER (PARTITION BY insertion_order_id, region_id, city_id ORDER BY date ASC) AS rn
          FROM city_data
        )
        WHERE rn = 1
      ),
      final_city_start_data AS (
        SELECT * FROM city_start_data
        UNION DISTINCT
        SELECT 
          f.insertion_order_id, 
          f.region_id, 
          f.region, 
          f.city_id, 
          f.city, 
          f.reach, 
          f.freq
        FROM city_start_filled f
        LEFT JOIN city_start_data d
          ON f.insertion_order_id = d.insertion_order_id
            AND f.region_id = d.region_id
            AND f.city_id = d.city_id
        WHERE d.insertion_order_id IS NULL


      ),

      -- Step 7: Backtrack fill for missing city_end_data
      city_end_filled AS (
        SELECT *
        FROM (
          SELECT *, ROW_NUMBER() OVER (PARTITION BY insertion_order_id, region_id, city_id ORDER BY date DESC) AS rn
          FROM city_data
        )
        WHERE rn = 1
      ),
      final_city_end_data AS (
        SELECT * FROM city_end_data

        UNION DISTINCT

        SELECT 
          f.insertion_order_id, 
          f.region_id, 
          f.region, 
          f.city_id, 
          f.city, 
          f.reach, 
          f.freq
        FROM city_end_filled f
        LEFT JOIN city_end_data d
          ON f.insertion_order_id = d.insertion_order_id
          AND f.region_id = d.region_id
          AND f.city_id = d.city_id
        WHERE d.insertion_order_id IS NULL
      ),

      -- Step 8: Forward fill for missing region_start_data
      region_start_filled AS (
        SELECT *
        FROM (
          SELECT *, ROW_NUMBER() OVER (PARTITION BY insertion_order_id, region_id ORDER BY date ASC) AS rn
          FROM region_data
        )
        WHERE rn = 1
      ),
      final_region_start_data AS (
        SELECT * FROM region_start_data

        UNION DISTINCT

        SELECT 
          f.insertion_order_id, 
          f.region_id, 
          f.region, 
          f.city_id, 
          f.city, 
          f.reach, 
          f.freq
        FROM region_start_filled f
        LEFT JOIN region_start_data d
          ON f.insertion_order_id = d.insertion_order_id
          AND f.region_id = d.region_id
        WHERE d.insertion_order_id IS NULL
      ),

      -- Step 9: Backtrack fill for missing region_end_data
      region_end_filled AS (
        SELECT *
        FROM (
          SELECT *, ROW_NUMBER() OVER (PARTITION BY insertion_order_id, region_id ORDER BY date DESC) AS rn
          FROM region_data
        )
        WHERE rn = 1
      ),
      final_region_end_data AS (
        SELECT * FROM region_end_data

        UNION DISTINCT

        SELECT 
          f.insertion_order_id, 
          f.region_id, 
          f.region, 
          f.city_id, 
          f.city, 
          f.reach, 
          f.freq
        FROM region_end_filled f
        LEFT JOIN region_end_data d
          ON f.insertion_order_id = d.insertion_order_id
          AND f.region_id = d.region_id
        WHERE d.insertion_order_id IS NULL
      ),

      -- Step 10: Final city-level output
      city_output AS (
        SELECT
          start_data.insertion_order_id,
          start_data.region_id,
          start_data.city_id,
          start_data.reach AS start_reach,
          end_data.reach AS end_reach,
          ROUND(SAFE_DIVIDE(end_data.reach - start_data.reach, start_data.reach) * 100, 2) AS reach_percent_change,
          start_data.freq AS start_freq,
          end_data.freq AS end_freq
        FROM final_city_start_data start_data
        JOIN final_city_end_data end_data
          ON start_data.insertion_order_id = end_data.insertion_order_id
          AND start_data.city_id = end_data.city_id
          AND start_data.region_id = end_data.region_id
      ),

      -- Step 11: Final region-level output
      region_output AS (
        SELECT
          start_data.insertion_order_id,
          start_data.region_id,
          CAST(NULL AS INT64) AS city_id,  -- FIXED: match city_output
          start_data.reach AS start_reach,
          end_data.reach AS end_reach,
          ROUND(SAFE_DIVIDE(end_data.reach - start_data.reach, start_data.reach) * 100, 2) AS reach_percent_change,
          start_data.freq AS start_freq,
          end_data.freq AS end_freq
        FROM final_region_start_data start_data
        JOIN final_region_end_data end_data
          ON start_data.insertion_order_id = end_data.insertion_order_id
          AND start_data.region_id = end_data.region_id
      )


      -- Step X1: Deduplicated entity mapping (latest insertion order name)
      , dedup_entity_mapping AS (
        SELECT *
        FROM (
          SELECT *,
                ROW_NUMBER() OVER (PARTITION BY Insertion_Order_ID ORDER BY Date DESC NULLS LAST) AS rn
          FROM \`deeplake-bridge.mapping_metdata.dv3_entity_mapping\`
        )
        WHERE rn = 1
      )

      -- Step X2: Deduplicated city-region mapping (unique per region_id, city_id)
      , dedup_city_region_mapping AS (
        SELECT *
        FROM (
          SELECT *,
                ROW_NUMBER() OVER (PARTITION BY Region_ID, City_ID ORDER BY Region_ID) AS rn
          FROM \`deeplake-bridge.mapping_metdata.dv3_city_region_dma_mapping\`
        )
        WHERE rn = 1
      )

      -- Step 12: Final unioned output
      SELECT 
        co.insertion_order_id,
        co.region_id,
        co.city_id,
        co.start_reach,
        co.end_reach,
        co.reach_percent_change,
        co.start_freq,
        co.end_freq,
        m1.Insertion_Order AS insertion_order_name,
        m2.Region AS region,
        m2.City AS city
      FROM city_output co
      LEFT JOIN dedup_entity_mapping m1
        ON co.insertion_order_id = m1.Insertion_Order_ID
      LEFT JOIN dedup_city_region_mapping m2
        ON co.region_id = m2.Region_ID AND co.city_id = m2.City_ID

      UNION ALL

      SELECT 
        ro.insertion_order_id,
        ro.region_id,
        ro.city_id,
        ro.start_reach,
        ro.end_reach,
        ro.reach_percent_change,
        ro.start_freq,
        ro.end_freq,
        m1.Insertion_Order AS insertion_order_name,
        m2.Region AS region,
        NULL AS city
      FROM region_output ro
      LEFT JOIN dedup_entity_mapping m1
        ON ro.insertion_order_id = m1.Insertion_Order_ID
      LEFT JOIN dedup_city_region_mapping m2
        ON ro.region_id = m2.Region_ID AND m2.City_ID IS NULL
      ;

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

