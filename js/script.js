$(function() {
    var template = document.getElementById("timer_tmp");
    var clone = template.content.cloneNode(true);
    $("#flow").append(clone);
});