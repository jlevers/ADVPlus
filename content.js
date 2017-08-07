var state = {
    authorOnlyToggle: false,
    fixFormat: false,
    fixPhotos: false
};

// Scrape the name of the current thread (e.g., "the-mobius-trip.344776")
var threadUrl = $('#pageDescription a:last-of-type').attr('href');
var thread = threadUrl.substring(threadUrl.indexOf('/') + 1, threadUrl.lastIndexOf('/'));

// Toggle ON if thread is in list of toggled threads
document.onload = chrome.storage.sync.get(['toggledThreads', 'formatFixedThreads', 'fixedPhotosThreads'], function(result) {

    // Make state variable match saved actions
    var data = {
        toggledThreads: result.toggledThreads || [],
        formatFixedThreads: result.formatFixedThreads || [],
        fixedPhotosThreads: result.fixedPhotosThreads || []
    };
    state = {
        authorOnlyToggle: data.toggledThreads.indexOf(thread) !== -1,
        fixFormat: data.formatFixedThreads.indexOf(thread) !== -1,
        fixPhotos: data.fixedPhotosThreads.indexOf(thread) !== -1
    };

    // Trigger saved actions

    if (state.authorOnlyToggle) {
        toggleAuthorOnly(state.authorOnlyToggle, thread, true);
    }
    if (state.fixFormat) {
        fixFormat(state.fixFormat, thread, true);
    }
    if (state.fixPhotos) {
        fixPhotos(state.fixPhotos, thread, true);
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
        } else if (request.action === 'fixFormat') {

            state.fixFormat = !state.fixFormat;

            // Toggle format fixes on current page
            fixFormat(state.fixFormat, request.thread, false);

            // Send response to extension with current format fixes toggle state
            sendResponse({status: state.fixFormat});

        } else if (request.action === 'fixPhotos') {

            state.fixPhotos = !state.fixPhotos;

            // Toggle photo fix on current page
            fixPhotos(state.fixPhotos, request.thread, false);

            // Send response to extension with current photo fix toggle state
            sendResponse({status: state.fixPhotos});
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
        saveOrDeleteThreadAction(status, thread, 'toggleAuthorOnly');
    }
}

/**
 * fixFormat changes whether format fixes are applied to the thread or not.
 *
 * @param boolean status        True if formatting is being toggled ON, False if formatting is being toggled OFF
 * @param String  thread        The thread being toggled
 * @param boolean loadingSaved  True if fixFormat is being called to fix a saved thread that the user
 *                              has newly opened (in a new tab), False otherwise
*/
function fixFormat(status, thread, loadingSaved) {

    // Only apply format fixes if user is turning them ON
    if (status) {
        var posts = $('li.message .messageInfo .messageContent article .messageText');

        posts.each(function(index) {

            // Standardize the type
            $(this).find('span')
            .css({
                'font-size': '12pt',
                'font-family': 'Tahoma, Geneva, sans-serif',
                'line-height': '1.4',
                'color': '#c8c8c8'
            });

            var html = $(this).html();


            // Remove extra tags and convert html character codes to characters
            html = html
                .replace(/&lt;\/?o.*&gt;/g, '')     // &lt; is '<' and &gt; is '>', so replacing everywhere where there's <o:p></o:p>
                .replace(/&lt;\/?st1.*?&gt;/g, '')  // Replacing everywhere with <st1:....> or </st1:....>
                // .replace(/(|)/g, '\'')   // This would replace characters that are encoded wrong with apostrophes, but I haven't figured it out yet
                .replace(/&amp;#(\d+);/g, function(match, number){  // Replace all html character codes like &#8211; with the actual character
                    return String.fromCharCode(number);
                });

            $(this).html(html);

        });
    }

    // If fixFormat is not being called in order to turn fixes ON a revisited thread
    if (!loadingSaved) {
        // Either save or delete current thread from format fixed threads list, depending on state
        saveOrDeleteThreadAction(status, thread, 'fixFormat');
    }
}

function fixPhotos(status, thread, loadingSaved) {

    var webArchivePrefix = 'https://web.archive.org/web/20141019084541im_';
    var pbImages = $('li.message .messageInfo .messageContent article .messageText img[data-url*=\'photobucket\']');

    pbImages.each(function(index) {

        var src = $(this).attr('src');

        if (status) {
            // Add Web Archive prefix to URL
            $(this).attr('src', webArchivePrefix + src);
        } else {
            // Remove Web Archive prefix from URL
            $(this).attr('src', $(this).attr('src').substring(webArchivePrefix.length));
        }
    });

    // If fixPhotos is not being called in order to turn fixes ON a revisited thread
    if (!loadingSaved) {
        // Either save or delete current thread from photo fixed threads list, depending on state
        saveOrDeleteThreadAction(status, thread, 'fixPhotos');
    }
}

/**
 * saveOrDeleteThreadAction adds or removes a thread from the list of threads that have been toggled.
 *
 * @param boolean status  True if thread is being toggled ON, False if thread is being toggled OFF
 * @param String  thread  The thread being toggled
 * @param String  action  The action being saved (toggleAuthorOnly, fixFormat, etc)
 */
function saveOrDeleteThreadAction(status, thread, action) {

    var actionsMap = {
        toggleAuthorOnly: 'toggledThreads',
        fixFormat: 'formatFixedThreads',
        fixPhotos: 'fixedPhotosThreads'
    };

    // Get array corresponding to the button the user clicked
    var retrieve = actionsMap[action];
    console.log(retrieve);

    chrome.storage.sync.get(retrieve, function(result) {
        var retrieved = result[retrieve] || [];

        if (status) {
            retrieved.push(thread);
        } else {
            retrieved.splice(retrieved.indexOf(thread), 1);
        }

        chrome.storage.sync.set({[retrieve]: retrieved});
    });
}
