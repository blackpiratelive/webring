// public/widget.js
// This script will be embedded on member sites to display the webring navigation.

(() => {
  // Get the container element for the widget.
  const widgetContainer = document.getElementById('my-webring');
  if (!widgetContainer) {
    console.error('Webring widget container not found. Please add a div with id="my-webring".');
    return;
  }

  // Define the API base URL. This will be your Vercel deployment URL.
  // The script will try to determine this dynamically.
  const scriptSrc = document.currentScript.src;
  const apiBaseUrl = new URL(scriptSrc).origin;

  // Get the current page's URL to send to the API.
  const currentPageUrl = window.location.href;

  // --- Create the Widget's HTML ---
  widgetContainer.innerHTML = `
    <div style="border: 2px solid #333; padding: 16px; border-radius: 8px; font-family: sans-serif; text-align: center; background-color: #f8f8f8; max-width: 300px; margin: auto;">
      <h3 style="margin: 0 0 12px 0; color: #333;">Webring</h3>
      <nav style="display: flex; justify-content: space-around; align-items: center;">
        <a href="#" data-action="previous" class="webring-link" style="text-decoration: none; color: #007bff; font-weight: bold;">&larr; Previous</a>
        <a href="#" data-action="random" class="webring-link" style="text-decoration: none; color: #007bff; font-weight: bold;">Random</a>
        <a href="#" data-action="next" class="webring-link" style="text-decoration: none; color: #007bff; font-weight: bold;">Next &rarr;</a>
      </nav>
    </div>
  `;

  // --- Add Event Listeners ---
  widgetContainer.querySelectorAll('.webring-link').forEach(link => {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      const action = event.target.getAttribute('data-action');
      
      try {
        // Construct the API URL with query parameters.
        const apiUrl = new URL('/api/webring', apiBaseUrl);
        apiUrl.searchParams.append('url', currentPageUrl);
        apiUrl.searchParams.append('action', action);

        // Show a loading state (optional)
        widgetContainer.querySelector('h3').textContent = 'Finding a site...';

        // Fetch the target URL from the API.
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error('Network response was not ok.');
        }
        const data = await response.json();

        // Redirect to the target URL.
        if (data.targetUrl) {
          window.location.href = data.targetUrl;
        } else {
          throw new Error('No target URL received.');
        }
      } catch (error) {
        console.error('Webring Error:', error);
        widgetContainer.querySelector('h3').textContent = 'Error!';
        // Revert title after a delay
        setTimeout(() => {
             widgetContainer.querySelector('h3').textContent = 'Webring';
        }, 2000);
      }
    });
  });

})();
