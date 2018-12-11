/**
 * Main asux script for the site.
 * Event handling and auxillary things happen here.
 */

var dispatch = d3.dispatch('filter', 'getPanelSettings');

var colorMap = {
  'rose': ['#F1BAC3', '#E27588', '#D93954', '#A43E50', '#6E2A35', '#4F262D'],
  'tangerine': ['#ffdca9', '#ffa929', '#eb8c00', '#ae6800', '#714300', '#452900'],
  'yellow': ['#ffecbd', '#ffc838', '#ffb600', '#c28a00', '#855f00', '#553d00'],
  'red': ['#f7c8c4', '#e86153', '#e0301e', '#aa2417', '#741910', '#461008'],
  'burgunady': ['#e2a2a2', '#c25b5b', '#a32020', '#871010', '#5e0909', '#290000']
},
categoryColorMap = {
  'Value Proposition': colorMap['rose'],
  'Capabilities': colorMap['tangerine'],
  'Leadership': colorMap['red'],
  'Strategy 360': colorMap['burgunady'],
  'Impact': colorMap['burgunady'],
  'Portfolio': colorMap['yellow']
};

function processPayloadFromUrl() {
	try{

    var slug = window.location.href || '',
    // entry after bookmakrked keyword
    aSlug = slug.split('#'),
    aPayload,
    oPairs = {};

    if (aSlug[1]) {

    	aPayload = aSlug[1].split('&');

    	aPayload.forEach(function(p){
    		var _p = p.split('=');
    		oPairs[_p[0]] = _p[1];
    	});

    	// is a tab to be selected?
    	// 
    	if (oPairs.tab) {
    		selectTab(oPairs.tab);
    	}

    	// open a modal?
    	// 
    	if (oPairs.modal) {
    		openModal(oPairs.modal);
    	}

    }    

  }catch(e){
    console.log('ERROR', e.message);
  }
}

/**
 * Process the raw dataset and breakdon into a structure
 * needed for our plotting purposes.
 * @param  {array} aData        raw dataset
 * @param  {array} aBreakdownBy an array of fields of the data in a sequence of structuring required, from top to bottom
 *                              default ['category', 'question', 'tenure', 'response'] i.e. responses breakdown by tenure
 * @return {array}             structured dataset
 */
function getStructuredData(aData, aBreakdownBy /*, bRollup*/) {

  var nest = d3.nest(),
  bRollup = true;

  aBreakdownBy = aBreakdownBy || ['category', 'question', 'tenure', 'response'];

  aBreakdownBy.forEach(function(k){
    nest.key(function(d){ return d[k]; }).sortKeys(d3.ascending)
  });

  if (bRollup) {
    nest.rollup(function(response){ return response.length; })
  }

  return nest.entries(aData);

}

/**
 * Filter the raw dataset using active filter settings
 * @param  {array}  aDataset          
 * @param  {object} oFilterSettings Active filter settings
 * @return {array}                 Filtered dataset
 */
function filterData(aDataset, oFilterSettings) {

  var iFilterCount = oFilterSettings.filters.length;

  var aFD = aDataset.filter(function(d){

    var bMatch = true;

    // For each filter
    // 
    oFilterSettings.filters.forEach(function(f, i){

      // check if values in the datum match values in an active filter
      //             

      bMatch = bMatch && f.values.indexOf(d[f.name]) > -1;

    });

    return bMatch;

  });

  console.log('filterData', aFD);
  
  return aFD;
}

