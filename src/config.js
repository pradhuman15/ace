export const numberFormatter = new Intl.NumberFormat(
    "en-US", 
    {
        notation:"compact",
        maximumFractionDigits:2
    } 
);
export const percentageFormatter = new Intl.NumberFormat(
    "en-US",
    {
        style:"percent",
        minimumFractionDigits:2,
        maximumFractionDigits:2
    }
);
export const rupeeFormatter = new Intl.NumberFormat(
    "en-US", 
    { 
        style:"currency",
        currency:"INR",
        notation:"compact",
        maximumFractionDigits:2
    } 
);

export const METRIC_NAMES = [
    "Spends",
    "Impressions",
    "Clicks",
    "Views",
    "CPM",
    "CPV",
    "CTR",
    "VTR"
]

export const PERCENTAGE_METRICS = [ "CTR", "VTR" ];
export const MONETARY_METRICS = [ "Spends", "CPM", "CPV" ];

export const TTC_WINDOW_OPTIONS = [
    { id: "1h",  label: "1 Hour (1h)" },
    { id: "1d",  label: "1 Day (1d)" },
    { id: "3d",  label: "3 Day (3d)" },
    { id: "7d",  label: "7 Day (7d)" },
    { id: "30d", label: "30 Day (30d)" },
]

export const TIME_UNIT_MAP = {
    "TIME_UNIT_DAYS": "Days",
    "TIME_UNIT_HOURS": "Hours",
    "TIME_UNIT_LIFETIME" : "Lifetime",
    "TIME_UNIT_MONTHS" : "Months",
    "TIME_UNIT_UNSPECIFIED": "Unknown",
    "TIME_UNIT_WEEKS" : "Weeks"
}

export const CAMPAIGN_REACH_METRICS = [
    {
        id: "impressions",
        name: "Impressions",
        formatter: value => numberFormatter.format(value),
        getName: row => "Impressions",
        getValue: row => row?.impressions ?? 0
    },
    {
        id: "cumlativeReach1Plus",
        name: "Reach (1+)",
        formatter: value => numberFormatter.format(value),
        getName: row => "Reach (1+)",
        getValue: row => row?.cumlativeReach1Plus ?? 0
    },
    {
        id: "cumlativeReach3Plus",
        name: "Reach (3+)",
        formatter: value => numberFormatter.format(value),
        getName: row => "Reach (3+)",
        getValue: row => row?.cumlativeReach3Plus ?? 0
    },
    {
        id: "ratio",
        name: "Reach Ratio",
        formatter: value => percentageFormatter.format(value),
        getName: row => "Reach Ratio",
        getValue: row => row?.ratio ?? 0
    },
]

export const CONVERSION_FUNNEL_METRICS = [
    {
        id: "conversions",
        name: "Conversions",
        formatter: value => numberFormatter.format(value)
    },
    {
        id: "cpa",
        name: "CPA",
        formatter: value => rupeeFormatter.format(value)
    },
    {
        id: "floodlightLoads",
        name: "Floodlight Loads",
        formatter: value => numberFormatter.format(value)
    },
]

