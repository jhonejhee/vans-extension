// Command executor
export const executeCommand = (command) => {
    const availableCommands = {
        'vans open tab': openTab,
        'vans close tab': closeTab,
        'vans next tab': nextTab,
        'vans previous tab': previousTab,
    };
    console.log(command)
    if (command.includes("vans search for")) {
        const searchItem = command.split("search for")[1].trim();
        searchInCurrentTab(searchItem);
        return;
    }

    if (command in availableCommands) {
        showNotification(command);
        availableCommands[command]();
    }
}

// Function for text-to-speech
const speakText = (text) => {
    const synth = window.speechSynthesis;
    if (!synth) {
        console.error("Text-to-speech is not supported in this browser.");
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // Set language to English
    utterance.rate = 1.0; // Adjust speed if needed
    utterance.pitch = 1.0; // Adjust pitch if needed
    synth.speak(utterance);
};

// search function
const searchInCurrentTab = (query) => {
    speakText(`Searching for ${query}.`)
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { url: searchUrl });
        }
    });
};

// show notification
const showNotification = (message) => {
    if (chrome.notifications) {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "logo192.png",
            title: "VANS Command:",
            message: message.replace("vans", "").trim(),
            priority: 2,
        });
    } else {
        console.warn("Notifications are not supported in this context.");
    }
};

  


// Function to open a new tab
export const openTab = () => {
    speakText(`Opening a new tab.`)
    chrome.tabs.create({ url: 'https://www.google.com' });
};

// Function to close the current tab
export const closeTab = () => {
    speakText(`Closing the current tab.`)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
        chrome.tabs.remove(tabs[0].id);
        }
    });
};

// Function to switch to the next tab
export const nextTab = () => {
    speakText(`Switching to the next tab.`)
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
    speakText(`Switching back to previous tab.`)
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