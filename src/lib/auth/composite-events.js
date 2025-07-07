import { connectionPool } from "@db";
import { advertisersAreValid } from "./advertisers";
import { floodlightsAreValid } from "./floodlights";

import assert from "assert";

export async function compositeEventsAreValid(compositeEventIds, advertiserId) {
    try {
        const query = `
            select 1
            from composite_events
            where 
                id in (${compositeEventIds.map((_,i) => `$${i+1}`).join(", ")}) and
                advertiser_id = $${compositeEventIds.length + 1}
        `;
        const client = await connectionPool.connect();
        const result = await client.query(query, [ ...compositeEventIds, advertiserId ]);
        client.release();

        // Validating result
        assert(result, "Result is invalid");
        assert(result?.rows, "Result does not have rows");
        assert(Array.isArray(result?.rows), "Result rows are not valid");
        assert(result.rows.length === compositeEventIds.length, "All composite-events are not accounted for");

        return true;

    } catch (error) {
        console.error(`Error validating composite-events : ${error}`);
        return false;
    }
}

export async function validateCompositeEvent(permissions, compositeEvent) {
    try {

        // validate name
        assert(compositeEvent?.name, "Composite-Event name is empty or not existant");

        // validate description
        assert(compositeEvent?.description, "Composite-Event description is empty or not existant");

        // validate advertiserId
        assert(
            (
                compositeEvent?.advertiserId &&
                !isNaN(parseInt(compositeEvent.advertiserId))
            ),
            "Composite-Event advertiserId is empty or not existant or invalid"
        );

        // validate floodlights
        assert(
            (
                compositeEvent?.floodlights &&
                Array.isArray(compositeEvent.floodlights) &&
                compositeEvent.floodlights.every(fl => (fl.id && fl.name && fl.advertiserId)) &&
                compositeEvent.floodlights.every(fl => fl.advertiserId === compositeEvent?.advertiserId)
            ),
            "Composite-Event floodlights is empty or not existant or invalid"
        );

        // validate advertiser
        const advertiserValidity = await advertisersAreValid([compositeEvent.advertiserId]);
        assert(advertiserValidity, "Composite-Event does not have valid advertiserId");

        // validate floodlights
        const floodlightValidity = await floodlightsAreValid(
            compositeEvent.floodlights.map(fl => fl.id),
            compositeEvent.advertiserId
        );
        assert(floodlightValidity, "Composite-Event does not have valid floodlights");

    } catch (error) {
        console.error(`Composite-Event is invalid : ${compositeEvent.id} : ${error}`);
        return error;
    }

    return null;
}

export async function editExistingCompositeEvent(permissions, compositeEvent) {

    const error = await validateCompositeEvent(permissions, compositeEvent);
    if (error) {
        console.error(`Error editing composite-event : ${error}`);
        return { event: null, error : error }
    }

    const client = await connectionPool.connect(); 

    try {
        await client.query("begin");

        // Running update quer for composite-events
        const compositeEventQuery = `
            update composite_events
            set 
                name = $1,
                description = $2,
                advertiser_id = $3,
                updated_at = current_timestamp
            where id = $4
        `;
        const updateResult = await client.query(
            compositeEventQuery, 
            [
                compositeEvent.name,
                compositeEvent.description,
                compositeEvent.advertiserId,
                compositeEvent.id
            ]
        );

        // Delte composite-event-components
        const deleteCompositeEventComponentsQuery = `
            delete 
            from composite_event_components
            where composite_event_components.composite_event_id = $1
        `;
        await client.query(deleteCompositeEventComponentsQuery, [compositeEvent.id]);

        // Insert composite-event-components
        const insertCompositeEventComponents = `
            insert into composite_event_components 
                (composite_event_id, floodlight_id, advertiser_id) values
            ${
                 compositeEvent
                    .floodlights
                    .map((_, i) => `('${compositeEvent.id}', $${i*2 + 1}, $${i*2 + 2})`)
                    .join(",\n")
            }
        `
        const insertResult = await client.query(
            insertCompositeEventComponents, 
            compositeEvent.floodlights
                .map(fl => [fl.id, fl.advertiserId])
                .flatMap(arr => [...arr])
        )

        await client.query("commit");

    } catch (error) {
        await client.query("rollback");
        console.error(`Failed to edit existing composite-event : Error : ${error}`);
        return { event: null, error: error }
    } finally {
        client.release();
    } 

    return { event: compositeEvent, error: null };
}

