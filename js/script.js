const MIN_NUM = 0;
const MAX_MIN = 59;
const MAX_SEC = 59;
const SEC = 1000;

var timers = [];
var selected = new Set();
var last_selected = -1;
var key_ctrl = false;
var key_shift = false;

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

class Compare {
    static greater(a, b) {
        if (a > b) return -1;
        if (a < b) return 1;
        return 0;
    }
    static less(a, b) {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
    }
}

class Timer4Json {
    constructor(name, setTime) {
        this.name = name;
        this.setTime = setTime;
    }

    createElem() {
        addTimer();
        let elem = timers[timers.length - 1].elem;
        elem.find(".name").val(this.name);
        let time = ConvertTime.sec2hms(this.setTime);
        elem.find(".hour").val(time[0]);
        elem.find(".min").val(time[1]);
        elem.find(".sec").val(time[2]);
        checkTime(elem);
    }
}

class Timer {
    constructor(elem) {
        this.elem = elem;
        this.leftSec = 0;
        this.setTime = 0;
        this.running = false;
        this.active = false;
        this.endTime = 0;
        this.alarm = new Audio();
        this.alarm.preload = "auto";
        this.alarm.src = "asset/alarm.mp3";
        this.alarm.load();
        this.alarm.loop = true;
        this.init();
    }

    _timer() {
        var keepThis = this;
        var tick = function() {
            if (keepThis.running) {
                let hms = ConvertTime.sec2hms(keepThis.leftSec / SEC);
                let str = ConvertTime.hms2str(hms);
                keepThis.elem.find(".display").html(str);
                keepThis.elem.find("progress").val(keepThis.setTime / SEC - keepThis.leftSec / SEC)
                keepThis.leftSec -= SEC;
                let interval = keepThis.endTime - keepThis.leftSec - Date.now();
                console.log(interval);
                if (keepThis.leftSec >= 0) {
                    setTimeout(tick, interval);
                } else {
                    keepThis.alarm.play();
                    keepThis.elem.find(".start").prop("disabled", true);
                    keepThis.elem.css("background", "rgba(255, 0, 0, .2)");
                }
            }
        }
        console.log(this);
        let startTime = Date.now();
        this.endTime = startTime + this.leftSec;
        console.log("timer start", this.elem);
        tick();
    }

    init() {
        this.alarm.currentTime = 0;
        this.elem.find(".display").html("");
        this.elem.find(".num_container").show();
        this.active = false;
        let h = Number(this.elem.find(".hour").val());
        let m = Number(this.elem.find(".min").val());
        let s = Number(this.elem.find(".sec").val());
        this.setTime = ConvertTime.hms2sec([h, m, s]) * SEC;
        this.leftSec = this.setTime;
        this.elem.find("progress").attr("max", this.leftSec / SEC);
    }

    _runingUpdate() {
        if (this.running) {
            this.elem.find(".fa-play").hide();
            this.elem.find(".fa-pause").show();
            this._timer();
        } else {
            this.elem.find(".fa-play").show();
            this.elem.find(".fa-pause").hide();
        }
    }

    start() {
        this.elem.find(".num_container").hide();
        this.active = true;
        this.running = !this.running;
        this._runingUpdate();
    }

    reset() {
        this.running = false;
        this.active = false;
        this.alarm.pause();
        this.elem.find(".start").prop("disabled", false);
        this.elem.css("background", "transparent");
        this._runingUpdate();
        this.init();
    }

    select(val) {
        this.isSelected = val;
        if (val) {
            this.elem.addClass("selected");
        } else {
            this.elem.removeClass("selected");
        }
    }

    getTimer4Json() {
        let name = this.elem.find(".name").val();
        return new Timer4Json(name, this.setTime);
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

function draw() {
    $("#flow").empty();
    for (let i = 0; i < timers.length; i++) {
        $("#flow").append(timers[i].elem);
    }
}

function selectedChange(last) {
    last_selected = last;
    for (let i = 0; i < timers.length; i++) {
        timers[i].select(selected.has(i));
    }
}

function addTimer() {
    var template = document.getElementById("timer_tmp");
    var clone = template.content.cloneNode(true);
    $("#flow").append(clone);
    // listenEvent();
    timers.push(new Timer($(".timer").last()));
}

function deleteTimer() {
    let tmp = [...selected];
    tmp.sort(Compare.greater);
    console.log({ tmp });
    for (let i = 0; i < tmp.length; i++) {
        timers.splice(tmp[i], 1);
    }
    draw();
}

function swapSelect(index) {
    if (selected.has(index)) {
        selected.delete(index);
        return false;
    } else {
        selected.add(index);
        return true;
    }
}

function listenEvent() {
    $(document).on("change", '.time_num', function() {
        checkTime(this);
        let index = $(".timer").index($(this).closest(".timer"));
        timers[index].init();
    });
    $(document).on("click", '.start', function() {
        let index = $(".timer").index($(this).parent());
        console.log(index);
        timers[index].start();
    });
    $(document).on("click", '.reset', function() {
        let index = $(".timer").index($(this).parent());
        timers[index].reset();
    });
    $(document).on('click', function(e) {
        if (!$(e.target).closest(".timer").length) {
            selected.clear();
            selectedChange(-1);
        }
    });
    $(document).on('click', '.timer', function() {
        let index = $(".timer").index(this);
        let isAdd;
        if ((key_ctrl || key_shift) && last_selected != -1) {
            isAdd = swapSelect(index);
        }
        if (!key_ctrl) {
            selected.clear();
            selected.add(index);
        }
        if (key_shift) {
            console.log({ index, last_selected })
            let a = Math.min(index, last_selected);
            let b = Math.max(index, last_selected);
            if (isAdd) {
                for (let i = a; i <= b; i++) {
                    selected.add(i);
                }
            } else {
                for (let i = a; i <= b; i++) {
                    selected.delete(i);
                }
            }
        }
        selectedChange(index);
    });
    $("#add").on("click", function() {
        addTimer();
    });
    $("#delete").on("click", function() {
        deleteTimer();
    });
    $(document).on("keydown keyup", function(event) {
        key_ctrl = event.ctrlKey;
        key_shift = event.shiftKey;
    });
    var timerset = function() {
        let $timers = $(".timer");
        let len = $timers.length;
        timers = [];
        for (let i = 0; i < len; i++) {
            timers.push(new Timer($timers.eq(i)));
        }
    }
    var moving_item;
    $(".flow").sortable({
        update: function(event, ui) {
            let to = $(".timer").index(ui.item);
            let val = timers[moving_item];
            let tail = timers.slice(moving_item + 1);
            timers.splice(moving_item);
            Array.prototype.push.apply(timers, tail);
            timers.splice(to, 0, val);
        },
        start: function(event, ui) {
            let index = $(".timer").index(ui.item);
            moving_item = index;
        },
        distance: 30
    });
}

$(function() {
    addTimer();
    listenEvent();
});