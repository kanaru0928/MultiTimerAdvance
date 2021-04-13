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

class MTAByte {
    constructor(val = 0) {
        this.byte = val;
        if (val > 0xffffff) {
            this.byte = 0;
        }
    }

    /**
     * 指定のインデックスを参照
     * @param {number} index インデックス
     * @returns nバイト目
     */
    at(index) {
        return MTAByte.getByte(this.byte, 2 - index);
    }

    /**
     * 指定のインデックスに代入
     * @param {number} index インデックス
     * @param {number} val 値
     */
    set(index, val) {
        if (val < 0x100) {
            this.byte &= ~(0xff << (index << 3));
            this.byte += val << (index << 3);
        }
    }

    static getByte(val, index) {
        return val >> (index << 3) & 0xff;
    }

    static num2byte(val, digit) {
        let res = [];
        while (val > 0) {
            res.push(val & 0xff);
            val >>= 8;
        }
        for (let i = 0; i < digit - res.length; i++) {
            res.push(0);
        }
        res.reverse();
        console.log({ res });
        return res;
    }
}

class MTAF {
    /**
     * 
     * @param {MTAByte[]} array 
     */
    constructor() {
        this.pointer = [];
        this.size = 0;
        this.iterator = 0;
    }

    push(val) {
        if (val < 0 && val > 0xff) return;
        if (this.size % 3 == 0) {
            this.pointer.push(new MTAByte());
            this.pointer[this.size / 3].set(2, val);
        } else {
            let index = Math.floor(this.size / 3);
            let at = 2 - this.size % 3;
            this.pointer[index].set(at, val);
        }
        this.size++;
    }

    toHex() {
        let res = "";
        for (let i = 0; i < this.pointer.length; i++) {
            res += this.pointer[i].byte.toString(16);
        }
        return res;
    }

    toCode() {
        let res = "";
        let index;
        for (let i = 0; i < this.pointer.length; i++) {
            for (let j = 0; j < 4; j++) {
                index = this.pointer[i].byte >> (6 * (3 - j)) & 0b111111;
                res += MTACode.CODE[index];
            }
        }
        return res;
    }

    at(index) {
        let i = Math.floor(index / 3);
        let j = index % 3;
        console.log({ index, i, j });
        let res = this.pointer[i].at(j);
        return res;
    }

    next() {
        return this.at(this.iterator++);
    }

    /**
     * Timer4json[]型に変換
     * @returns {Timer4Json[]} タイマー
     */
    toTimer() {
        let fv = this.next();
        let array = MTAF._FORMAT.get(fv)(this);
        return array;
    }

    static get _FORMAT() {
        let res = new Map();
        res.set(0x10, function(val) {
            let len = val.next();
            let ans = new Array(len);
            for (let i = 0; i < len; i++) {
                ans[i] = new Timer4Json();
                let time = 0;
                console.log("time");
                for (let j = 0; j < 2; j++) {
                    time <<= 8;
                    time += val.next();
                }
                ans[i].t = time;
                let name_length = val.next();
                let name_array = new Array(name_length);
                console.log({ name_length, iter: val.iterator });
                for (let j = 0; j < name_length; j++) {
                    name_array[j] = val.next();
                }
                let name = Encoding.convert(name_array, { to: 'UNICODE', type: 'string' });
                ans[i].n = name;
            }
            return ans;
        });
        return res;
    }

