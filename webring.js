let websites = [];

// Fetch the websites from the text file
function fetchWebsites() {
  return fetch('https://webring-blue.vercel.app/websites.txt')
    .then(response => response.text())
    .then(text => text.trim().split('\n'));
}

// Function to navigate to the next website in the webring
function nextWebsite() {
  const currentURL = window.location.href;
  const currentIndex = websites.indexOf(currentURL);
  let nextIndex = currentIndex + 1;

  // Check if the current website is the last one in the webring
  if (nextIndex >= websites.length) {
    nextIndex = 0; // Wrap around to the first website
  }

  // Navigate to the next website
  window.location.href = websites[nextIndex];
}

// Function to navigate to the previous website in the webring
function previousWebsite() {
  const currentURL = window.location.href;
  const currentIndex = websites.indexOf(currentURL);
  let previousIndex = currentIndex - 1;

  // Check if the current website is the first one in the webring
  if (previousIndex < 0) {
    previousIndex = websites.length - 1; // Wrap around to the last website
  }

  // Navigate to the previous website
  window.location.href = websites[previousIndex];
}

// Function to navigate to a random website in the webring
function randomWebsite() {
  const randomIndex = Math.floor(Math.random() * websites.length);
  // Navigate to the random website
  window.location.href = websites[randomIndex];
}

// Add event listeners to the buttons
document.addEventListener('DOMContentLoaded', function() {
  const previousButton = document.getElementById('previous-button');
  previousButton.addEventListener('click', previousWebsite);

  const nextButton = document.getElementById('next-button');
  nextButton.addEventListener('click', nextWebsite);

  const randomButton = document.getElementById('random-button');
  randomButton.addEventListener('click', randomWebsite);

  fetchWebsites().then(fetchedWebsites => {
    websites = fetchedWebsites;
  });
});
