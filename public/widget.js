// public/widget.js
// Official WebSutra Classic Fantasy RPG Webring Widget

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
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Plus+Jakarta+Sans:wght@600;700&display=swap');
      
      .websutra-rpg-widget {
        background: linear-gradient(180deg, #1c120a 0%, #0d0804 100%);
        border: 2px solid #f4c430;
        border-radius: 8px;
        padding: 16px 20px;
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        text-align: center;
        max-width: 340px;
        margin: 12px auto;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.7), 0 0 10px rgba(244, 196, 48, 0.2);
        color: #ffeb99;
      }
      .websutra-rpg-widget h3 {
        font-family: 'Cinzel', serif;
        font-size: 1.15rem;
        color: #f4c430;
        margin: 0 0 10px 0;
        padding-bottom: 6px;
        border-bottom: 1px dashed #997514;
        letter-spacing: 0.5px;
      }
      .websutra-rpg-widget h3 a {
        color: #f4c430;
        text-decoration: none;
      }
      .websutra-rpg-widget nav {
        display: flex;
        justify-content: space-around;
        align-items: center;
        gap: 8px;
      }
      .websutra-rpg-widget .webring-link {
        text-decoration: none;
        color: #ffeb99;
        font-weight: 700;
        font-size: 0.85rem;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.15s ease-in-out;
      }
      .websutra-rpg-widget .webring-link:hover {
        background: rgba(244, 196, 48, 0.15);
        color: #ffffff;
        text-shadow: 0 0 6px rgba(244, 196, 48, 0.6);
      }
    </style>
    <div class="websutra-rpg-widget">
      <h3>🛡️ Member of <a href="${apiBaseUrl}" target="_blank">WebSutra Guild</a></h3>
      <nav>
        <a href="#" data-action="previous" class="webring-link">← Prev Realm</a>
        <a href="#" data-action="random" class="webring-link">🎲 Random</a>
        <a href="#" data-action="next" class="webring-link">Next Realm →</a>
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

        titleEl.textContent = '🔮 Navigating Realm Portals...';

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Portal Error');
        
        const data = await response.json();

        if (data.targetUrl) {
          window.location.href = data.targetUrl;
        } else {
          throw new Error('No Portal Found');
        }
      } catch (error) {
        console.error('Webring Error:', error);
        titleEl.textContent = '⚠️ Portal Sealed!';
        setTimeout(() => {
          titleEl.innerHTML = originalTitle;
        }, 2000);
      }
    });
  });

})();
