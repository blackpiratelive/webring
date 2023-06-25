
    // Function to read a text file
    function readTextFile(file, callback) {
      const rawFile = new XMLHttpRequest();
      rawFile.open("GET", file, true);
      rawFile.onreadystatechange = function () {
        if (rawFile.readyState === 4 && rawFile.status === 200) {
          callback(rawFile.responseText);
        }
      };
      rawFile.send(null);
    }

    // Function to extract URLs from the text content
    function extractURLs(text) {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      return text.match(urlRegex);
    }

    // Function to display URLs as an ordered list
    function displayURLs(urls) {
      const orderedList = document.createElement("ol");
      urls.forEach(function (url) {
        const listItem = document.createElement("li");
        const link = document.createElement("a");
        link.href = url;
        link.textContent = url;
        listItem.appendChild(link);
        orderedList.appendChild(listItem);
      });
      
      const container = document.getElementById("urlsContainer");
      container.appendChild(orderedList);
    }

    // Path to the text file containing URLs
    const textFile = "websites.txt";

    // Read the text file and display the URLs
    readTextFile(textFile, function (content) {
      const urls = extractURLs(content);
      displayURLs(urls);
    });

