var state = {
    authorOnlyToggle: false
};

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log(sender.tab ?
                    'from a content script: ' + sender.tab.url :
                    'from the extension');

        if (request.action === 'toggleAuthorOnly') {
            toggleAuthorOnly(state.authorOnlyToggle);
            state.authorOnlyToggle = !state.authorOnlyToggle;
            sendResponse('toggled');
        }
    }
);

function toggleAuthorOnly(status) {

    var display = (status ? 'block' : 'none');

    var author = $('#pageDescription .username').text();
    var posts = $('li.message');

    posts.each(function(index) {
        if ($(this).data('author') !== author) {
            $(this).css('display', display);
        }
    });
}