// Stacked Bar Chart
// 
function StackedBar(oConfig) {

  var el = oConfig.el,
  width = oConfig.width || 100,
  height = oConfig.height || 80,
  barHeight = oConfig.barHeight || 50,
  colors = oConfig.colors || d3.schemeAccent,
  margin = oConfig.margin || {top: 10, right: 0, bottom: 10, left: 0},
  y = d3.scaleLinear()
    .domain([0, 1])
    .range([margin.left, width - margin.right - margin.left]),
  colorScale = d3.scaleOrdinal(colors),
  format = d3.format('.0%'),
  data = oConfig.data || [],

  svg,
  gOuter;

  function init() {

    var svg = d3.select(el).append('svg').classed('stackedbar', true);

    gOuter = svg.append('g')
      .classed('g-outer', true);

    update();
    
  }

  function renderer() {
    
    var g = gOuter.selectAll("g")
      .data(data);
    
    // Enter
    var gEnter = g.enter().append("g");
    
    // Enter + Update
    gEnter.merge(g)
      .attr("fill", function(d, i){
        return colorScale(d.key)
      });
    
    // Add Bars // Enter continued
    gEnter.append("rect")
    .merge(g) // Enter + Update
    .attr("x", function(d, i) {
      return i ? y(d.cumPercentage - d.percentage) : 0;
    })
    .attr("y", 0)
    .attr("height", barHeight)
    .attr("width", function(d,i) {
      return y(d.percentage)
    });
    
    // Add Text // Enter continued
    gEnter.append("text")
    .merge(g) // Enter + Update
      .attr("fill", "white")
      .attr("text-anchor", "start")
      .style("font", "12px sans-serif")
      .attr("x", function(d, i) {
        return i ? y(d.cumPercentage - d.percentage) : 0;
      })
      .attr("y", "10")
      .attr("dx", "0.35em")  
      .attr("dy", "0.35em")
      .text(function(d,i) {
        return format(d.percentage); 
      });
  }

  function update() {

    // calculate cumulative values on data
    // 
    data = cumulatePercentage(data);

    renderer();
  }

  function cumulatePercentage(aData){
    var c = 0,
    total = d3.sum(aData, function(d){  return +d.value; });

    return aData.map(function(d){
      d.percentage = d.value / total;
      d.cumPercentage = c+= d.percentage;
      return d;
    });
  }

  init();
  
}

// Deviation Bar Chart
// 
function DeviationBar(oConfig) {

  var el = oConfig.el,
  width = oConfig.width || 100,
  height = oConfig.height || 80,
  barHeight = oConfig.barHeight || 50,
  margin = oConfig.margin || {top: 10, right: 5, bottom: 10, left: 0},
  fill = oConfig.fill,
  symbolFill = oConfig.symbolFill || '#ffffff',
  format = d3.format('.0%'),
  data = oConfig.data || [{average: 0.4, upper: 0.7, lower: 0.2}],
  lineStrokeWidth = 4,
  bShowAxis = oConfig.showAxis || false,
  size = 95,

  y = d3.scaleLinear()
    .domain([0, 1])
    .range([margin.left, width - margin.right - margin.left]),

  // Axis
  axis = d3.axisTop(y).tickFormat(d3.format('.0%')),

  svg,
  gOuter;

  var bigDiamondSymbol = function () {
    var wy = Math.sqrt(1 / 3),
    My = 2 * wy;
    
    return {
      draw: function(t, n) {
        var e = Math.sqrt(n / My)
        , r = e * wy * 1.75;
        t.moveTo(0, -e),
          t.lineTo(r, 0),
          t.lineTo(0, e),
          t.lineTo(-r, 0),
          t.closePath()
      }
    }
  }();

  function customAxis(g) {
    g.call(axis);
    g.select(".domain").remove();
    g.selectAll(".tick text").filter(function(){
      return ['0%', '50%', '100%'].indexOf(this.innerHTML) == -1
    }).remove();
  }

  function init() {

    svg = d3.select(el).append('svg')
    	.classed('deviationbar', true)
    	.attr("width", width)
    	.attr("height", height)
    	.style("height", height + 'px');

    if (bShowAxis) {
      
      svg.append("g")
      	.classed('axis', true)
        .attr("transform", "translate(0, 20)")
        .call(customAxis);
    }

    gOuter = svg.append('g')
      .classed('g-outer', true);

    if (bShowAxis) {
    	gOuter
        .attr("transform", "translate(0, 20)");
    }

    renderer();
    
  }

  function renderer() {
              
    var g = gOuter.selectAll("g")
      .data([data]);
    
    // Enter
    let gEnter = g.enter().append("g");
    
    // Enter + Update
    gEnter.merge(g)
       .attr("fill", fill);
    
    // Add Background // Enter continued
    gEnter.append("rect")
    .merge(g) // Enter + Update
    .attr("x", 0)
    .attr("y", 0)
    .attr("height", barHeight)
    .attr("width", width - margin.left - margin.right);
    
    
    // Add deviation line
    gEnter.append("line")
    .merge(g) // Enter + Update
    .attr("x1", function(d){
      return y(d.lower);
    })
    .attr("x2", function(d){
      return y(d.upper);
    })
    .attr("y1", 0.5 * (barHeight) - 1 )
    .attr("y2", 0.5 * (barHeight) - 1 )
    .attr("stroke-width", lineStrokeWidth)
    .attr("stroke", symbolFill)
    .attr("stroke-opacity", 0.8);
    
    gEnter.append("path")
      .merge(g)
      .attr("transform", function(d){ return 'translate(' + y(d.average) + ', ' + (0.5 * (barHeight) - 1) + ')'; })
      .attr("fill", symbolFill)
      .attr("d", d3.symbol().type(bigDiamondSymbol).size(size));
        
  }

  init();
  
}

