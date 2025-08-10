// api/webring.js
// This is the serverless function that powers the webring.

import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // Get the 'url' and 'action' from the query string.
  // 'url' is the current site the user is on.
  // 'action' is 'next', 'previous', or 'random'.
  const { url: currentSiteUrl, action = 'next' } = req.query;

  try {
    // Find the `members.txt` file in the project's root directory.
    // Vercel places the project root in `/var/task/` for serverless functions.
    const membersPath = path.join(process.cwd(), 'members.txt');
    
    // Read and parse the list of members.
    const membersFile = await fs.readFile(membersPath, 'utf-8');
    const members = membersFile.split('\n').filter(line => line.trim() !== ''); // Filter out empty lines

    if (members.length === 0) {
      return res.status(500).json({ error: 'Member list is empty.' });
    }

    // Find the index of the current site in the members array.
    const currentIndex = members.findIndex(memberUrl => {
        // Match if the member URL is a prefix of the current site URL
        return currentSiteUrl && currentSiteUrl.startsWith(memberUrl);
    });

    let targetUrl;

    // Determine the target URL based on the requested action.
    switch (action) {
      case 'previous':
        if (currentIndex !== -1) {
          const prevIndex = (currentIndex - 1 + members.length) % members.length;
          targetUrl = members[prevIndex];
        } else {
          // If the current site isn't in the ring, go to the last member.
          targetUrl = members[members.length - 1];
        }
        break;

      case 'random':
        // Select a random member, but don't select the current one.
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
          // If the current site isn't in the ring, go to the first member.
          targetUrl = members[0];
        }
        break;
    }

    // Set CORS headers to allow the widget to be used on any domain.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Send the target URL back as JSON.
    res.status(200).json({ targetUrl });

  } catch (error) {
    console.error('Failed to process webring request:', error);
    res.status(500).json({ error: 'Could not load webring members.' });
  }
}
