// Command executor
export const executeCommand = (command) => {
    const availableCommands = {
        'open tab': openTab,
        'close tab': closeTab,
        'next tab': nextTab,
        'previous tab': previousTab,
        // 'search': () => alert('Stopping...'),
    };
    if (command in availableCommands) {
        showNotification(command);
        availableCommands[command]();
    }
}

// show notification
const showNotification = (command) => {
    if (chrome.notifications) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "logo192.png", // Make sure this icon exists in your extension folder
        title: "Command Recognized",
        message: `Executing: "${command}"`,
        priority: 2,
      });
    }
  };
  


// Function to open a new tab
export const openTab = () => {
    chrome.tabs.create({ url: 'https://www.google.com' });
};

// Function to close the current tab
export const closeTab = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
        chrome.tabs.remove(tabs[0].id);
        }
    });
};

// Function to switch to the next tab
export const nextTab = () => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
        if (activeTabs.length > 0) {
            const currentIndex = activeTabs[0].index;
            const nextIndex = (currentIndex + 1) % tabs.length;
            chrome.tabs.update(tabs[nextIndex].id, { active: true });
        }
        });
    });
};

// Function to switch to the previous tab
export const previousTab = () => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
        if (activeTabs.length > 0) {
            const currentIndex = activeTabs[0].index;
            const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            chrome.tabs.update(tabs[prevIndex].id, { active: true });
        }
        });
    });
};