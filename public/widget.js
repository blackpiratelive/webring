// public/widget.js
// Official WebSutra Classic Web 1.0 Directory & Webring Widget

(() => {
  const widgetContainer = document.getElementById('my-webring');
  if (!widgetContainer) {
    console.error('Webring widget container not found. Please add a div with id="my-webring".');
    return;
  }

  const scriptSrc = document.currentScript ? document.currentScript.src : 'https://webring.blackpiratex.com/widget.js';
  const apiBaseUrl = new URL(scriptSrc, window.location.href).origin;
  const currentPageUrl = window.location.href;

  widgetContainer.innerHTML = `
    <style>
      .websutra-dir-widget {
        background: #ffffff !important;
        border: 1px solid #7a92a5 !important;
        border-radius: 4px !important;
        padding: 12px 18px !important;
        font-family: Verdana, Arial, sans-serif !important;
        text-align: center !important;
        max-width: 340px !important;
        margin: 12px auto !important;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08) !important;
        color: #003366 !important;
        box-sizing: border-box !important;
      }
      .websutra-dir-widget * {
        box-sizing: border-box !important;
      }
      .websutra-dir-widget h3 {
        font-size: 13px !important;
        font-weight: bold !important;
        color: #003366 !important;
        margin: 0 0 8px 0 !important;
        padding: 0 0 4px 0 !important;
        border: none !important;
        border-bottom: 1px solid #cbd5e1 !important;
        background: transparent !important;
        line-height: 1.4 !important;
      }
      .websutra-dir-widget h3 a, .websutra-dir-widget h3 a:visited {
        color: #003366 !important;
        text-decoration: underline !important;
        background: transparent !important;
      }
      .websutra-dir-widget nav {
        display: flex !important;
        justify-content: space-around !important;
        align-items: center !important;
        gap: 6px !important;
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
        border: none !important;
      }
      .websutra-dir-widget .webring-link, .websutra-dir-widget .webring-link:visited {
        text-decoration: underline !important;
        color: #0000cc !important;
        font-weight: bold !important;
        font-size: 12px !important;
        padding: 2px 4px !important;
        background: transparent !important;
        transition: color 0.15s ease !important;
      }
      .websutra-dir-widget .webring-link:hover {
        color: #cc0000 !important;
      }
    </style>
    <div class="websutra-dir-widget">
      <h3>Member of <a href="${apiBaseUrl}" target="_blank">WebSutra Webring</a></h3>
      <nav>
        <a href="#" data-action="previous" class="webring-link">[ &lt;&lt; Prev ]</a>
        <a href="#" data-action="random" class="webring-link">[ Random ]</a>
        <a href="#" data-action="next" class="webring-link">[ Next &gt;&gt; ]</a>
      </nav>
    </div>
  `;

  widgetContainer.querySelectorAll('.webring-link').forEach(link => {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      const action = event.target.getAttribute('data-action');
      const titleEl = widgetContainer.querySelector('h3');
      const originalTitle = titleEl.innerHTML;
      
      try {
        const apiUrl = new URL('/api/ring', apiBaseUrl);
        apiUrl.searchParams.append('url', currentPageUrl);
        apiUrl.searchParams.append('action', action);
        apiUrl.searchParams.append('json', 'true');

        titleEl.textContent = ' Navigating Webring Directory...';

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Navigation Error');
        
        const data = await response.json();

        if (data.targetUrl) {
          window.location.href = data.targetUrl;
        } else {
          throw new Error('No target site found');
        }
      } catch (error) {
        console.error('Webring Error:', error);
        titleEl.textContent = ' Directory Navigation Error';
        setTimeout(() => {
          titleEl.innerHTML = originalTitle;
        }, 2000);
      }
    });
  });

})();
