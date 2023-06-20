const websites = [
    "https://firstwebsite.com",
    "https://webring-blue.vercel.app/",
    "https://thirdwebsite.com"
  ];
  
  const currentWebsite = window.location.hostname;
  const urlParams = new URLSearchParams(window.location.search);
  const queryParam = urlParams.get('next');
  
  if (queryParam === 'true') {
    const currentIndex = websites.indexOf(currentWebsite);
    const nextIndex = (currentIndex + 1) % websites.length;
    window.location.href = `https://mywebring.com/${websites[nextIndex]}?next=true`;
  } else {
    const previousLink = document.getElementById('previousLink');
    const nextLink = document.getElementById('nextLink');
    const currentIndex = websites.indexOf(currentWebsite);
    previousLink.href = `https://mywebring.com/${websites[currentIndex === 0 ? websites.length - 1 : currentIndex - 1]}?next=true`;
    nextLink.href = `https://mywebring.com/${websites[(currentIndex + 1) % websites.length]}?next=true`;
  }
  