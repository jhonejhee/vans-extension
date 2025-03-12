// public/content.js
console.log("Content script loaded!");

// Example: Change the background color of the page
// document.body.style.backgroundColor = "red";

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "changeColor") {
    document.body.style.backgroundColor = message.color;
    sendResponse({ success: true });
  }
});