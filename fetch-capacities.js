#!/usr/bin/env node
const API_URL = 'https://portal.capacities.io/content/id-list';
const QUERY_URL = 'https://portal.capacities.io/content/query';
const DATABASE_ID = '637aa038-5d8e-4830-b732-60bb0cc00a0f';

const headers = {
  'appversion': 'web-1.56.1',
  'Referer': 'https://app.capacities.io/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'DNT': '1',
  'Content-Type': 'application/json'
};

async function fetchCapacitiesData(ids) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ ids })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

async function queryDatabaseEntries(databaseId) {
  // Using the exact payload structure from the working curl command
  const queryPayload = {
    spaceId: "local_userPersonal_id",
    definition: {
      operation: "general",
      definition: {
        scope: "structures",
        structures: [{
          id: "MediaWebResource",
          collectionIds: [databaseId],
          propertyDefinitions: [],
          databaseTreeInfo: {
            collectionIds: [databaseId],
            defaultDatabaseId: databaseId
          }
        }],
        tagNames: [],
        allDatabaseIds: [databaseId, databaseId],
        allStructureInfos: [{
          id: "MediaWebResource",
          propertyDefinitions: []
        }]
      }
    },
    inUpdate: true,
    isPriority: true,
    permissionScope: {
      type: "database",
      databaseId: databaseId
    }
  };

  const response = await fetch(QUERY_URL, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(queryPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  const entryIds = data.entryObjects?.map(entry => entry.id) || [];
  return entryIds;
}

function extractLinkDetails(components) {
  const links = [];

  for (const component of components) {
    if (component.type === 'MediaWebResource') {
      const props = component.properties;
      const urlMetadata = component.data?.urlMetadata || {};

      links.push({
        id: component.id,
        title: props.title?.val || 'Untitled',
        url: props.media_URLReference?.val || urlMetadata.href || '',
        host: props.media_host?.val || urlMetadata.host || '',
        description: props.description?.val || urlMetadata.description || '',
        image: urlMetadata.image || '',
        logo: urlMetadata.logo || '',
        tags: props.tags?.val?.map(t => t.id) || [],
        createdAt: component.createdAt,
        lastUpdated: component.lastUpdated
      });
    }
  }

  return links;
}

async function main() {
  try {
    // Step 1: Get database info
    const query1Result = await fetchCapacitiesData([DATABASE_ID]);

    const databaseInfo = query1Result.components[0];
    const entriesCount = databaseInfo?.data?.entriesCountCached || 0;
    console.log(`Database has ${entriesCount} cached entries\n`);

    // Step 2: Query database to get entry IDs
    const entryIds = await queryDatabaseEntries(DATABASE_ID);

    if (entryIds.length === 0) {
      console.log('No entries found in database');
      return [];
    }

    // Step 3: Fetch entry data
    const query2Result = await fetchCapacitiesData(entryIds);

    // Step 4: Extract and display link details
    const links = extractLinkDetails(query2Result.components);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`EXTRACTED LINKS (${links.length} total)`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    links.forEach((link, index) => {
      console.log(`${index + 1}. ${link.title}`);
      console.log(`   URL: ${link.url}`);
      console.log(`   Host: ${link.host}`);
      if (link.description) {
        console.log(`   Description: ${link.description.substring(0, 100)}${link.description.length > 100 ? '...' : ''}`);
      }
      if (link.image) {
        console.log(`   Image: ${link.image}`);
      }
      if (link.logo) {
        console.log(`   Logo: ${link.logo}`);
      }
      console.log(`   Created: ${new Date(link.createdAt).toLocaleDateString()}`);
      console.log(`   Updated: ${new Date(link.lastUpdated).toLocaleDateString()}`);
      console.log('');
    });

    return links;

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, queryDatabaseEntries, extractLinkDetails };
