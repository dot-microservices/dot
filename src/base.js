'use strict';

const colors = require('colors/safe');
const discover = require('node-discover');
const formatDate = require('date-fns').format;
const is = require('is_js');

class Base {
    constructor(options) {
        this.options = { delimiter: '.', secret: 'dot' };
        if (is.object(options) && is.not.array(options))
            this.options = Object.assign(this.options, options);
    }

    advertise(options, added, removed) {
        let advertising = { key: this.options.secret };
        if (is.object(options) && is.not.array(options))
            advertising = Object.assign(advertising, options);

        this.ad = discover(advertising);
        if (is.function(added)) this.ad.on('added', added);
        if (is.function(removed)) this.ad.on('removed', removed);
    }

    log(icon, color, message) {
        if (!this.options.debug) return;

        color = colors[color];
        if (is.not.function(color)) color = colors.red;
        console.log(color(icon), color(formatDate(new Date())), color(message));
    }

    success(message) {
        this.log('✔', 'green', message);
    }

    warning(message) {
        this.log('!', 'yellow', message);
    }

    fail(message) {
        this.log('×', 'red', message);
    }

    fixServiceName(name) {
        return `${ name.charAt(0).toLowerCase() }${ name.slice(1) }`;
    }
}

module.exports = Base;
