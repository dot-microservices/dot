'use strict';

const colors = require('colors/safe');
const discover = require('node-discover');
const formatDate = require('date-fns/format');
const is = require('is_js');

/**
 * @description Base class for Client and Server
 * @class Base
 */
class Base {
    /**
     * Creates an instance of Base.
     * @param {Object} options
     * @memberof Base
     */
    constructor(options) {
        this.options = { delimiter: '.', secret: 'dot' };
        if (is.object(options) && is.not.array(options))
            this.options = Object.assign(this.options, options);
    }

    /**
     * @description Initiates auto discovery feature
     * @param {Object} options
     * @param {Function} added onAdded handler function
     * @param {Function} removed onRemoved handler function
     * @access private
     * @memberof Base
     */
    advertise(options, added, removed) {
        let advertising = { key: this.options.secret };
        if (is.object(options) && is.not.array(options))
            advertising = Object.assign(advertising, options);

        this.ad = discover(advertising);
        if (is.function(added)) this.ad.on('added', added);
        if (is.function(removed)) this.ad.on('removed', removed);
    }

    /**
     * @description Simple console logger
     * @param {String} icon
     * @param {String} color
     * @param {Any} message
     * @memberof Base
     */
    log(icon, color, message) {
        if (!this.options.debug) return;

        color = colors[color];
        if (is.not.function(color)) color = colors.red;
        console.log(color(icon), color(formatDate(new Date())), color(message));
    }

    /**
     * @description Simple console logger
     * @param {Any} message
     * @memberof Base
     */
    success(message) {
        this.log('✔', 'green', message);
    }

    /**
     * @description Simple console logger
     * @param {Any} message
     * @memberof Base
     */
    warning(message) {
        this.log('!', 'yellow', message);
    }

    /**
     * @description Simple console logger
     * @param {Any} message
     * @memberof Base
     */
    fail(message) {
        this.log('×', 'red', message);
    }

    /**
     * @description Makes service name camel-case
     * @param {String} name service name
     * @access private
     * @memberof Base
     */
    fixServiceName(name) {
        return `${ name.charAt(0).toLowerCase() }${ name.slice(1) }`;
    }
}

module.exports = Base;