export async function saveNewCompositeEvent(permissions, compositeEvent) {

    const error = await validateCompositeEvent(permissions, compositeEvent);
    if (error) {
        console.error(`Error editing composite-event : ${error}`);
        return { event: null, error : error }
    }

    let compositeEventId;
    const client = await connectionPool.connect(); 

    try {
        await client.query("begin");

        // Create composite-event
        const createQuery = `
            insert into composite_events 
            (name, description, advertiser_id, created_at, updated_at)
            values ( $1, $2, $3, current_timestamp, current_timestamp )
            returning id
        `;
        const createResult = await client.query(
            createQuery, 
            [
                compositeEvent.name,
                compositeEvent.description,
                compositeEvent.advertiserId,
            ]
        );

        // Validate result of creation
        assert(createResult, "CreateResult is invalid");
        assert(createResult?.rows, "CreateResult rows are invalid");
        assert(Array.isArray(createResult?.rows), "CreateResult rows is not an array");

        compositeEventId = createResult.rows[0].id;

        // Insert composite-event-components
        const insertCompositeEventComponents = `
            insert into composite_event_components 
                (composite_event_id, floodlight_id, advertiser_id) values
            ${
                 compositeEvent
                    .floodlights
                    .map((_, i) => `('${compositeEventId}', $${i*2 + 1}, $${i*2 + 2})`)
                    .join(",\n")
            }
        `;
        const insertResult = await client.query(
            insertCompositeEventComponents, 
            compositeEvent.floodlights
                .map(fl => ({ id: fl.id, advertiserId: fl.advertiserId }))
                .flatMap(fl => [...Object.values(fl)])
        )

        await client.query("commit");

    } catch (error) {
        await client.query("rollback");
        console.error(`Failed to create composite-event : Error : ${error}`);
        return { event: null, error: error }
    } finally {
        client.release();
    }

    return { event: { ...compositeEvent, id:compositeEventId  }, error: null };
}

export async function fetchPermissionCompositeEvents(permissions, organizationId, advertiserId) {
    if (advertiserId) {
        return await fetchCompositeEvents(organizationId, advertiserId);
    } else {
        return await fetchAllCompositeEvents(organizationId);
    }
}

export async function fetchCompositeEvents(organizationId, advertiserId) {

    const client = await connectionPool.connect(); 
    try {
        const query = `
            select 
                composite_event_components.composite_event_id as id,
                composite_events.name, 
                composite_events.advertiser_id,
                composite_events.description,
                advertisers.name as advertiser,
                composite_event_components.floodlight_id,
                floodlights.name as floodlight
            from composite_event_components
            left join composite_events
                on 
                    composite_event_components.composite_event_id = composite_events.id and
                    composite_event_components.advertiser_id = composite_events.advertiser_id
            left join floodlights
                on 
                    composite_event_components.floodlight_id = floodlights.id and
                    composite_event_components.advertiser_id = floodlights.advertiser_id
            left join advertisers
                on composite_events.advertiser_id = advertisers.id
            where composite_events.advertiser_id = $1
        `;

        const result = await client.query(query, [advertiserId]);

        assert(result, "Result is invalid");
        assert(result?.rows, "Result does not have rows");
        assert(Array.isArray(result?.rows), "Result rows are not valid");

        // Extracting result from database
        const compositeEvents = result.rows.map(resultRow => ({
            id: resultRow.id,
            name: resultRow.name,
            advertiserId: resultRow.advertiser_id,
            advertiser: resultRow.advertiser,
            floodlightId: resultRow.floodlight_id,
            floodlight: resultRow.floodlight,
            description: resultRow.description
        }));

        // Consolidating data for composite-event
        const compositeEventMap = compositeEvents.reduce((map, compEvent) => {
            if (!map.hasOwnProperty(compEvent.id)) {
                map[compEvent.id] = {
                    id: compEvent.id,
                    name: compEvent.name,
                    description: compEvent.description,
                    advertiser: compEvent.advertiser,
                    advertiserId: compEvent.advertiserId,
                    floodlights: [
                        { 
                            id: compEvent.floodlightId,
                            name: compEvent.floodlight,
                            advertiserId: compEvent.advertiserId
                        }
                    ]
                }
            } else {
                const currentCompEvent = map[compEvent.id];
                const currentFloodlights = map[compEvent.id].floodlights;
                map[compEvent.id] = {
                    ...currentCompEvent,
                    floodlights: [
                        ...currentFloodlights,
                        { 
                            id: compEvent.floodlightId,
                            name: compEvent.floodlight,
                            advertiserId: compEvent.advertiserId
                        }
                    ]
                }
            }
            return map
        }, {});

        // Converting to Array consolidated list
        const groupedCompositeEvents = Object.values(compositeEventMap);
        return groupedCompositeEvents;

    } catch (error) {
        console.error(`Error while fetching composite-events : ${error}`);
    } finally {
        client.release();
    }

    return [];

}