/**
 * Draws a legend based on configuration
 * @param  {object} oConfig {
 *   el: DOM selector where the legend will be drawn,
 *   data: dataset of the graph {array}
 *   colors: colors in valid color format {array}
 *   fnKey: a function to return KEY of a data tuple {function}
 * }
 */
function drawLegend(oConfig) {

  var el = oConfig.el,
  data = oConfig.data,
  colors = oConfig.colors,
  barHeight = oConfig.barHeight || 15,
  shapeWidth = oConfig.shapeWidth || 15,
  shapePadding = oConfig.shapePadding || 40,
  fnKey = oConfig.fnKey || function(d){ return d.key; };

  var svg = d3.select(el).append('svg')
    .classed('graph-legend', true)
    .classed('js-skip-viewbox-auto-adjust', true);
  
  var scale = d3.scaleOrdinal()
    .domain(data.map(fnKey))
    .range(colors);

  var g = svg.append("g")
    .attr("class", "legendLinear")
    .attr("transform", "translate(0,0)");

  var legendLinear = d3.legendColor()
    .cells(data.length)
    .shapeWidth(shapeWidth)
    .shapeHeight(barHeight)
    .shapePadding(shapePadding)
    .labelWrap(shapePadding*.75 - shapeWidth*2)
    .orient('horizontal')
    .labelAlign("inline") //start
    .scale(scale);

  svg.select(".legendLinear")
    .call(legendLinear);

  try {
    var elSvg = svg.node(),
    bb = elSvg.getBoundingClientRect(),
    padding = 0;
    elSvg.setAttribute("width", bb.width + padding);
    elSvg.setAttribute("height", bb.height + padding);
    elSvg.setAttribute("viewBox", [0, 0, bb.width, bb.height].join(' '))
  }catch(e){

  }

}

// Handling for Fixed header tables
// 
function initTableFixed() {

  var fcBody = document.querySelector(".tbl-fixed .fix-column > .tbody"),
      rcBody = document.querySelector(".tbl-fixed .rest-columns > .tbody"),
      rcHead = document.querySelector(".tbl-fixed .rest-columns > .thead");
  rcBody.addEventListener("scroll", function() {
      fcBody.scrollTop = this.scrollTop;
      rcHead.scrollLeft = this.scrollLeft;
  }, { passive: true });
}

// Test data generator
function generateData() {
    
  var values = ['Yes', 'No', 'May be', 'Don\'t Know'],
    maxTotal = 10 * values.length,
    curr =  10 * values.length;
  
  return values.map(function(d, i){
    var t = d3.randomUniform(10)(),
        nextVal;
    
    curr-=t;
    
    nextVal = (i == values.length-1) ? (curr+=t): t;
    
    return {
      key: d,
      value: nextVal,
      percentage: nextVal/maxTotal
    }
  });
}

// Activate a tab
// 
function selectTab(tabId) {
  try {
    $('a[href="#'+tabId+'"]').tab('show')
  }catch(e){}
}

// Open a Modal
// 
function openModal(modalId) {
  try {
    $('#'+modalId).modal('show')
  }catch(e){}
}

