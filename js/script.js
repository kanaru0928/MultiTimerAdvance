const MIN_NUM = 0;
const MAX_MIN = 59;
const MAX_SEC = 59;


/**
 * 入力された時間の形式チェック
 * @param {object} elem 
 */
function checkTime(selector) {
    elem = $(selector);
    if (isNaN(elem.val())) {
        elem.val(MIN_NUM);
    } else {
        let val = parseInt(elem.val());
        if (val < MIN_NUM) {
            elem.val(MIN_NUM);
        }
        if (!elem.hasClass('hour')) {
            if (elem.hasClass('min') && val > MAX_MIN) {
                elem.val(MAX_MIN);
            } else if (elem.hasClass('sec') && val > MAX_SEC) {
                elem.val(MAX_SEC);
            }
            elem.val(('00' + elem.val()).slice(-2));
        }
    }
}

function listenEvent() {
    $(document).on("change", '.num', function() {
        checkTime(this);
    });
}

$(function() {
    listenEvent();
    var template = document.getElementById("timer_tmp");
    var clone = template.content.cloneNode(true);
    $("#flow").append(clone);
});