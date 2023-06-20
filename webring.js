// Define the array of websites heyyy
const websites = [
    'status.blackpiratex.com',
    'https://webring-blue.vercel.app/',
    'blackpiratex.com',
    'gallery.blackpiratex.com'
  ];
  
  // Get the current URL and query parameters
  const currentURL = window.location.href;
  const url = new URL(currentURL);
  const queryParams = url.searchParams;
  
  // Check if 'next' or 'previous' parameters are present
  if (queryParams.has('next')) {
    // Find the index of the current URL in the array
    const currentIndex = websites.findIndex(site => site === currentURL);
  
    // Calculate the index of the next URL, considering array bounds
    const nextIndex = (currentIndex + 1) % websites.length;
  
    // Redirect to the next URL
    window.location.href = websites[nextIndex];
  } else if (queryParams.has('previous')) {
    // Find the index of the current URL in the array
    const currentIndex = websites.findIndex(site => site === currentURL);
  
    // Calculate the index of the previous URL, considering array bounds
    const previousIndex = (currentIndex - 1 + websites.length) % websites.length;
  
    // Redirect to the previous URL
    window.location.href = websites[previousIndex];
  }
  