export const CAMPAIGN_PERFORMANCE_METRICS = [
    {
        id: "spends",
        name: "Spends",
        formatter: value => rupeeFormatter.format(value),
        getName: row => "Spends",
        getValue: row => row?.spends ?? 0,
    },
    {
        id: "impressions",
        name: "Impressions",
        formatter: value => numberFormatter.format(value),
        getName: row => "Impressions",
        getValue: row => row?.impressions ?? 0,
    },
    {
        id: "clicks",
        name: "Clicks",
        formatter: value => numberFormatter.format(value),
        getName: row => "Clicks",
        getValue: row => row?.clicks ?? 0,
    },
    {
        id: "views",
        name: "Views",
        formatter: value => numberFormatter.format(value),
        getName: row => "Views",
        getValue: row => row?.views ?? 0,
    },
    {
        id: "cpm",
        name: "CPM",
        formatter: value => rupeeFormatter.format(value),
        getName: row => "CPM",
        getValue: row => row?.cpm ?? 0,
    },
    {
        id: "cpv",
        name: "CPV",
        formatter: value => rupeeFormatter.format(value),
        getName: row => "CPV",
        getValue: row => row?.cpv ?? 0,
    },
    {
        id: "ctr",
        name: "CTR",
        formatter: value => percentageFormatter.format(value),
        getName: row => "CTR",
        getValue: row => row?.ctr ?? 0,
    },
    {
        id: "vtr",
        name: "VTR",
        formatter: value => percentageFormatter.format(value),
        getName: row => "VTR",
        getValue: row => row?.vtr ?? 0,
    },
    {
        id: "true_views",
        name: "True Views",
        formatter: value => numberFormatter.format(value),
        getName: row => "True Views",
        getValue: row => row?.true_views ?? 0,
    },
    {
        id: "true_view_vtr",
        name: "True View VTR",
        formatter: value => percentageFormatter.format(value),
        getName: row => "True View VTR",
        getValue: row => row?.true_view_vtr ?? 0,
    },
    {
        id: "conversion_1",
        name: "Conversion 1",
        formatter: value => numberFormatter.format(value),
        getName: row => (
            row?.["conversion_1"]?.floodlight ? `Conv : ${row["conversion_1"].floodlight}` : ""
        ),
        getSmallName: row => {
            const input = row?.["conversion_1"]?.floodlight ?? ""
            const numberMatch = input.match(/\((\d+)\)$/);
            const numberPart = numberMatch ? numberMatch[0] : '';
            const baseString = numberPart.length > 0 ? input.slice(0, -numberPart.length) : input;
            return numberPart.length > 0 ? `Conv : ${baseString} ... ${numberPart}` : `Conv : ${input}`
        },
        getShortName: row => {
            const input = row?.["conversion_1"]?.floodlight ?? ""
            const numberMatch = input.match(/\((\d+)\)$/);
            const numberPart = numberMatch ? numberMatch[0] : '';
            // const baseString = numberPart.length > 0 ? input.slice(0, -numberPart.length) : input;
            return numberPart.length > 0 ? `Conv : ${numberPart}` : `Conv : ${input}`
        },
        getValue: row => row?.["conversion_1"]?.conversions ?? 0,
    },
    {
        id: "cpa_1",
        name: "CPA 1",
        formatter: value => rupeeFormatter.format(value),
        getName: row => (
            row?.["conversion_1"]?.floodlight ? `CPA: ${row["conversion_1"].floodlight}` : ""
        ),
        getSmallName: row => {
            const input = row?.["conversion_1"]?.floodlight ?? ""
            const numberMatch = input.match(/\((\d+)\)$/);
            const numberPart = numberMatch ? numberMatch[0] : '';
            const baseString = numberPart.length > 0 ? input.slice(0, -numberPart.length) : input;
            return numberPart.length > 0 ? `CPA : ${baseString} ... ${numberPart}` : `CPA : ${input}`
        },
        getShortName: row => {
            const input = row?.["conversion_1"]?.floodlight ?? ""
            const numberMatch = input.match(/\((\d+)\)$/);
            const numberPart = numberMatch ? numberMatch[0] : '';
            // const baseString = numberPart.length > 0 ? input.slice(0, -numberPart.length) : input;
            return numberPart.length > 0 ? `CPA: ${numberPart}` : `CPA : ${input}`
        },
        getValue: row => (
            !row?.["conversion_1"]?.conversions ? 0 :
            !row?.["spends"] ? 0 :
            row.spends / row["conversion_1"].conversions
        )
    },
    {
        id: "conversion_2",
        name: "Conversion 2",
        formatter: value => numberFormatter.format(value),
        getName: row => (
            row?.["conversion_2"]?.floodlight ? `Conv : ${row["conversion_2"].floodlight}` : ""
        ),
        getSmallName: row => {
            const input = row?.["conversion_2"]?.floodlight ?? ""
            const numberMatch = input.match(/\((\d+)\)$/);
            const numberPart = numberMatch ? numberMatch[0] : '';
            const baseString = numberPart.length > 0 ? input.slice(0, -numberPart.length) : input;
            return numberPart.length > 0 ? `Conv : ${baseString} ... ${numberPart}` : `Conv : ${input}`
        },
        getShortName: row => {
            const input = row?.["conversion_2"]?.floodlight ?? ""
            const numberMatch = input.match(/\((\d+)\)$/);
            const numberPart = numberMatch ? numberMatch[0] : '';
            // const baseString = numberPart.length > 0 ? input.slice(0, -numberPart.length) : input;
            return numberPart.length > 0 ? `Conv : ${numberPart}` : `Conv : ${input}`
        },
        getValue: row => row?.["conversion_2"]?.conversions ?? 0,
    },
    {
        id: "cpa_2",
        name: "CPA 2",
        formatter: value => rupeeFormatter.format(value),
        getName: row => (
            row?.["conversion_2"]?.floodlight ? `CPA: ${row["conversion_2"].floodlight}` : ""
        ),
        getSmallName: row => {
            const input = row?.["conversion_2"]?.floodlight ?? ""
            const numberMatch = input.match(/\((\d+)\)$/);
            const numberPart = numberMatch ? numberMatch[0] : '';
            const baseString = numberPart.length > 0 ? input.slice(0, -numberPart.length) : input;
            return numberPart.length > 0 ? `CPA : ${baseString} ... ${numberPart}` : `CPA : ${input}`
        },
        getShortName: row => {
            const input = row?.["conversion_2"]?.floodlight ?? ""
            const numberMatch = input.match(/\((\d+)\)$/);
            const numberPart = numberMatch ? numberMatch[0] : '';
            // const baseString = numberPart.length > 0 ? input.slice(0, -numberPart.length) : input;
            return numberPart.length > 0 ? `CPA: ${numberPart}` : `CPA : ${input}`
        },
        getValue: row => (
            !row?.["conversion_2"]?.conversions ? 0 :
            !row?.["spends"] ? 0 :
            row.spends / row["conversion_2"].conversions
        )
    },
    {
        id: "conversion_3",
        name: "Conversion 3",
        formatter: value => numberFormatter.format(value),
        getName: row => (
            row?.["conversion_3"]?.floodlight ? `Conv : ${row["conversion_3"].floodlight}` : ""
        ),
        getSmallName: row => {
            const input = row?.["conversion_3"]?.floodlight ?? ""
            const numberMatch = input.match(/\((\d+)\)$/);
            const numberPart = numberMatch ? numberMatch[0] : '';
            const baseString = numberPart.length > 0 ? input.slice(0, -numberPart.length) : input;
            return numberPart.length > 0 ? `Conv : ${baseString} ... ${numberPart}` : `Conv : ${input}`
        },
        getShortName: row => {
            const input = row?.["conversion_3"]?.floodlight ?? ""
            const numberMatch = input.match(/\((\d+)\)$/);
            const numberPart = numberMatch ? numberMatch[0] : '';
            // const baseString = numberPart.length > 0 ? input.slice(0, -numberPart.length) : input;
            return numberPart.length > 0 ? `Conv : ${numberPart}` : `Conv : ${input}`
        },
        getValue: row => row?.["conversion_3"]?.conversions ?? 0,
    },
    {
        id: "cpa_3",
        name: "CPA 3",
        formatter: value => rupeeFormatter.format(value),
        getName: row => (
            row?.["conversion_3"]?.floodlight ? `CPA: ${row["conversion_3"].floodlight}` : ""
        ),
        getSmallName: row => {
            const input = row?.["conversion_3"]?.floodlight ?? ""
            const numberMatch = input.match(/\((\d+)\)$/);
            const numberPart = numberMatch ? numberMatch[0] : '';
            const baseString = numberPart.length > 0 ? input.slice(0, -numberPart.length) : input;
            return numberPart.length > 0 ? `CPA : ${baseString} ... ${numberPart}` : `CPA : ${input}`
        },
        getShortName: row => {
            const input = row?.["conversion_3"]?.floodlight ?? ""
            const numberMatch = input.match(/\((\d+)\)$/);
            const numberPart = numberMatch ? numberMatch[0] : '';
            // const baseString = numberPart.length > 0 ? input.slice(0, -numberPart.length) : input;
            return numberPart.length > 0 ? `CPA: ${numberPart}` : `CPA : ${input}`
        },
        getValue: row => (
            !row?.["conversion_3"]?.conversions ? 0 :
            !row?.["spends"] ? 0 :
            row.spends / row["conversion_3"].conversions
        )
    },
    {
        id: "conversion_4",
        name: "Conversion 4",
        formatter: value => numberFormatter.format(value),
        getName: row => (
            row?.["conversion_4"]?.floodlight ? `Conv : ${row["conversion_4"].floodlight}` : ""
        ),
        getSmallName: row => {
            const input = row?.["conversion_4"]?.floodlight ?? ""
            const numberMatch = input.match(/\((\d+)\)$/);
            const numberPart = numberMatch ? numberMatch[0] : '';
            const baseString = numberPart.length > 0 ? input.slice(0, -numberPart.length) : input;
            return numberPart.length > 0 ? `Conv : ${baseString} ... ${numberPart}` : `Conv : ${input}`
        },
        getShortName: row => {
            const input = row?.["conversion_4"]?.floodlight ?? ""
            const numberMatch = input.match(/\((\d+)\)$/);
            const numberPart = numberMatch ? numberMatch[0] : '';
            // const baseString = numberPart.length > 0 ? input.slice(0, -numberPart.length) : input;
            return numberPart.length > 0 ? `Conv : ${numberPart}` : `Conv : ${input}`
        },
        getValue: row => row?.["conversion_4"]?.conversions ?? 0,
    },
    {
        id: "cpa_4",
        name: "CPA 4",
        formatter: value => rupeeFormatter.format(value),
        getName: row => (
            row?.["conversion_4"]?.floodlight ? `CPA: ${row["conversion_4"].floodlight}` : ""
        ),
        getSmallName: row => {
            const input = row?.["conversion_4"]?.floodlight ?? ""
            const numberMatch = input.match(/\((\d+)\)$/);
            const numberPart = numberMatch ? numberMatch[0] : '';
            const baseString = numberPart.length > 0 ? input.slice(0, -numberPart.length) : input;
            return numberPart.length > 0 ? `CPA : ${baseString} ... ${numberPart}` : `CPA : ${input}`
        },
        getShortName: row => {
            const input = row?.["conversion_4"]?.floodlight ?? ""
            const numberMatch = input.match(/\((\d+)\)$/);
            const numberPart = numberMatch ? numberMatch[0] : '';
            // const baseString = numberPart.length > 0 ? input.slice(0, -numberPart.length) : input;
            return numberPart.length > 0 ? `CPA: ${numberPart}` : `CPA : ${input}`
        },
        getValue: row => (
            !row?.["conversion_4"]?.conversions ? 0 :
            !row?.["spends"] ? 0 :
            row.spends / row["conversion_4"].conversions
        )
    },
]

