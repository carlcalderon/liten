$(function () {

    var timeout = null;

    $('a[href="#try"]').click(function (e) {

        e.preventDefault();
        $('#try').toggleClass('hidden');

        showInfoMessage();

        return false;

    });

    $('#source').val('html\n  head\n    title :"Try liten!"\n  body\n    div');
    $('#source').on('keyup', function () {
        compile();
    });

    $('body').mousemove(showInfoMessage);
    $(document).keyup(function(e){

        if(e.keyCode === 27)
            $('#try').addClass('hidden');

    });

    function showError(message, autohide) {
        $('#error').text(message);
        $('#error').show();
    }

    function showInfoMessage() {
        clearTimeout(timeout);
        $('#try #info').show();
        timeout = setTimeout(function () {
            $('#try #info').fadeOut();
        }, 2000);
    }

    function compile() {
        $('#error').hide();
        console.error = function(msg) {
            showError(msg);
        }
        var process = {};
        process.exit = function (code) {
            console.log('exit code: ' + code);
        }
        try {
            $('#output').text(liten.compile($('#source').val()));
        } catch (e) {
            if (/existsSync/g.test(e.message)) {
                showError('@import does not work in the online editor.');
            }
        }
        hljs.highlightBlock($('#output').get(0));
        hljs.highlightBlock($('#source').get(0));
    };

    compile();

    $('.coffeescript').click(function () {
        $('#source').val($(this).text());
        $('#try').removeClass('hidden');

        compile();

    });

});