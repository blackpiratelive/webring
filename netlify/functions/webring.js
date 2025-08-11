// netlify/functions/webring.js
// This is the serverless function that powers the webring.

import { promises as fs } from 'fs';
import path from 'path';

// This is a more reliable way to find files in a serverless environment.
const membersPath = path.join(process.cwd(), 'members.txt');

// The handler for the serverless function.
const handler = async (event) => {
  // --- NEW: Handle the browser's security check (preflight request) ---
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    };
  }

  try {
    // Get the 'url' and 'action' from the query string.
    const { url: currentSiteUrl, action = 'next' } = event.queryStringParameters;

    // Read and parse the list of members.
    const membersFile = await fs.readFile(membersPath, 'utf-8');
    const members = membersFile.split('\n').filter(line => line.trim() !== '');

    if (members.length === 0) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Member list is empty.' }),
      };
    }

    // Find the index of the current site in the members array.
    const currentIndex = members.findIndex(memberUrl => {
        return currentSiteUrl && currentSiteUrl.startsWith(memberUrl);
    });

    let targetUrl;
    let responseBody;

    // Determine the target URL or response based on the requested action.
    switch (action) {
      case 'list':
        responseBody = JSON.stringify({ members });
        break;

      case 'previous':
        if (currentIndex !== -1) {
          const prevIndex = (currentIndex - 1 + members.length) % members.length;
          targetUrl = members[prevIndex];
        } else {
          targetUrl = members[members.length - 1];
        }
        responseBody = JSON.stringify({ targetUrl });
        break;

      case 'random':
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * members.length);
        } while (members.length > 1 && randomIndex === currentIndex);
        targetUrl = members[randomIndex];
        responseBody = JSON.stringify({ targetUrl });
        break;

      case 'next':
      default:
        if (currentIndex !== -1) {
          const nextIndex = (currentIndex + 1) % members.length;
          targetUrl = members[nextIndex];
        } else {
          targetUrl = members[0];
        }
        responseBody = JSON.stringify({ targetUrl });
        break;
    }

    // Return a successful response.
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Allow requests from any domain
        'Content-Type': 'application/json',
      },
      body: responseBody,
    };

  } catch (error) {
    console.error('Failed to process webring request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not load webring members.' }),
    };
  }
};

export { handler };
