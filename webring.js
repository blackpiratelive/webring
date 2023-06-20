// Fetch the websites from the text file
function fetchWebsites() {
    return fetch('websites.txt')
      .then(response => response.text())
      .then(text => text.trim().split('\n'));
  }
  
  // Function to navigate to the next website in the webring
  function nextWebsite() {
    fetchWebsites().then(websites => {
      const currentURL = window.location.href;
      const currentIndex = websites.indexOf(currentURL);
      let nextIndex = currentIndex + 1;
  
      // Check if the current website is the last one in the webring
      if (nextIndex >= websites.length) {
        nextIndex = 0; // Wrap around to the first website
      }
  
      // Navigate to the next website
      window.location.href = websites[nextIndex];
    });
  }
  
  // Add a button or a link to trigger the nextWebsite function
  document.addEventListener('DOMContentLoaded', function() {
    const nextButton = document.getElementById('next-button');
    nextButton.addEventListener('click', nextWebsite);
  });
  