// Command executor


// Function for text-to-speech
export const speakText = (text, callback) => {
    const synth = window.speechSynthesis;
    if (!synth) {
        console.error("Text-to-speech is not supported in this browser.");
        if (callback) callback(); // Resume recognition if TTS is not supported
        return;
    }

    // if (!text) {
    //     // If no text is provided, immediately call the callback
    //     // if (callback) callback();
    //     return;
    // }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // Set language to English
    utterance.rate = 1.0; // Adjust speed if needed
    utterance.pitch = 1.0; // Adjust pitch if needed

    utterance.onend = () => {
        if (callback) callback(); // Resume recognition after TTS finishes
    };

    synth.speak(utterance);
};

// Search function
const searchInNewTab = (query) => {
    speakText(`Searching for ${query}.`);
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    chrome.tabs.create({ url: searchUrl });
};

// Show notification
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
    speakText(`Opening a new tab.`);
    chrome.tabs.create({ url: 'https://www.google.com' });
};

// Function to close the current tab
export const closeTab = () => {
    speakText(`Closing the current tab.`);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.remove(tabs[0].id);
        }
    });
};

// Function to switch to the next tab
export const nextTab = () => {
    speakText(`Switching to the next tab.`);
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
    speakText(`Switching back to previous tab.`);
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



export const allCommands = [
    { name: "Open Tab", command: "open tab", description: "Open a new tab", function: openTab },
    { name: "Close Tab", command: "close tab", description: "Close the current tab", function: closeTab },
    { name: "Search in New Tab", command: "search for", description: "Search for a query in a new tab", function: searchInNewTab },
    { name: "Next Tab", command: "next tab", description: "Switch to the next tab", function: nextTab },
    { name: "Previous Tab", command: "previous tab", description: "Switch to the previous tab", function: previousTab },
];

export const executeCommand = (command) => {
    let filteredCommands = allCommands.filter((cmd) => cmd.command !== "vans search for");
    console.log("Filtered Commands:", filteredCommands);

    const matchedCommand = filteredCommands.find((cmd) => command === cmd.command);
    console.log("Matched Command:", matchedCommand);

    // Pause speech recognition
    if (window.recognitionRef && window.recognitionRef.current) {
        window.recognitionRef.current.stop();
    }

    const resumeRecognition = () => {
        if (window.recognitionRef && window.recognitionRef.current) {
            setTimeout(() => window.recognitionRef.current.start(), 500); // Resume after a short delay
        }
    };

    if (matchedCommand) {
        matchedCommand.function();
        showNotification(command);
        speakText("", resumeRecognition); // Resume recognition after TTS finishes (even if no TTS is needed)
        return;
    }

    if (command.includes("search for")) {
        const searchItem = command.split("search for")[1].trim();
        if (!searchItem) {
            resumeRecognition();
            return;
        }
        searchInNewTab(searchItem);
        showNotification(command);
        speakText("", resumeRecognition); // Resume recognition after TTS finishes
        return;
    }

    speakText(`Please try again.`, resumeRecognition); // Resume recognition after TTS
};