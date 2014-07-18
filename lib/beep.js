// play.js - Marak Squires
// MIT yo, copy paste us some credit

'use strict';

var child_p = require('child_process'),
    exec    = child_p.exec,
    spawn   = child_p.spawn,
    ee      = require('events'),
    util    = require('util');

// play is this
var Beep = exports.Beep = function Beep() {

    var self = this;

    if (!(this instanceof Beep)) {
        return new Beep();
    }

    ee.EventEmitter.call(this);

    this.playerList = [
        'afplay',
        'mplayer',
        'mpg123',
        'mpg321',
        'play'
    ];

    this.playerName = false;
    this.checked = 0;

    var i = 0,
        child;

    // a hack to check if we have any players available
    for (var i = 0, l = this.playerList.length; i < l; i++) {

        if (!this.playerName) {
            (function inner (name) {
                child = exec(name, function (error, stdout, stderr) {

                    self.checked++;

                    if (!self.playerName && (error === null || error.code !== 127)) {
                        // if the command was successful, and we didn't have any players yet
                        self.playerName = name;
                        self.emit('checked');
                        return;
                    }

                    // if we went through the last known player, but no match
                    if (name === self.playerList[self.playerList.length-1]) {
                        // we are done checking then
                        self.emit('checked');
                    }
                });
            })(this.playerList[i]);
        }

        // if we already have a player, quit
        else {
            break;
        }
    }
};

// initialize and inherit
util.inherits(Beep, ee.EventEmitter);

//
// Allows the user to manually set a player name
//
Beep.prototype.usePlayer = function usePlayer (name) {
    this.playerName = name;
};

//
// Have the user player the file, with a callback when it ends
//
Beep.prototype.sound = function sound (file, callback) {

    var callback = callback || function () {};
    var self = this;
    // if there is no player, and we haven't finished checking
    // wait for the ready, then start
    if (!this.playerName && this.checked !== this.playerList.length) {
        this.on('checked', function () {
            self.sound.call(self, file, callback);
        });
        return false;
    }

    // if we have checked all the players, and none of them were good
    if (!this.playerName && this.checked === this.playerList.length) {
        console.log('[WARN] No suitable audio player could be found - exiting.');
        console.log('[WARN] If you know other cmd line music player than these:', this.playerList);
        console.log('[WARN] You can tell us, and will add them (or you can add them yourself)');
        this.emit('error', new Error('No Suitable Player Exists', this.playerList));
        return false;
    }

    // we should have a valid player name, so we can call it
    var command = [file],
        child   = this.player = spawn(this.playerName, command);

    // A listener to handle callbacks, and any weird IO errors
    child.on('exit', function (code, signal) {
        if(code === null || signal !== null || code === 1) {
            console.log('[ERROR] couldnt play, had an error [code: ' + code + '] [signal: ' + signal + '] :' + this.playerName);
            this.emit('error', code, signal);
        }
        else if ( code === 127 ) {
            // a could not find command error
            console.log('[ERROR] ' + self.playerName + ' doesn\'t exist!');
            this.emit('error', code, signal);
        }
        else if (code === 2) {
            // a file IO error
            console.log('[ERROR] ' + file + ' could not be read by your player: ' + self.playerName);
            this.emit('error', code, signal);
        }
        else if (code === 0) {
            callback();
        }
        else {
            // are there other errors?
            console.log('[ERROR] ' + self.playerName + ' has an odd error with ' + file);
            console.log(arguments);
            emit('error');
        }
    });

    this.emit('play', true);

    return true;
};
