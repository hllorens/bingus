"use strict";

// NOTE: This only works for web browsers for node.js change window to global

(function(w) {
    var oldST = w.setTimeout;
    var oldSI = w.setInterval;
    var oldCI = w.clearInterval;
    var oldCT = w.clearInterval;

    var timers = {};
    w.timers = timers; // assigned by reference?

    w.setTimeout = function(fn, delay) {
        var id = oldST(function() {
            fn && fn(); // just for safety, but maybe remove...
            removeTimer(id);
        }, delay);
        timers[id]=fn.toString();
        return id;
    };
    w.setInterval = function(fn, delay) {
        var id = oldSI(fn, delay);
        timers[id]=fn.toString();
        return id;
    };
    w.clearInterval = function(id) {
        oldCI(id); removeTimer(id);
    };
    w.clearTimeout = function(id) {
        oldCI(id); removeTimer(id);
    };

    function removeTimer(id) {
        if (timers.hasOwnProperty(id))
            delete timers[id];
    }
}(window));

