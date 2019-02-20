(function($) {

'use strict';
$.fn.crossfade = function(options, endDelay) {

    
  /*
   * A function that simply returns true so I didn't have to type: function() { return true; }, four times above.
   */
  var blank = function() {
    return true;
  };

  options = isNaN(options) ? options : {startDelay: options, endDelay: (typeof endDelay === 'undefined') ? options : endDelay};
  

  options = $.extend({
          startDelay: 1000, // amount of time it takes to fade from the first image to the second image (in milliseconds)
          endDelay: 1000, // amount of time it takes to fade from the second image back to the first image (in milliseconds)
          startCallback: blank, // function to call when the crossfading begins
          endCallback: blank, // function to call when the second image is transitioning back to the first image
          startCondition: blank, // condition to evaluate/return true if the crossfading is to start
          endCondition: blank, // condition to evaluate/return true if the crossfading is to complete
          useAttr: 'style', // the attribute to pull the second image source path from
          regex: 'background(-image)?:.*url\\((.+)\\)' // the regex used to find the value/src of the second image
  }, options);

  var bindCrossfade = function($$, options) {
    var isRunning = false;
    var img = $$.prev();
    var timeouts = [];

    /*
     * A function to create the image for crossfading
     */
    var setImgAttrs = function($$) {
      // console.log( src);
      // create the crossfading image
      // 
      img.css({
        position: 'absolute',
        zIndex: 100,
        opacity: 0
      });

      $$.css({
        position: 'relative',
        zIndex: 101
      });
      return;
    };

    var clearTimeouts = function () {
      var l = timeouts.length;
      for (var x = 0; x < l; x++) {
        clearTimeout(timeouts[x]);
      }
    };

    /* 
     * Function that is called on the hover (over) event
     */
    var over = function() {
      // console.log('hover called');
      if (options.startCondition($$) && !isRunning) {
        // console.log('passed condition');
        clearTimeouts();
        isRunning = true;
        setImgAttrs($$);
        $$.fadeTo(2000, 0);
        img.fadeTo(2000, 1);
        options.startCallback($$, img);
      }
    };

    /*
     * Function that is called on the hover (out) event
     */
    var out = function () {
      var checkDone = function () {
        // console.log('checkDone called');
        if (isRunning) {
          if (done) {
            clearTimeouts();
            isRunning = false;
          }
          done = true;
          // handle race condition
          if (isRunning) {
            var timeout = setTimeout(function() {
              checkDone();
            }, 100);
            timeouts.push(timeout);
          }
        }
      };

      // console.log('hover out called');
      var done = false;
      if (options.endCondition($$) && isRunning) {
        $$.fadeTo(2000, 1, function() {
          $$.stop(true, true);
          checkDone();
        });
        img.fadeTo(2000, 0, function() {
          img.stop(true);
          checkDone();
        });
      }

    };

    
    // if jquery.hoverIntent is available, use it
    if ($.isFunction($.fn.hoverIntent)) {
      $$.hoverIntent(over, out);
    }
    // otherwise use the regular hover event
    else {
      $$.hover(over, out);
    }
  };


  
  $(this).each(function() {
    var $$ = $(this);
    // console.log('got here');
    bindCrossfade($$, options);
  });

};

})(jQuery);
