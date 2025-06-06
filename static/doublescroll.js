/*
 * @name DoubleScroll
 * @desc displays scroll bar on top and on the bottom of the div
 * @requires jQuery
 *
 * @author Pawel Suwala - http://suwala.eu/
 * @author Antoine Vianey - http://www.astek.fr/
 * @version 0.5 (11-11-2015)
 *
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 * 
 * Usage:
 * https://github.com/avianey/jqDoubleScroll
 */
 (function( $ ) {
 	
 	jQuery.fn.doubleScroll = function(userOptions) {
	
		// Default options
		var options = {
			contentElement: undefined, // Widest element, if not specified first child element will be used
			scrollCss: {                
				'overflow-x': 'scroll',
				'overflow-y': 'hidden',
				'height': '20px'
			},
			contentCss: {
				'overflow-x': 'scroll',
				'overflow-y': 'hidden'
			},
			onlyIfScroll: false, // top scrollbar is not shown if the bottom one is not present
			resetOnWindowResize: true, // recompute the top ScrollBar requirements when the window is resized
			timeToWaitForResize: 3 // wait for the last update event (usefull when browser fire resize event constantly during ressing)
		};
	
		$.extend(true, options, userOptions);
	
		// do not modify
		// internal stuff
		$.extend(options, {
			topScrollBarMarkup: '<div class="doubleScroll-scroll-wrapper"><div class="doubleScroll-scroll"></div></div>',
			topScrollBarWrapperSelector: '.doubleScroll-scroll-wrapper',
			topScrollBarInnerSelector: '.doubleScroll-scroll'
		});

		var _showScrollBar = function($self, options) {

			if (options.onlyIfScroll && $self.get(0).scrollWidth <= Math.round($self.width())) {
				// content doesn't scroll
				// remove any existing occurrence...
				$self.prev(options.topScrollBarWrapperSelector).remove();
				return;
			}
		
			// add div that will act as an upper scroll only if not already added to the DOM
			var $topScrollBar = $self.prev(options.topScrollBarWrapperSelector);
			
			if ($topScrollBar.length == 0) {
				
				// creating the scrollbar
				// added before in the DOM
				$topScrollBar = $(options.topScrollBarMarkup);
				$self.before($topScrollBar);

				// apply the css
				$topScrollBar.css(options.scrollCss);
				$(options.topScrollBarInnerSelector).css("height", "20px");
				$self.css(options.contentCss);

				var scrolling = false;

				// bind upper scroll to bottom scroll
				$topScrollBar.bind('scroll.doubleScroll', function() {
					if (scrolling) {
						scrolling = false;
						return;
					}
					scrolling = true;
					$self.scrollLeft($topScrollBar.scrollLeft());
				});

				// bind bottom scroll to upper scroll
				var selfScrollHandler = function() {
					if (scrolling) {
						scrolling = false;
						return;
					}
					scrolling = true;
					$topScrollBar.scrollLeft($self.scrollLeft());
				};
				$self.bind('scroll.doubleScroll', selfScrollHandler);
			}

			// find the content element (should be the widest one)	
			var $contentElement;		
			
			if (options.contentElement !== undefined && $self.find(options.contentElement).length !== 0) {
				$contentElement = $self.find(options.contentElement);
			} else {
				$contentElement = $self.find('>:first-child');
			}
			
			// set the width of the wrappers
			$(options.topScrollBarInnerSelector, $topScrollBar).width($contentElement.outerWidth());
			$topScrollBar.width("100%");
			$topScrollBar.scrollLeft($self.scrollLeft());
			
		}
	
		return this.each(function() {
			
			var $self = $(this);
			
			_showScrollBar($self, options);
			
			// bind the resize handler 
			// do it once
			if (options.resetOnWindowResize) {
			
				var id;
				var handler = function(e) {
					_showScrollBar($self, options);
				};
			
				$(window).bind('resize.doubleScroll', function() {
					// adding/removing/replacing the scrollbar might resize the window
					// so the resizing flag will avoid the infinite loop here...
					clearTimeout(id);
					id = setTimeout(handler, options.timeToWaitForResize);
				});

			}

		});

	}

}( jQuery ));