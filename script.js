$(function () {

    $('a[href="#try"]').click(function (e) {

        e.preventDefault();
        $('#try').toggleClass('hidden');

        return false;

    });

    $('#source').val('html\n  head\n    title :"Try liten!"\n  body\n    div');
    $('#source').on('keyup', function () {
        compile();
    });

    function compile() {
        console.error = function(msg) {
            console.log('error', msg);
        }
        var process = {};
        process.exit = function (code) {
            console.log('exit code: ' + code);
        }
        $('#output').text(liten.compile($('#source').val()));
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