// Link Hooks
// 
function initJSHooks() {

  $('.js-hook').off('click').on('click', function(){

    var data = $(this).data(),
    tab = data.tab,
    modal = data.modal,
    url = data.url,
    tag = data.tag,
    sLocation = url + (tab ? '#tab='+tab : '') + (modal ? '&modal='+modal : '') + (tag ? '&tag='+tag : '');

    window.open(sLocation);

  });

}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
}

/**
 * @param  {[document.Element]} dom element whose snapshot needs to be taken
 * @return {[jQuery Deferred]} jQuery.Deferred Object which will resolve when the snapshot is ready
 */
function takeElementSnapshot(domElement){

  var oDef = jQuery.Deferred();

  //applyDimensionsToSvg();

  html2canvas(domElement, {
    logging: false,
    svgRendering: true,
    allowTaint: true,
    // Keeps the quality and size low
    scale: 1, // window.devicePixelRatio
    background: null,  // allows for transparent background 
    onclone: function(oDom){
      
      var el = $(oDom).find('#'+domElement.id);
      
      el.addClass("taking-snapshot");

      if (el.attr("html2canvas-no-padding") === undefined) {
        el.addClass("p-3");
      }
      
      applyDimensionsToSvg(el[0]);
    }
    //height: 5000  // Will use Window height by default
    //width: 960  // Will use Window width by default
  }).then(function(canvas) {
    oDef.resolve(canvas.toDataURL("image/jpeg", 1));
  });
  
  // Some dom elements must have width/height dimensions applied to them
  // before a snapshot is taken.
  // Do it here
  function applyDimensionsToSvg(domElement){
    
    // ignore svg icons
    // 
    var nodeList = domElement.querySelectorAll("svg:not(.js-skip-viewbox-auto-adjust)");
    
    nodeList.forEach(function(e){
      try {
        var bb = e.getBBox(),
        padding = 10;
        e.setAttribute("width", bb.width + padding);
        e.setAttribute("height", bb.height + padding);
        e.setAttribute("viewBox", [bb.x, bb.y, bb.width, bb.height].join(' '))
      }catch(e){}
    });
    
  };

  // Return deferred object
  return oDef;
}

function downloadImage(sImageData, filename) {
  /// create an "off-screen" anchor tag
  var lnk = document.createElement('a'), e;

  /// the key here is to set the download attribute of the a tag
  lnk.download = filename;

  /// convert canvas content to data-uri for link. When download
  /// attribute is set the content pointed to by link will be
  /// pushed as "download" in HTML5 capable browsers
  lnk.href = sImageData;

  /// create a "fake" click-event to trigger the download
  if (document.createEvent) {
    e = document.createEvent("MouseEvents");
    e.initMouseEvent("click", true, true, window,
                     0, 0, 0, 0, 0, false, false, false,
                     false, 0, null);

    lnk.dispatchEvent(e);
  } else if (lnk.fireEvent) {
    lnk.fireEvent("onclick");
  }
}

/**
 * Only convert the canvas to Data URL when the user clicks. 
 * This saves RAM and CPU ressources in case this feature is not required.
 * @param  {string} sDataUrl Image data returned by canvas.toDataURL()
 * @return {string}          Image octet stream string
 */
function getCanvasImage(sDataUrl) {
  
  var dt = sDataUrl,
  sFileName = 'Chart.jpeg';

  /* Change MIME type to trick the browser to downlaod the file instead of displaying it */
  dt = dt.replace(/^data:image\/[^;]*/, 'data:application/octet-stream');

  /* In addition to <a>'s "download" attribute, you can define HTTP-style headers */
  dt = dt.replace(/^data:application\/octet-stream/, 'data:application/octet-stream;headers=Content-Disposition%3A%20attachment%3B%20filename='+sFileName);

  return dt;
};


function initDownloadHook(){
  // Download Button
  // 
  $('.btn-download, .js-btn-camera').off('click').on('click', function(){

    var btn = $(this),
    target = $(btn.data('target'));

    if (target.length) {
      var oDeferred = takeElementSnapshot(target[0]);

      // Do we have the snapshot?
      jQuery.when(oDeferred)
        .then(function(domImageDataURI){
          var dt = getCanvasImage(domImageDataURI);
          downloadImage(dt, 'Chart.jpeg');
        });
    }

  });
}

