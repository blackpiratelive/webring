// api/webring.js
// This is the serverless function that powers the webring.

import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // Get the 'url' and 'action' from the query string.
  const { url: currentSiteUrl, action = 'next' } = req.query;

  try {
    // Find the `members.txt` file in the project's root directory.
    const membersPath = path.join(process.cwd(), 'members.txt');
    
    // Read and parse the list of members.
    const membersFile = await fs.readFile(membersPath, 'utf-8');
    const members = membersFile.split('\n').filter(line => line.trim() !== '');

    if (members.length === 0) {
      return res.status(500).json({ error: 'Member list is empty.' });
    }

    // Set CORS headers to allow the widget to be used on any domain.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Find the index of the current site in the members array.
    const currentIndex = members.findIndex(memberUrl => {
        return currentSiteUrl && currentSiteUrl.startsWith(memberUrl);
    });

    let targetUrl;

    // Determine the target URL based on the requested action.
    switch (action) {
      // NEW: This case handles the request for the full member list.
      case 'list':
        return res.status(200).json({ members });

      case 'previous':
        if (currentIndex !== -1) {
          const prevIndex = (currentIndex - 1 + members.length) % members.length;
          targetUrl = members[prevIndex];
        } else {
          targetUrl = members[members.length - 1];
        }
        break;

      case 'random':
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * members.length);
        } while (members.length > 1 && randomIndex === currentIndex);
        targetUrl = members[randomIndex];
        break;

      case 'next':
      default:
        if (currentIndex !== -1) {
          const nextIndex = (currentIndex + 1) % members.length;
          targetUrl = members[nextIndex];
        } else {
          targetUrl = members[0];
        }
        break;
    }
    
    // Send the target URL back as JSON for navigation actions.
    res.status(200).json({ targetUrl });

  } catch (error) {
    console.error('Failed to process webring request:', error);
    res.status(500).json({ error: 'Could not load webring members.' });
  }
}