export async function fetchAllCompositeEvents(organizationId) {

    const client = await connectionPool.connect(); 
    try {
        const query = `
            select 
                composite_event_components.composite_event_id as id,
                composite_events.name, 
                composite_events.advertiser_id,
                composite_events.description,
                advertisers.name as advertiser,
                composite_event_components.floodlight_id,
                floodlights.name as floodlight
            from composite_event_components
            left join composite_events
                on 
                    composite_event_components.composite_event_id = composite_events.id and
                    composite_event_components.advertiser_id = composite_events.advertiser_id
            left join floodlights
                on 
                    composite_event_components.floodlight_id = floodlights.id and
                    composite_event_components.advertiser_id = floodlights.advertiser_id
            left join advertisers
                on composite_events.advertiser_id = advertisers.id
        `;

        const result = await client.query(query);

        assert(result, "Result is invalid");
        assert(result?.rows, "Result does not have rows");
        assert(Array.isArray(result?.rows), "Result rows are not valid");

        // Extracting result from database
        const compositeEvents = result.rows.map(resultRow => ({
            id: resultRow.id,
            name: resultRow.name,
            advertiserId: resultRow.advertiser_id,
            advertiser: resultRow.advertiser,
            floodlightId: resultRow.floodlight_id,
            floodlight: resultRow.floodlight,
            description: resultRow.description
        }));

        // Consolidating data for composite-event
        const compositeEventMap = compositeEvents.reduce((map, compEvent) => {
            if (!map.hasOwnProperty(compEvent.id)) {
                map[compEvent.id] = {
                    id: compEvent.id,
                    name: compEvent.name,
                    description: compEvent.description,
                    advertiser: compEvent.advertiser,
                    advertiserId: compEvent.advertiserId,
                    floodlights: [
                        { 
                            id: compEvent.floodlightId,
                            name: compEvent.floodlight,
                            advertiserId: compEvent.advertiserId
                        }
                    ]
                }
            } else {
                const currentCompEvent = map[compEvent.id];
                const currentFloodlights = map[compEvent.id].floodlights;
                map[compEvent.id] = {
                    ...currentCompEvent,
                    floodlights: [
                        ...currentFloodlights,
                        { 
                            id: compEvent.floodlightId,
                            name: compEvent.floodlight,
                            advertiserId: compEvent.advertiserId
                        }
                    ]
                }
            }
            return map
        }, {});

        // Converting to Array consolidated list
        const groupedCompositeEvents = Object.values(compositeEventMap);
        return groupedCompositeEvents;

    } catch (error) {
        console.error(`Error while fetching composite-events : ${error}`);
    } finally {
        client.release();
    }

    return [];

}

export async function fetchCompositeEvent(organizationId, compositeEventId) {

    const client = await connectionPool.connect();
    try {
        const compositeEventQuery = `
            select 
                composite_events.id,
                composite_events.name,
                composite_events.description,
                composite_events.advertiser_id,
                advertisers.name as advertiser
            from composite_events
            left join advertisers
                on composite_events.advertiser_id = advertisers.id
            where composite_events.id = $1
        `
        const eventComponentsQuery = `
            select 
                composite_event_components.composite_event_id as id,
                composite_event_components.advertiser_id,
                advertisers.name as advertiser,
                composite_event_components.floodlight_id,
                floodlights.name as floodlight
            from composite_event_components
            left join floodlights
            on 
                composite_event_components.floodlight_id = floodlights.id and
                composite_event_components.advertiser_id = floodlights.advertiser_id
            left join advertisers
                on composite_event_components.advertiser_id = advertisers.id
            where composite_event_components.composite_event_id = $1
        `
        const compositeEventResult = await client.query(compositeEventQuery, [compositeEventId]);

        // Validating composite-events
        assert(compositeEventResult, "Composite-Event-Result is invalid");
        assert(compositeEventResult?.rows, "Composite-Event-Result does not have rows");
        assert(Array.isArray(compositeEventResult?.rows), "Composite-Event-Result rows are not valid");
        assert(compositeEventResult.rows.length > 0, "Composite-Event-Result is empty");

        // Querying composite-event components
        const compositeEvent = compositeEventResult.rows[0];
        const eventComponentsResult = await client.query(eventComponentsQuery, [compositeEventId]);

        // Validating composite-event-components
        assert(eventComponentsResult, "Components-Result is invalid");
        assert(eventComponentsResult?.rows, "Components-Result does not have rows");
        assert(Array.isArray(eventComponentsResult?.rows), "Components-Result rows are not valid");

        // Returning composite-events 
        return {
            id: compositeEvent.id,
            name: compositeEvent.name,
            description: compositeEvent.description,
            advertiserId: compositeEvent.advertiser_id,
            advertiser: compositeEvent.advertiser,
            floodlights: eventComponentsResult.rows.map(
                eventComponent => ({
                    id: eventComponent.floodlight_id,
                    name: eventComponent.floodlight,
                    advertiserId: eventComponent.advertiser_id,
                    advertiser: eventComponent.advertiser,
                })
            )
        };

    } catch (error) {
        console.error(`Error while fetching composite-event : Error : ${error}`);
        return null;
    } finally {
        client.release();
    }

    return null;

}
