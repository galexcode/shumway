const EventDispatcherDefinition = (function () {
  var CUSTOM_DOM_EVENT_PREFIX = 'shumway.';

  return {
    __class__: 'flash.events.EventDispatcher',

    initialize: function () {
      this._captureHandlers = { };
      this._control = null;
      this._handlers = { };
    },

    addEventListener: function (type, listener, useCapture, prio, useWeakReference) {
      if (typeof listener !== 'function')
        throw ArgumentError();

      if (prio === undefined)
        prio = 0;

      var handlers = useCapture ? this._captureHandlers : this._handlers;
      var handler = handlers[type];

      if (!handler) {
        var target = this;
        handler = {
          queue: [],

          handleEvent: function (evt) {
            if (evt instanceof CustomEvent) {
              var domEvent = evt;
              evt = domEvent.detail;
              evt._eventPhase = domEvent.eventPhase;
            }

            evt._currentTarget = this;

            var queue = this.queue;
            for (var i = 0, n = queue.length; i < n; i++) {
              var entry = queue[i];
              entry.listener(evt);
            }
          }
        };

        if (this._control)
          this._control.addEventListener(CUSTOM_DOM_EVENT_PREFIX + type, handler, useCapture);

        handlers[type] = handler;
      }

      var queue = handler.queue;
      var index = queue.length;
      while (index > 0) {
        var entry = queue[index - 1];

        if (prio < entry.prio)
          break;

        index--;
      }
      queue.splice(index, 0, { listener: listener, prio: prio });
    },
    ctor: function (target) {

    },
    dispatchEvent: function (evt) {
      evt.target = this;

      if (this._control) {
        var domEvent = document.createEvent('CustomEvent');
        domEvent.initCustomEvent(CUSTOM_DOM_EVENT_PREFIX + evt.type, evt.bubbles, evt.cancelable, evt);
        this._control.dispatchEvent(domEvent);
      } else {
        var handler = this._handlers[evt.type];
        if (handler)
          handler.handleEvent(evt);
      }

      return !!evt.isDefaultPrevented;
    },
    hasEventListener: function (type) {
      return type in this._captureHandlers || type in this._handlers;
    },
    removeEventListener: function (type, listener, useCapture) {
      var handlers = useCapture ? this._captureHandlers : this._handlers;
      var handler = handlers[type];
      if (handler) {
        var listeners = handler.listeners;
        var i = listeners.indexOf(listener);
        if (i > -1)
          listeners.splice(i, 1);

        if (!listeners.length) {
          if (this._control)
            this._control.removeEventListener(CUSTOM_DOM_EVENT_PREFIX + type, handler, useCapture);

          delete handlers[type];
        }
      }
    },
    willTrigger: function (type) {
      var dispatcher = this;
      do {
        if (dispatcher.hasEventListener(type))
          return true;
      } while (dispatcher = dispatcher.parent);

      return false;
    }
  };
}).call(this);