function fixSVGIconFill() {
  setTimeout(function(){
    $('[fill="currentColor"], tspan.down, tspan.up').each(function(){
      $(this).attr("fill", $(this).css('fill'));
    });
  }, 0)
}


$(function(){

	// 
	// 

	// Event Binding
	// 
  initDownloadHook();

	// Filter Panel: Type - Selection
	// Does following - 
	// 1. Makes primary menu item checkbox tick work
	// 2. Shows SubMenu selection in the main side panel
	// 
	$('.js-filter-panel .dropdown-item').on('click', function diClick(e) {

		var el = $(this),
		elMenuItem = el.closest('.dropright'),
		elMenuInput = elMenuItem.find('> .dropdown-item > input'),
		input = el.find('input'),
		elSubMenu = elMenuItem.find('.dropdown-menu--submenu'),
		hasSubMenuItems = elSubMenu.length && !!elSubMenu.children().length,
		elSelectedSubMenuItems = elMenuItem.find('.dropdown-item-selection'),
		elCheckedSubMenuItems,
		bChecked = false,
		bDispatch = false;

		// 1. Makes primary menu item checkbox tick work
		// This should only be considered when there are no submenu items
		// of this menu item.
		// 
		// When a menu item has a sub menu, the menu item should
		// be marked as checked on when at least one of its
		// sub menu item has been checked.
		// 
		if (el.data('toggle') == 'dropdown' && !hasSubMenuItems) {
			input.prop('checked', bChecked = !input.prop('checked'));
			bDispatch = true;
		}

		if (el.parent().hasClass('dropdown-menu--submenu')) {

			// 2. Shows SubMenu selection in the main side panel
			// 
			
			// show all checked sub-menu items
			//
			elSelectedSubMenuItems.html('');
			elCheckedSubMenuItems = elSubMenu.find('input[type=checkbox]:checked');

			elCheckedSubMenuItems.each(function ie(){
				var val = this.value;
				elSelectedSubMenuItems.append('<span class="dropdown-item-text">'+val+'</span>');
			});

			// Check menu item
			// 
			elMenuInput.prop('checked', bChecked = !!elCheckedSubMenuItems.length);

			el = elMenuInput.parent();

			bDispatch = true;
		}

		// Toggle Active Class
		// 
		if (bChecked) {
			el.addClass('active');
		}else{
			el.removeClass('active');
		}

		bDispatch && dispatch.call('getPanelSettings');
		
	});

	// Filter Panel: Type - Selection
	// Does following - 
	// 1. Makes primary menu item checkbox tick work
	// when there exist sub menu items
	// 
	$('.js-filter-panel .dropright > .dropdown-item > input[type=checkbox]').on('click', function diClick(e) {

		var input = $(this),
		elMenuItem = input.closest('.dropright'),
		bChecked,
		elSubMenu = elMenuItem.find('.dropdown-menu--submenu'),
		hasSubMenuItems = elSubMenu.length && !!elSubMenu.children().length,
		elSelectedSubMenuItems = elMenuItem.find('.dropdown-item-selection'),
		elSubMenuItems = elSubMenu.find('input[type=checkbox]');

		// Toggle Active Class
		input.parent().toggleClass('active');

		// 
		// When a menu item has a sub menu, the menu item should
		// be marked as checked on when at least one of its
		// sub menu item has been checked.
		// 
		
		bChecked = input.prop('checked');

		// If menu item has sub menu items,
		// toggle their selection
		if (hasSubMenuItems) {

			elSubMenuItems.prop('checked', bChecked);
			
			// if unchecked, clear all submenu items
			//
			elSelectedSubMenuItems.html(''); 
			if (bChecked) {
				
				// Else show the selection
				elSubMenuItems.each(function ie(){
					var val = this.value;
					elSelectedSubMenuItems.append('<span class="dropdown-item-text">'+val+'</span>');
				});
			}

			dispatch.call('getPanelSettings');
						
		}

		e.stopPropagation();
				
	});

	// Breadkdown and Sort By Panels
	// 
	$('.js-breakdownby-panel .dropdown-item, .js-sortby-panel .dropdown-item, .js-category-panel .dropdown-item, .js-consistency-panel').on('click', function diClick(e) {

		dispatch.call('getPanelSettings');

	});

	// Category Panel for questions
	// 
	$('.js-category-question-panel .dropdown-item').on('click', function cqpiClick(e) {

		$(this).toggleClass('active');

	});

	// Toggle Question selection
	// 
	$('.js-btn-question-selection').on('click', function(e){

		e.preventDefault();

		var bChecked = $(this).data('checked') == true;

		$('.js-modal-allquestion input[type=checkbox]').prop('checked', bChecked);

	});

	/**
	 * Get an object representing the active 
	 * filter, breakdown and sort by values.
	 *
	 * Detects if a Modal is active. If true, filters inside the modal are returned.
	 * 
	 * @param {selector} 	elTarget Optional container element which should be scanned for active filters
	 * @return {object} 	JSON Object
	 */
	function getActiveFilters(elTarget) {

		// Is there any active modal?
		// 
		// If a modal has class js-modal-inclusive, include this modal's sidepanels
		// alsong with main sidepanels on the page (not inside a modal)
		var elModal = $('.modal.show'),
		isModal = false
		isInclusiveModal = elModal.hasClass('js-modal-inclusive');

		if (elModal.length && !isInclusiveModal) {
			elTarget = elModal;
			isModal = true;
		}

		var elSidepanels = elTarget ? $(elTarget).find('.sidepanel') : $('.sidepanel'),
		oConfig = {
			filters: [],
			breakdownBy: null,
			sortBy: null,
			consistency: null
		};

		// if target is not a modal,
		// select only those panels which are not inside any hidden modal
		//
		var elMainPagePanels = elSidepanels.filter(function(){
			return !$(this).closest('.modal').length;
		}); 

		// If No modal is active
		if (!isModal) {
			elSidepanels = elMainPagePanels;
		}

		// If inclusive modal, add its panels as well
		if (isInclusiveModal) {
			elSidepanels = elSidepanels.add(elModal.find('.sidepanel'));
		}

		// Loop through each type of sidepanel
		// 
		elSidepanels.each(function(){

			var elPanel = $(this),
			isFilter = elPanel.hasClass('js-filter-panel'),
			isBreakdownBy = elPanel.hasClass('js-breakdownby-panel'),
			isSortBy = elPanel.hasClass('js-sortby-panel'),
			isCategory = elPanel.hasClass('js-category-panel'),
			isConsistency = elPanel.hasClass('js-consistency-panel');

			if (isFilter) {

				// For each selected menu item
				// 
				elPanel.find('> .dropdown-menu > .dropright > .dropdown-item > input[type=checkbox]').each(function(){

					var obj = {
						name: $(this).val(),
						values: []
					};

					// get selected sub menu items
					// 
					$(this).closest('.dropright').find('.dropdown-item-selection').children().each(function(){
						obj.values.push($(this).html());
					});


					// only push a filter is it has a selection
					// 
					if (obj.values.length /*|| $(this).prop('checked')*/) {
						oConfig.filters.push(obj);
					}

				});

			}

			if (isCategory) {

				// For each selected menu item
				// 
				var aCategories = [];
				elPanel.find('.dropdown-item > input[type=checkbox]:checked').each(function(){

					aCategories.push(this.value);

				});

				oConfig.filters.push({
					name: 'category',
					values: aCategories
				});

			}

			if (isSortBy) {

				oConfig.sortBy = elPanel.find('input[type=radio]:checked').val();

			}

			if (isBreakdownBy) {

				oConfig.breakdownBy = elPanel.find('input[type=radio]:checked').val();

			}

			if (isConsistency) {

				oConfig.consistency = elPanel.find('input[type=radio]:checked').val();

			}

		});



		return oConfig;
		
	}

	// Dispatch Events
	// 

	dispatch.on('getPanelSettings', function(){
		console.log(getActiveFilters());
		dispatch.apply('filter', null, [getActiveFilters()]);
	});

	// Add Tooltip to Download buttons
	// 
	$('.btn-download')
		.attr('data-toggle', 'tooltip')
		.attr('title', 'Download Graphic');

	// init tooltips
	// 
	$('[data-toggle="tooltip"]').tooltip();


	processPayloadFromUrl();

  initJSHooks();

});