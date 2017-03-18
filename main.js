var state = {
    authorOnlyToggle: false
};

var threadUrl = $('#pageDescription a:last-of-type').attr('href');
var thread = threadUrl.substring(threadUrl.indexOf('/') + 1, threadUrl.lastIndexOf('/'));

// Toggle ON if thread is in list of toggled threads
window.onload = chrome.storage.sync.get('toggledThreads', function(result) {
    var toggledThreads = result.toggledThreads || [];
    var toggleStatus = toggledThreads.indexOf(thread) !== -1;
    if (toggleStatus) {
        state.authorOnlyToggle = !state.authorOnlyToggle;
        toggleAuthorOnly(state.authorOnlyToggle, thread, true);
    }
});

// Listen for messages from extension
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action === 'toggleAuthorOnly') {

            // State variable actually gets toggled before the real page does!
            // The order is important!
            state.authorOnlyToggle = !state.authorOnlyToggle;

            // Toggle author only posts on current page
            toggleAuthorOnly(state.authorOnlyToggle, request.thread, false);

            // Send response to extension with current toggle state
            sendResponse({status: state.authorOnlyToggle});
        }
        return true;
    }
);

function toggleAuthorOnly(status, thread, loadingSaved) {

    var display = (status ? 'none' : 'block');

    var author = $('#pageDescription .username').text();
    var posts = $('li.message');

    posts.each(function(index) {
        if ($(this).data('author') !== author) {
            $(this).css('display', display);
        }
    });

    // Either save or delete current thread from toggled threads list, depending on state
    if (!loadingSaved) {
        saveOrDeleteToggledThread(status, thread);
    }
}

function saveOrDeleteToggledThread(status, thread) {

    // Get toggled threads
    chrome.storage.sync.get('toggledThreads', function(result) {
        toggledThreads = result.toggledThreads || [];

        if (status) {  // If current thread was toggled ON, add it to the list
            toggledThreads.push(thread);
            chrome.storage.sync.set({toggledThreads: toggledThreads});
            console.log('toggle saved');
        } else {  // If current thread was toggled OFF, remove it from the list
            toggledThreads.splice(toggledThreads.indexOf(thread), 1);
            chrome.storage.sync.set({toggledThreads: toggledThreads});
            console.log('toggle deleted');
        }
    });
}
