const axios = require("axios");
const hubspot = require("@hubspot/api-client");

const CUSTOM_EVENT_DEFINITION_ID = "pe44058143_app_usage";

exports.main = async (context = {}) => {
  const { hs_object_id } = context.parameters;
  const accessToken = process.env["PRIVATE_APP_ACCESS_TOKEN"];

  const hubspotClient = new hubspot.Client({ accessToken });

  const contacts = await fetchAssociatedContacts(accessToken, hs_object_id);

  const response = await fetchAllEventsForContacts({
    hubspotClient,
    contacts,
  });

  const contactsAndEvents = mergeContactsAndEvents({
    contacts,
    eventsResponse: response,
  });

  return contactsAndEvents;
};

const fetchAssociatedContacts = async (token, hs_object_id) => {
  const requestBody = {
    operationName: "GetAssociatedContacts",
    query: QUERY,
    variables: { hsObjectId: hs_object_id },
  };

  const response = await axios.post(
    "https://api.hubapi.com/collector/graphql",
    JSON.stringify(requestBody),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const associatedContacts =
    response.data.data.CRM.p_accounts.associations
      .contact_collection__contact_to_accounts.items;

  return associatedContacts;
};

const fetchEventsForContact = async ({ hubspotClient, contactId }) =>
  await hubspotClient.events.eventsApi.getPage(
    "contact",
    CUSTOM_EVENT_DEFINITION_ID,
    undefined,
    undefined,
    contactId
  );

// todo: stress test - what if 100 contacts?
const fetchAllEventsForContacts = async ({ hubspotClient, contacts }) =>
  await Promise.all(
    contacts.map(
      async (contact) =>
        await fetchEventsForContact({
          hubspotClient,
          contactId: contact.hs_object_id,
        })
    )
  );

const flattenEvents = (events) => events.map((event) => event.results).flat();

const getContactsById = (contacts) =>
  contacts.reduce((contactsById, contact) => {
    contactsById[contact.hs_object_id] = contact;
    return contactsById;
  }, {});

const mergeContactsAndEvents = ({ contacts, eventsResponse }) => {
  const events = flattenEvents(eventsResponse);
  const contactsById = getContactsById(contacts);

  console.log("======= contacts by id =======", contactsById);

  return events
    .reduce((mergedEvents, event) => {
      const contact = contactsById[event.objectId];

      mergedEvents.push({
        email: contact.email,
        firstname: contact.firstname,
        lastname: contact.lastname,
        occurredAt: event.occurredAt,
        ...event.properties,
      });

      return mergedEvents;
    }, [])
    .sort(function (a, b) {
      // Turn your strings into dates, and then subtract them
      // to get a value that is either negative, positive, or zero.
      return new Date(b.occurredAt) - new Date(a.occurredAt);
    });
};

// needs to be a "promise all" after looping through constructing "getEventsForContact"
const getContactEventData = async ({ hubspotClient, contacts }) =>
  contacts.reduce(async (contactsEvents, contact) => {
    const response = await getEventsForContact({
      hubspotClient,
      contactId: contact.hs_object_id,
    });

    const events = response.results;

    const contactEvents = events.map((event) => ({
      email: contact.email,
      firstname: contact.firstname,
      lastname: contact.lastname,
      occurredAt: event.occurredAt,
      ...event.properties,
    }));

    return contactsEvents.push(contactEvents);
  }, []);

// GraphQL query to fetch associations
const QUERY = `
  query GetAssociatedContacts($hsObjectId: String!) {
    CRM {
      p_accounts(uniqueIdentifier: "hs_object_id", uniqueIdentifierValue: $hsObjectId) {
        associations {
          contact_collection__contact_to_accounts(limit: 100) {
            items {
              hs_object_id
              email
              firstname
              lastname
            }
          }
        }
      }
    }
  }
`;