    /**
     * MTAFを作成
     * @param {Timer4Json[]} timer 
     */
    static create(timer) {
        let name_max_length = 0;
        let name = new Array(timer.length);
        let res;
        let max_time = 0;
        for (let i = 0; i < timer.length; i++) {
            name[i] = Encoding.convert(timer[i].n, { to: "UTF8", type: "array" });
            name_max_length = Math.max(name[i].length, name_max_length);
            max_time = Math.max(max_time, timer[i].t);
        }
        if (name_max_length < 0x100 && timer.length < 0x100 && max_time < 0x10000) {
            let res = new MTAF();
            res.push(0x10);
            res.push(timer.length);
            for (let i = 0; i < timer.length; i++) {
                let num_byte = MTAByte.num2byte(timer[i].t, 2);
                console.log({ len: num_byte.length });
                for (let j = 0; j < 2; j++) {
                    res.push(num_byte[j]);
                }
                res.push(name[i].length);
                for (let j = 0; j < name[i].length; j++) {
                    res.push(name[i][j]);
                }
            }
            console.log({ name_max_length, max_time });
            return res;
        }
    }

    static decode(str) {
        let res_int = 0;
        let res = new MTAF();
        let byte;
        for (let i = 0; i < str.length; i++) {
            res_int <<= 6;
            res_int += MTACode.CODE.indexOf(str[i]);
            console.log({ res_int });
            if (i % 4 == 3) {
                byte = MTAByte.num2byte(res_int, 3);
                for (let j = 0; j < 3; j++) {
                    res.push(byte[j]);
                }
                res_int = 0;
            }
        }
        return res;
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

/**
 * 共有用データ構造
 */
class Timer4Json {
    /**
     * コンストラクタ
     * @param {Timer|Object|string} obj タイマー/名前
     * @param {number} setTime [時間]
     */
    constructor(obj = "", setTime = 0) {
        let name_str;
        let time;
        if (obj instanceof Timer) {
            name_str = obj.elem.find(".name").val();
            time = obj.setTime;
        } else if (obj instanceof Object) {
            name_str = obj.n;
            time = obj.t;
        } else {
            name_str = obj;
            time = setTime;
        }
        this.n = name_str;
        this.t = time;
    }

    createElem() {
        addTimer();
        let elem = timers[timers.length - 1].elem;
        elem.find(".name").val(this.n);
        let time = ConvertTime.sec2hms(this.t);
        elem.find(".hour").val(time[0]);
        elem.find(".min").val(time[1]);
        elem.find(".sec").val(time[2]);
        checkTime(elem.find(".hour"));
        checkTime(elem.find(".min"));
        checkTime(elem.find(".sec"));
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
    timers[timers.length - 1].init();
    updateShare();
}

function deleteTimer() {
    let tmp = [...selected];
    tmp.sort(Compare.greater);
    console.log({ tmp });
    for (let i = 0; i < tmp.length; i++) {
        timers.splice(tmp[i], 1);
    }
    draw();
    updateShare();
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

var timers4json;

function updateShare() {
    let url = location.href.split('?')[0];
    timers4json = new Array(timers.length);
    let name_tmp = "";
    for (let i = 0; i < timers.length; i++) {
        name_tmp = timers[i].elem.find(".name").val();
        timers4json[i] = new Timer4Json(name_tmp, timers[i].setTime / SEC);
    }
    let mtaf = MTAF.create(timers4json);
    let id = mtaf.toCode();
    // let json = encodeURIComponent(JSON.stringify(timers4json));
    // let id = btoa(json);
    let id_str = "?id=" + id;
    $(".share_txt").html(url + id_str);
}

function listenEvent() {
    $(document).on("change", '.time_num', function() {
        checkTime(this);
        let index = $(".timer").index($(this).closest(".timer"));
        timers[index].init();
    });
    $("#flow").on("change", "input", function() {
        updateShare();
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
    $("#flow").sortable({
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

function setByUrl() {
    let url = new URL(window.location.href);
    let params = url.searchParams;
    let id = params.get("id");
    if (id != null) {
        timers = [];
        let decoded = MTAF.decode(id).toTimer();
        // let decoded = JSON.parse(decodeURIComponent(atob(id)));
        decoded.forEach((t) => {
            let tmp = new Timer4Json(t);
            tmp.createElem();
        });
        draw();
    }
}

$(function() {
    addTimer();
    setByUrl();
    updateShare();
    listenEvent();
});