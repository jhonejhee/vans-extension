import browser from 'webextension-polyfill';

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received:", message);
});