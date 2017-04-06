$(document).ready(function() {

    var threadRegex = /https?:\/\/advrider\.com\/index\.php\?threads\/.+/i;

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {

        var url = tabs[0].url;

        // Get the part of the url that says which thread it is (e.g., "the-mobius-trip.344776")
        currentThread = url.substring(url.indexOf('threads/') + 8, url.lastIndexOf('/'));

        // Check if the thread being viewed has been saved as toggled, and if so, give the toggle
        // button the active class
        chrome.storage.sync.get('toggledThreads', function(result) {
            if (result.toggledThreads.indexOf(currentThread) !== -1) {
                toggleButtonState(true);
            }
        });

        // Disable "Toggle Author Only" button if not currently viewing a url of
        // the structure http(s)://advrider.com/index.php?threads/*
        if(!url.match(threadRegex)) {
            $('#toggleAuthorOnly').addClass('pure-button-disabled');
        } else {
            //  Toggle thread if user clicks toggle button
            $('#toggleAuthorOnly').click(function() {
                toggleAuthorOnly(tabs[0].id, currentThread);
            });
        }

    });

    function toggleAuthorOnly(tabId, thread) {
        // Send a message to the background script to toggle the visibility of posts by users other
        // than the OP
        chrome.tabs.sendMessage(tabId, {action: 'toggleAuthorOnly', thread: thread}, function(response) {

            // If toggled ON, make the toggle button look like it's pressed (active), and if toggled OFF,
            // make the toggle button like it's unpressed (inactive)
            toggleButtonState(response.status);
        });
    }

    function toggleButtonState(status) {
        status ? $('#toggleAuthorOnly').addClass('pure-button-active') : $('#toggleAuthorOnly').removeClass('pure-button-active');
    }
});

