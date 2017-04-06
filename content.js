var state = {
    authorOnlyToggle: false
};

// Scrape the name of the current thread (e.g., "the-mobius-trip.344776")
var threadUrl = $('#pageDescription a:last-of-type').attr('href');
var thread = threadUrl.substring(threadUrl.indexOf('/') + 1, threadUrl.lastIndexOf('/'));

// Toggle ON if thread is in list of toggled threads
document.onload = chrome.storage.sync.get('toggledThreads', function(result) {
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
            // The order is important, because toggleAuthorOnly() changes the actual toggle state to
            // match the value of state.authorOnlyToggle, not the value of !state.authorOnlyToggle
            state.authorOnlyToggle = !state.authorOnlyToggle;

            // Toggle author only posts on current page
            toggleAuthorOnly(state.authorOnlyToggle, request.thread, false);

            // Send response to extension with current toggle state
            sendResponse({status: state.authorOnlyToggle});
        }
        // Without this, the listener will stop functioning after the first time sendResponse is called
        return true;
    }
);

/**
 * toggleAuthorOnly toggles whether the user is viewing only the OP's posts in a thread or not.
 *
 * @param boolean status        True if thread is being toggled ON, False if thread is being toggled OFF
 * @param String  thread        The thread being toggled
 * @param boolean loadingSaved  True if toggleAuthorOnly is being called to toggle a saved thread that the user
                                has newly opened (in a new tab), False otherwise
 */
function toggleAuthorOnly(status, thread, loadingSaved) {

    var display = (status ? 'none' : 'block');

    var author = $('#pageDescription .username').text();
    var posts = $('li.message');

    posts.each(function(index) {
        if ($(this).data('author') !== author) {
            $(this).css('display', display);
        }
    });

    // If toggleAuthorOnly is not being called in order to toggle ON a revisited thread
    if (!loadingSaved) {
        // Either save or delete current thread from toggled threads list, depending on state
        saveOrDeleteToggledThread(status, thread);
    }
}

/**
 * saveOrDeleteToggledThread adds or removes a thread from the list of threads that have been toggled.
 *
 * @param boolean status  True if thread is being toggled ON, False if thread is being toggled OFF
 * @param String  thread  The thread being toggled
 */
function saveOrDeleteToggledThread(status, thread) {

    // Get toggled threads
    chrome.storage.sync.get('toggledThreads', function(result) {
        toggledThreads = result.toggledThreads || [];

        if (status) {  // If current thread was toggled ON, add it to the list
            toggledThreads.push(thread);
        } else {  // If current thread was toggled OFF, remove it from the list
            toggledThreads.splice(toggledThreads.indexOf(thread), 1);
        }

        // Save changes
        chrome.storage.sync.set({toggledThreads: toggledThreads});
    });
}
