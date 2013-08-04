$(function () {

    $('a[href="#try"]').click(function (e) {

        e.preventDefault();
        $('#try').toggleClass('hidden');

        if ($('#try').hasClass('hidden') == false) {
            $('#try #info').delay(2000).fadeOut(1000);
        } else $('#try #info').show();

        return false;

    });

    $('#source').val('html\n  head\n    title :"Try liten!"\n  body\n    div');
    $('#source').on('keyup', function () {
        compile();
    });

    $('body').mousemove(function () {
        $('#try #info').show().delay(2000).fadeOut(1000);
    });

    function showError(message, autohide) {
        $('#error').text(message);
        $('#error').show();
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