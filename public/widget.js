// public/widget.js
// This script will be embedded on member sites to display the webring navigation.

(() => {
  const widgetContainer = document.getElementById('my-webring');
  if (!widgetContainer) {
    console.error('Webring widget container not found. Please add a div with id="my-webring".');
    return;
  }

  const scriptSrc = document.currentScript.src;
  const apiBaseUrl = new URL(scriptSrc).origin;
  const currentPageUrl = window.location.href;

  // --- Create the Widget's HTML with Pirate Styling ---
  widgetContainer.innerHTML = `
    <style>
      @keyframes widget-jiggle {
        0%, 100% { transform: rotate(0); }
        25% { transform: rotate(-3deg); }
        75% { transform: rotate(3deg); }
      }
      .webring-pirate-widget {
        background-color: #fdf5e6; /* Old Lace */
        border: 4px solid #8B4513; /* SaddleBrown */
        border-radius: 8px;
        padding: 16px;
        font-family: 'Gaegu', cursive, sans-serif;
        text-align: center;
        max-width: 320px;
        margin: auto;
        box-shadow: 5px 5px 10px rgba(0,0,0,0.3);
      }
      .webring-pirate-widget h3 {
        font-family: 'IM Fell English SC', serif;
        font-size: 1.5rem;
        color: #8B0000; /* Dark Red */
        margin: 0 0 12px 0;
        padding-bottom: 5px;
        border-bottom: 2px dashed #8B4513;
      }
      .webring-pirate-widget nav {
        display: flex;
        justify-content: space-around;
        align-items: center;
      }
      .webring-pirate-widget .webring-link {
        text-decoration: none;
        color: #4a2c2a;
        font-weight: bold;
        font-size: 1.1rem;
        transition: transform 0.2s ease-in-out;
      }
      .webring-pirate-widget .webring-link:hover {
        animation: widget-jiggle 0.4s;
        color: #8B0000;
      }
    </style>
    <div class="webring-pirate-widget">
      <h3>Cap'n blackpiratex's WebRing</h3>
      <nav>
        <a href="#" data-action="previous" class="webring-link">&larr; Previous Port</a>
        <a href="#" data-action="random" class="webring-link">Random Isle</a>
        <a href="#" data-action="next" class="webring-link">Next Port &rarr;</a>
      </nav>
    </div>
  `;

  // --- Add Event Listeners ---
  widgetContainer.querySelectorAll('.webring-link').forEach(link => {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      const action = event.target.getAttribute('data-action');
      
      try {
        // UPDATED: The API path is now correct for Netlify.
        const apiUrl = new URL('/.netlify/functions/webring', apiBaseUrl);
        apiUrl.searchParams.append('url', currentPageUrl);
        apiUrl.searchParams.append('action', action);

        // Optional: Show a loading state
        widgetContainer.querySelector('h3').textContent = 'Sailing the seas...';

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Lost at sea!');
        
        const data = await response.json();

        if (data.targetUrl) {
          window.location.href = data.targetUrl;
        } else {
          throw new Error('No map to this island.');
        }
      } catch (error) {
        console.error('Webring Error:', error);
        widgetContainer.querySelector('h3').textContent = 'Cursed Voyage!';
        setTimeout(() => {
             widgetContainer.querySelector('h3').textContent = "Cap'n blackpiratex's WebRing";
        }, 2000);
      }
    });
  });

})();
