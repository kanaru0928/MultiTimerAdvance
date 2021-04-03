const MIN_NUM = 0;
const MAX_MIN = 59;
const MAX_SEC = 59;
const SEC = 1000;

var endTime;
var count;

class ConvertTime {
    static sec2h(sec) {
        return Math.floor(sec / (60 * 60));
    }
    static sec2m(sec) {
        return Math.floor(sec % (60 * 60) / 60);
    }
    static sec2s(sec) {
        return sec % (60 * 60) % 60;
    }
    static sec2hms(sec) {
        let _h = this.sec2h(sec);
        let _m = this.sec2m(sec);
        let _s = this.sec2s(sec);
        return [_h, _m, _s];
    }
    static hms2sec(hms) {
        return hms[0] * 3600 + hms[1] * 60 + hms[2];
    }
    static zeropadding(num) {
        return ('00' + num).slice(-2);
    }
    static hms2str(hms) {
        let tmp = [
            String(hms[0]),
            this.zeropadding(hms[1]),
            this.zeropadding(hms[2])
        ]
        return tmp.join("：");
    }
}

class Timer {
    constructor(elem) {
        this.elem = elem;
        this.leftSec = 0;
        this.start = false;
    }

    timer() {
        var keepThis = this;
        var tick = function() {
            let hms = ConvertTime.sec2hms(keepThis.leftSec);
            let str = ConvertTime.hms2str(hms);
            keepThis.elem.find(".display").html(str);
            keepThis.leftSec--;
            let interval = endTime - keepThis.leftSec * 1000 - Date.now();
            console.log(interval);
            if (keepThis.leftSec >= 0) {
                setTimeout(tick, interval);
            }
        }
        console.log(this);
        let startTime = Date.now();
        let h = Number(this.elem.find(".hour").val());
        let m = Number(this.elem.find(".min").val());
        let s = Number(this.elem.find(".sec").val());
        let sec = ConvertTime.hms2sec([h, m, s]);
        endTime = startTime + sec * 1000;
        this.leftSec = sec;
        console.log("timer start", this.elem);
        setTimeout(tick, 0);
    }
}

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
            elem.val(ConvertTime.zeropadding(elem.val()));
        }
    }
}
var timer;

function listenEvent() {
    $(document).on("change", '.time_num', function() {
        checkTime(this);
    });
    $("#start").on("click", function() {
        timer = new Timer($(this).parent());
        timer.timer();
    });
}

$(function() {
    var template = document.getElementById("timer_tmp");
    var clone = template.content.cloneNode(true);
    $("#flow").append(clone);
    listenEvent();
});