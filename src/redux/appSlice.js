import { createSlice, current } from '@reduxjs/toolkit';

const TODAY = new Date();
const END_DATE = TODAY;
const START_DATE = new Date();
START_DATE.setDate(TODAY.getDate() - 180);

const initialState = {
    // AUTH-DISABLE
    organization: { 
        id: "8c15c83a-683e-4577-8fe1-17dd63cbea0b",
        name: "Test-Organization-YP"
    },

    // Filter principles
    // -- Empty means all available - filtered based on permissions
    // -- Non-Empty means specific list
    // -- organizationId can never be null
    // -- if lineItemId is set then advetiserId, campaignId, insertionOrderId is also set ??
    filters : {
        // AUTH-DISABLE
        organizationId: "8c15c83a-683e-4577-8fe1-17dd63cbea0b",
        partnerIds: [],
        advertiserIds: [],
        campaignIds: [],
        insertionOrderIds: [],
        lineItemIds: [],
        dateRange: {
            start: START_DATE.toLocaleDateString("en-CA"),
            end: END_DATE.toLocaleDateString("en-CA")
        }
    }
};

const appSlice = createSlice({
    name: 'app',
    initialState: initialState,
    reducers: {

        // Setting organization
        // -- set the designated organization
        // -- reset all the dashboard filters to their initial-state
        setOrganization(state, action) {
            const organization = {
                id: action.payload.id,
                name: action.payload.name
            }
            state.organization = organization;
            state.filters = {
                ...initialState.filters,
                organizationId: action.payload.id
            }
        },

        setDateFilters(state, action) {
            const startDate = action?.payload?.startDate ?? new Date().setDate(TODAY.getDate() - 180);
            const endDate = action?.payload?.endDate ?? new Date();
            state.filters.dateRange = {
                start: new Date(startDate).toLocaleDateString("en-CA"),
                end: new Date(endDate).toLocaleDateString("en-CA")
            }
        },

        // Add PartnerIds
        addFilterPartnerIds(state, action) {
            const partnerIds = action.payload;
            if (Array.isArray(partnerIds)) {
                const currentPartnerIds = state.filters.partnerIds;
                const newPartnerIds = new Set([
                    ...partnerIds,
                    ...currentPartnerIds
                ]);
                state.filters.partnerIds = [ ...newPartnerIds ];
            } else {
                console.error(`Error adding partners`);
                throw Error(`Error adding partners`)
            }
        },

        // Clear PartnerIds
        clearFilterPartnerIds(state, action) {
            state.filters.partnerIds = [];
        },

        // Set AdvertiserIds 
        setFilterAdvertiserIds(state, action) {
            const advertiserIds = action.payload;
            if (Array.isArray(advertiserIds)) {
                state.filters.advertiserIds = advertiserIds;
            } else {
                console.error(`Error setting filter-advertisers`);
                throw Error(`Error setting filters-advertisers`);
            } 
        },

        // Set CampaignIds 
        setFilterCampaignIds(state, action) {
            const campaignIds = action.payload;
            if (Array.isArray(campaignIds)) {
                state.filters.campaignIds = campaignIds;
            } else {
                console.error(`Error setting filter-campaigns`);
                throw Error(`Error setting filters-campaigns`);
            } 
        },

        // Set InsertionOrderIds 
        setFilterInsertionOrderIds(state, action) {
            const insertionOrderIds = action.payload;
            if (Array.isArray(insertionOrderIds)) {
                state.filters.insertionOrderIds = insertionOrderIds;
            } else {
                console.error(`Error setting filter-insertionOrders`);
                throw Error(`Error setting filters-insertionOrders`);
            } 
        },

        // Add AdvertiserIds
        addFilterAdvertiserIds(state, action) {
            const advertiserIds = action.payload;
            if (Array.isArray(advertiserIds)) {
                const currentAdvertiserIds = state.filters.advertiserIds;
                const newAdvertiserIds = new Set([
                    ...advertiserIds,
                    ...currentAdvertiserIds
                ]);
                state.filters.advertiserIds = [ ...newAdvertiserIds ];
            } else {
                console.error(`Error adding advertisers`);
                throw Error(`Error adding advertisers`)
            }
        },

        // Clear CampaignIds
        clearFilterAdvertiserIds(state, action) {
            state.filters.advertiserIds = [];
        },

        // Add CampaignIds
        addFilterCampaignIds(state, action) {
            const campaignIds = action.payload;
            if (Array.isArray(campaignIds)) {
                const currentCampaignIds = state.filters.campaignIds;
                const newCampaignIds = new Set([
                    ...campaignIds,
                    ...currentCampaignIds
                ]);
                state.filters.campaignIds = [ ...newCampaignIds ];
            } else {
                console.error(`Error adding campaigns`);
                throw Error(`Error adding campaigns`)
            }
        },

        // Clear CampaignIds
        clearFilterCampaignIds(state, action) {
            state.filters.campaignIds = [];
        },

        // Add InsertionOrderIds
        addInsertionOrderIds(state, action) {
            const insertionOrderIds = action.payload;
            if (Array.isArray(insertionOrderIds)) {
                const currentInsertionOrderIds = state.filters.insertionOrderIds;
                const newInsertionOrderIds = new Set([
                    ...insertionOrderIds,
                    ...currentInsertionOrderIds
                ]);
                state.filters.insertionOrderIds = [ ...newInsertionOrderIds ];
            } else {
                console.error(`Error adding insertionOrders`);
                throw Error(`Error adding insertionOrders`)
            }
        },

        // Clear InsertionOrderIds
        clearFilterInsertionOrderIds(state, action) {
            state.filters.insertionOrderIds = [];
        },

        // Add LineItemIds
        addFilterLineItemIds(state, action) {
            const lineItemIds = action.payload;
            if (Array.isArray(lineItemIds)) {
                const currentLineItemIds = state.filters.lineItemIds;
                const newLineItemIds = new Set([
                    ...lineItemIds,
                    ...currentLineItemIds
                ]);
                state.filters.lineItemIds = [ ...newLineItemIds ];
            } else {
                console.error(`Error adding lineItems`);
                throw Error(`Error adding lineItems`)
            }
        },

        // Clear LineItemIds
        clearFilterLineItemIds(state, action) {
            state.filters.lineItemIds = [];
        },

        // Other reducer functions
    },
});

export const {
    setOrganization,

    // Set Filter Entities
    setFilterAdvertiserIds,
    setFilterCampaignIds,
    setFilterInsertionOrderIds,
    setDateFilters,

    // Add Filter Entities
    addFilterPartnerIds,
    addFilterAdvertiserIds,
    addFilterCampaignIds,
    addInsertionOrderIds,
    addFilterLineItemIds,

    // Clear Filter Entities
    clearFilterPartnerIds,
    clearFilterAdvertiserIds,
    clearFilterCampaignIds,
    clearFilterInsertionOrderIds,
    clearFilterLineItemIds,

} = appSlice.actions;
export default appSlice.reducer;
