const websites = [
    "https://website1.com",
    "https://webring.blackpiratex.com",
    "https://website3.com"
  ];

  const previousLink = document.getElementById('previousLink');
  const nextLink = document.getElementById('nextLink');
  const currentWebsite = window.location.href;

  const currentIndex = websites.indexOf(currentWebsite);

  previousLink.href = websites[currentIndex === 0 ? websites.length - 1 : currentIndex - 1];
  nextLink.href = websites[(currentIndex + 1) % websites.length];