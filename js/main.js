/**
 * Main aux script for the site.
 * Event handling and auxillary things happen here.
 */

var dispatch = d3.dispatch('filter', 'getPanelSettings');

var colorMap = {
  'rose': ['#F1BAC3', '#E27588', '#D93954', '#A43E50', '#6E2A35', '#4F262D'],
  'tangerine': ['#ffdca9', '#ffa929', '#eb8c00', '#ae6800', '#714300', '#452900'],
  'yellow': ['#ffecbd', '#ffc838', '#ffb600', '#c28a00', '#855f00', '#553d00'],
  'red': ['#f7c8c4', '#e86153', '#e0301e', '#aa2417', '#741910', '#461008'],
  'burgundy': ['#e2a2a2', '#c25b5b', '#a32020', '#871010', '#5e0909', '#290000'],
  'black': ['#333','#333','#333','#333','#333','#333']
},
categoryColorMap = {
  'Overall': colorMap['black'],
  'Value Proposition': colorMap['rose'],
  'Capabilities': colorMap['tangerine'],
  'Leadership': colorMap['red'],
  'strategythreesixty': colorMap['burgundy'],
  'Impact': colorMap['burgundy'],
  'Portfolio': colorMap['yellow']
};

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
  bRollup = true,
  // sort based on following sequence
  sortBy = ['Strategy threesixty', 'Value Proposition', 'Capabilities', 'Portfolio', 'Leadership', 'Impact'],
  data;

  aBreakdownBy = aBreakdownBy || ['category', 'question', 'tenure', 'response'];

  aBreakdownBy.forEach(function(k){
    nest.key(function(d){ return d[k]; }).sortKeys(d3.ascending)
  });

  if (bRollup) {
    nest.rollup(function(response){ return response.length; })
  }

  data = nest.entries(aData);

  // Sort the categories if that is the top level
  // 
  if (aBreakdownBy[0] == 'category') {
    data.forEach(function(d){
      d.sortIndex = sortBy.indexOf(d.key);
    });

    data.sort(function(a, b){
      return d3.ascending(a.sortIndex, b.sortIndex);
    });
  }

  return data;

}

/**
 * Process the raw dataset and breakdon into a structure
 * needed for our plotting purposes.
 * Being used for Questions
 * @param  {array}  aData         raw dataset
 * @param  {string} sBreakdownBy  Key to breakdown responses by
 * @return {array}                structured dataset
 */
function getStructuredQuestionData(aData, sBreakdownBy) {

  var nest = d3.nest(),
  bRollup = true,
  // sort based on following sequence
  sortBy = ['Strategy threesixty', 'Value Proposition', 'Capabilities', 'Portfolio', 'Leadership', 'Impact'],
  data = [],
  aNestBy,
  aFreeform,
  aMultipart,
  aApply;


  //--------------------
  
  aNestBy = ['category', 'question'];

  aNestBy.forEach(function(k){
    nest.key(function(d){ return d[k]; }).sortKeys(d3.ascending)
  });
  //  nest.rollup(function(response){ return response.map(function(d){ return d.feedback; }); })

  aFreeform = nest.entries(aData.filter(function(d){ return d.qType == 'freeform'; }));

  //--------------------

  aNestBy = ['category', 'question', 'statement', sBreakdownBy, 'response'];

  nest = d3.nest();

  aNestBy.forEach(function(k){
    nest.key(function(d){ return d[k]; }).sortKeys(d3.ascending)
  });

  if (bRollup) {
    nest.rollup(function(response){ return response.length; })
  }

  aMultipart = nest.entries(aData.filter(function(d){ return d.qType == 'multipart'; }));

  //--------------------

  aNestBy = ['category', 'question', 'statement', sBreakdownBy, 'response'];

  nest = d3.nest();

  aNestBy.forEach(function(k){
    nest.key(function(d){ return d[k]; }).sortKeys(d3.ascending)
  });

  if (bRollup) {
    nest.rollup(function(response){ return response.length; })
  }

  aApply = nest.entries(aData.filter(function(d){ return d.qType == 'apply'; }));
  
  var aCategories = {};
  
  // for each category - freeform
  aFreeform.forEach(function(c){
    
    aCategories[c.key] = aCategories[c.key] || [];
    
    var aQ = c.values.map(function(q){
      q.qType = 'freeform';
      return q;
    });
    
    // Disable freeform for now
    // TODO - enable it
    aCategories[c.key].push(aQ);
    
  });
  
  // for each category - multipart
  aMultipart.forEach(function(c){
    
    aCategories[c.key] = aCategories[c.key] || [];
    
    var aQ = c.values.map(function(q){
      q.qType = 'multipart';
      return q;
    });
    
    aCategories[c.key].push(aQ);
    
  });
  
  // for each category - apply
  aApply.forEach(function(c){
    
    aCategories[c.key] = aCategories[c.key] || [];
    
    var aQ = c.values.map(function(q){
      q.qType = 'apply';
      return q;
    });
    
    aCategories[c.key].push(aQ);
    
  });
  
  Object.keys(aCategories).forEach(function(c){
    
     data.push({
       key: c,
       values: d3.merge(aCategories[c])
     });
    
  });

  // Sort the categories if that is the top level
  // 
  
  data.forEach(function(d){
    d.sortIndex = sortBy.indexOf(d.key);
  });

  data.sort(function(a, b){
    return d3.ascending(a.sortIndex, b.sortIndex);
  });

  return data;
  
}

/**
 * Filter the raw dataset using active filter settings
 * @param  {array}  aDataset          
 * @param  {object} oFilterSettings Active filter settings
 * @return {array}                 Filtered dataset
 */
function filterData(aDataset, oFilterSettings) {

  function _getLowerCase(sVal){
    return (sVal || '').toString().toLowerCase();
  }

  var iFilterCount = oFilterSettings.filters.length,
  lowercaseFilters = oFilterSettings.filters.map(function(d){
    d.values = d.values.map(function(v){
      return v.toLowerCase();
    });
    return d;
  });

  var aFD = aDataset.filter(function(d){

    var bMatch = true;

    // For each filter
    // 
    lowercaseFilters.forEach(function(f, i){

      // check if values in the datum match values in an active filter
      //             

      bMatch = bMatch && f.values.indexOf(_getLowerCase(d[f.name])) > -1;

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
  isAll = !!oConfig.isAll,
  barHeight = (oConfig.barHeight || 50) * (isAll ? 1.2 : 1),
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
      .attr("fill", function(d,i) {
        //return d.percentage < .05 ? '#333' : '#fff'; 
        return i == 0 ? '#222' : '#fff'; 
      })
      .attr("text-anchor", "start")
      .style("font", "12px sans-serif")
      .attr("x", function(d, i) {
        return i ? y(d.cumPercentage - d.percentage) : 0;
      })
      .attr("y", isAll ? 14.5 : 12)
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
  size = oConfig.isAll ? 114 : 95,

  y = d3.scaleLinear()
    .domain([0, 1])
    .range([margin.left, width - margin.right - margin.left]),

  axisScale = y.copy().range([y.range()[0], y.range()[1]-1]),

  // Axis
  axis = d3.axisTop(axisScale).tickFormat(d3.format('.0%')).tickSizeInner(10),

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

    g.select(".tick:first-child text")
      .attr("text-anchor", "start");

    g.select(".tick:last-child text")
      .attr("text-anchor", "end");
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
        .attr("transform", "translate(0, 24)")
        .call(customAxis);
    }

    gOuter = svg.append('g')
      .classed('g-outer', true);

    if (bShowAxis) {
    	gOuter
        .attr("transform", "translate(0, 24)");
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
    .classed('js-skip-viewbox-auto-adjust', true)
    .style('font-family', 'Arial');
  
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

  // adjust width of columns
  // 
  // if columns don't occupy full width, expand them
  // 
  var firstRow = $(rcBody).children()[0],
  firstRowSize = firstRow.getBoundingClientRect(),
  rcBodySize = $(rcBody)[0].getBoundingClientRect(),
  colSize = 120,
  offset = 10;

  if (rcBodySize.width > firstRowSize.width) {
    colSize = (rcBodySize.width / $(firstRow).children().length) - offset;

    $('.tbl-fixed .rest-columns > .tbody > .trow > span').each(function(){
      $(this).css('width', colSize);
    });

    $('.tbl-fixed .rest-columns > .thead > span').each(function(){
      $(this).css('width', colSize);
    });
  }


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
    bPassFilter = !!data.filter,
    sLocation = url + (tab ? '?tab='+tab : '') + (modal ? '&modal='+modal : '') + (tag ? '&tag='+tag : '');

    // Pass filter settings?
    if (bPassFilter) {
      sLocation += '&' + buildActiveFilterURL();
    }

    window.open(encodeURI(sLocation));

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
    scale: 2, // window.devicePixelRatio
    //background: null,  // allows for transparent background 
    onclone: function(oDom){
      
      var el = $(oDom).find('#' + domElement.id);
      
      el.addClass("taking-snapshot");

      if (el.attr("html2canvas-no-padding") === undefined) {
        el.addClass("p-3");
      }

      $(oDom).find('[data-html2canvas-ignore-maxheight]')
        .css('max-height', '1000000000000px');
      
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
}

function getPDF($target, imgData, bReturnRawPDF){

  var HTML_Width = $target.width();
  var HTML_Height = $target.height();
  var top_left_margin = 15;
  var margin = { top: 35, right:15, bottom: 35, left: 15 };
  var PDF_Width = HTML_Width + margin.left + margin.right;
  var PDF_Height = (PDF_Width*1.5)+ margin.top + margin.bottom;
  var canvas_image_width = HTML_Width;
  var canvas_image_height = HTML_Height,
  printedHeight = 0;
  
  var totalPDFPages = Math.ceil(HTML_Height/PDF_Height);
  
  var pdf = new jsPDF('p', 'pt',  [PDF_Width, PDF_Height]);

  console.log('totalPDFPages', totalPDFPages, HTML_Height/PDF_Height, HTML_Height, PDF_Height);

  for (var i = 0; i < totalPDFPages; i++) { 
    if (i) {
      pdf.addPage(/*PDF_Width, PDF_Height*/);
    }

    // add image
    pdf.addImage(imgData, 'JPEG', 
      margin.left, 
      printedHeight + (margin.top) * (i ? 1 : 0),
      canvas_image_width,
      canvas_image_height
    );

    if (i) {

      // top margin
      pdf.setFillColor('#ffffff');
      pdf.rect(0, 0, PDF_Width, margin.top, 'F');

    }

    // bottom margin
    pdf.setFillColor('#ffffff');
    pdf.rect(0, PDF_Height - margin.bottom, PDF_Width, PDF_Height, 'F');

    printedHeight -= PDF_Height - margin.bottom - margin.top * (i ? 1 : 0);
  }

  // Return raw PDF?
  // 
  if (bReturnRawPDF) {
    return pdf.output('blob');
  }else{
    pdf.save("Chart.pdf");
  }
}

/**
 * Generates a multi-page PDF from an array of image
 * @param  {array}  aImages       An image to be printed on a single page
 * @param  {int}    imageWidth    Width of an image
 * @param  {array}  aImageHeight  Image height
 * @return {object} jQuery Defferred
 */
function generatePDF(aImages, imageWidth, aImageHeight) {

  var oDef = jQuery.Deferred();

  // images should have the padding/margin
  var margin = { top: 0, right: 0, bottom: 0, left: 0 };
  var pageWidth = imageWidth + margin.left + margin.right;
  var pageHeight = pageWidth*1.25 + margin.top + margin.bottom;
  var totalPDFPages = aImages.length,
  imageHeight = 1150,
  ratio;
  
  var pdf = new jsPDF('p', 'px', /*[pageWidth, pageHeight]*/);

  pageWidth = pdf.internal.pageSize.getWidth();
  pageHeight = pdf.internal.pageSize.getHeight();

  for (var i = 0; i < totalPDFPages; i++) { 
    if (i) {
      pdf.addPage();
    }

    ratio = pageWidth / imageWidth;

    // add image
    pdf.addImage(aImages[i], 'JPEG', 
      margin.top, 
      margin.left,
      pageWidth,
      Math.max(Math.min(ratio * aImageHeight[i], pageHeight), 125)
    );

  }

  // Return PDF
  oDef.resolve(pdf);

  return oDef;

}

/**
 * Create pages by spreading children into several pages
 * which are currently inside a single outer parent.
 * The children direclty under domElement are paginated.
 * @param  {[type]} domElement  [description]
 * @param  {[type]} iPageHeight [description]
 * @return {[type]}             [description]
 */
function paginateElement(domElement, iPageHeight) {

  iPageHeight = iPageHeight || 1150;

  var iCount = 1,
  total = $(domElement).children().length,
  iChildStartCount = 0,
  iChildEndCount = 0,
  pageHeight = 0,
  elCurrentPage,
  iPageCount = 1;

  function getId(i) {
    return domElement.id + '-js-sp-' + i;
  }

  // if already paginated once, dont do it again
  // 
  if ($(domElement).find('.js-sp').length) {
    return false;
  }

  // Start wrapping children into pages until a page reaches its height limit.
  // Then, create a new page and repeat.

  $(domElement).prepend('<div class="js-sp" id="'+getId(iPageCount)+'"></div>');

  elCurrentPage = $(domElement).find('.js-sp');

  while(iCount <= total){

    var elNextChild = $(domElement).find('> :nth-child('+(iPageCount+1)+')'),
    nextChildHeight = elNextChild[0].getBoundingClientRect().height;
    pageHeight = elCurrentPage[0].getBoundingClientRect().height;

    // collect children until the pageHeight is reached
    // 
    if ((pageHeight+nextChildHeight) > iPageHeight) {

      // create next page
      var pageCount = $(domElement).find('> .js-sp').length;
      // increment page count
      iPageCount = pageCount + 1;

      // add next page
      $(domElement).find('> .js-sp:nth-child('+pageCount+')').after('<div class="js-sp" id="'+getId(iPageCount)+'"></div>');
      // update current page
      elCurrentPage = $(domElement).find('> .js-sp:nth-child('+iPageCount+')');

    }

    elNextChild.appendTo(elCurrentPage);

    iCount++;

  }

  
}

// Show a loader
function loading(bShow) {
  $('#site_loader').remove();
  if (bShow) {
    var tpl = '<div id="site_loader" class="loader"> <div class="loader__dots"> <span></span> <span></span> <span></span> </div> </div>';
    $('body').append(tpl);
  }

}

function initDownloadHook(){
  // Download Button
  // 
  $('.btn-download, .js-btn-download').off('click').on('click', function(){

    var btn = $(this),
    target = $(btn.data('target')),
    isMultiPage = btn.data('multipage') !== undefined;

    if (target.length) {
      loading(true);

      var oDeferred = takeElementSnapshot(target[0]);

      // Do we have the snapshot?
      jQuery.when(oDeferred)
        .then(function(domImageDataURI){
          var dt = getCanvasImage(domImageDataURI);
          loading();
          downloadImage(dt, 'Chart.jpeg');
        });
    }

  });

  // Download PDF of an element which needs to be paginated
  // 
  $('.js-btn-camera[data-paginate]').off('click').on('click', function(){

    var btn = $(this),
    target = $(btn.data('target'));

    if (target.length) {

      loading(true);

      setTimeout(function(){

        // create pages inside the target
        // whose snapshots will be taken
        // 
        paginateElement(target[0]);

        // Take snapshot of every page
        //
        var aDeffered = [],
        aImageHeight = [];
        target.find('.js-sp').each(function(){
          aImageHeight.push(this.getBoundingClientRect().height);
          aDeffered.push(takeElementSnapshot(this));
        });

        // Do we have the snapshot?
        $.when.apply($, aDeffered)
          .then(function(){

            $.when(generatePDF(arguments, $(target).width(), aImageHeight))
              .then(function(pdf){

                loading();

                //if (bReturnRawPDF) {
                //return pdf.output('blob');
                
                // Download PDF
                // 
                pdf.save("Chart.pdf");
                
              });

          });

      }, 0);
    }

  });

  // Download PDF of a single page element
  // 
  $('.js-btn-camera:not([data-paginate]), .js-btn-pdf:not([data-paginate])').off('click').on('click', function(){

    var btn = $(this),
    target = $(btn.data('target'));

    if (target.length) {

      loading(true);

      setTimeout(function(){

        var oDeferred = takeElementSnapshot(target[0]);

        // Do we have the snapshot?
        jQuery.when(oDeferred)
          .then(function(domImageDataURI){
            //savePDF(getPDF(target, domImageDataURI, true));
            getPDF(target, domImageDataURI);

            loading();

          });

      }, 0);
    }

  });

}

function savePDF(base64Data, sFilename) {

  // Create a form
  // <form enctype="multipart/form-data" method="post" name="fileinfo" id="fileinfo"></form>
  var form = d3.select('body')
    .append('form')
    .attr('enctype', 'multipart/form-data') 
    .attr('method', 'post')
    .attr('name', 'savepdf');
    //.style('visibility', 'hidden');
    

  // Add filedata to form
  // 
  var formData = new FormData(/*form.node()*/),
  opts = {};

  formData.append('pdf', base64Data);

  // output as blob

  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (this.readyState == 4) {
      if (this.status !== 200) {
        // handle error
        console.log('Error: Uploading file', this)
      }
    }
  }

  xhr.open('POST', 'data/upload.php', true);
  xhr.send(formData);

  /*

  opts = {
    url: 'data/upload.php',
    data: formData,
    cache: false,
    contentType: false,
    processData: false,
    method: 'POST',
    type: 'POST', // For jQuery < 1.9
    success: function(data){
      console.log('server results', data);
    }
  };

  // Fallback for Old brosers
  if(formData.fake) {
    // Make sure no text encoding stuff is done by xhr
    opts.xhr = function() { var xhr = jQuery.ajaxSettings.xhr(); xhr.send = xhr.sendAsBinary; return xhr; }
    opts.contentType = "multipart/form-data; boundary="+data.boundary;
    opts.data = data.toString();
  }

  //$.ajax(opts);
  var xhr = new XMLHttpRequest();
  xhr.open('post', 'data/upload.php', true ); //Post to php Script to save to server
  xhr.send(opts.data);

  */
  
}

function fixSVGIconFill() {
  setTimeout(function(){
    $('[fill="currentColor"], tspan.down, tspan.up').each(function(){
      $(this).attr("fill", $(this).css('fill'));
    });
  }, 0)
}

function updatePageTitle(sectionName) {
  document.title = 'Strategy& - Strategy threesixty' + (sectionName ? ('- ' + sectionName) : '');
}

/**
 * Get an object representing the active 
 * filter, breakdown and sort by values.
 *
 * Detects if a Modal is active. If true, filters inside the modal are returned.
 * 
 * @param {selector}  elTarget Optional container element which should be scanned for active filters
 * @return {object}   JSON Object
 */
function getActiveFilters($elTarget) {

  // Is there any active modal?
  // 
  // If a modal has class js-modal-inclusive, include this modal's sidepanels
  // along with main sidepanels on the page (not inside a modal)
  var elModal = $('.modal.show'),
  isModal = !!elModal.length,
  isInclusiveModal = elModal.hasClass('js-modal-inclusive');

  var elSidepanels,
  oConfig = {
    filters: [],
    breakdownBy: null,
    sortBy: null,
    consistency: null
  };

  // When no modal is active or a modal with inclusive class is active:
  // Collect all filters which are
  // 1. Not inside a modal
  // 2. Inside a modal with class js-modal-inclusive
  //
  if ($elTarget && $elTarget.length) {
    elSidepanels = $elTarget.find('.sidepanel');
  }else if (!isModal || isInclusiveModal) {
    var elMainPagePanels = $('.sidepanel').filter(function(){
      return !$(this).closest('.modal').length;
    }); 
    var elModalPanels = $('.modal.js-modal-inclusive:not(.hide) .sidepanel:not(.js-non-iteractive)');

    elSidepanels = elMainPagePanels.add(elModalPanels);
  }else if (isModal) {  // Non inclusive modal is active
    elSidepanels = elModal.find('.sidepanel:not(.js-non-iteractive)');
  }

  /*
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
  }*/

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
          //obj.values.push($(this).html().toLowerCase());
          obj.values.push($(this).html());
        });


        // only push a filter is it has a selection
        // 
        if (obj.values.length /*|| $(this).prop('checked')*/) {
          oConfig.filters.push(obj);
        }

      });

      // disable breakdown by options
      disableBreakdownBy(oConfig.filters.map(function(d){
        return d.name;
      }));

    }

    if (isCategory) {

      // For each selected menu item
      // 
      var aCategories = [];
      elPanel.find('.dropdown-item > input[type=checkbox]:checked').each(function(){

        //aCategories.push(this.value.toLowerCase());
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

      var $item = elPanel.find('input[type=radio]:checked');
      if (!$item.parent().hasClass('disabled')) {
        oConfig.breakdownBy = $item.val();
      }

    }

    if (isConsistency) {

      oConfig.consistency = elPanel.find('input[type=radio]:checked').val();

    }

  });



  return oConfig;
  
}

/**
 * Disable BreakdownBy options
 * @param  {array} aBreakdownBy string value representing breakdown by keys
 */
function disableBreakdownBy(aBreakdownBy){

  $('.js-breakdownby-panel .md-cb.disabled').removeClass('disabled');

  // disable each item
  // 
  aBreakdownBy.forEach(function(sItem){
    var $item = $('.js-breakdownby-panel input[type="radio"][value="'+sItem+'"]');

    $item.parent().addClass('disabled');
  })

}

/**
 * Build URL querystring encoding active filters
 * @return {string} 
 */
function buildActiveFilterURL() {

  var oFilters = getActiveFilters(),
  payload = '';

  oFilters.filters.forEach(function(of){

    var sFilter = [of.name,'=', of.values.join('|')].join('');

    // add to payload
    payload += sFilter + '&';

  });

  // add flag for active filter playload
  // 
  payload += 'filter=1';
  
  return payload;

}

function processPayloadFromUrl() {
  try{

    var slug = decodeURI(window.location.href || ''),
    // entry after bookmakrked keyword
    aSlug = slug.split('?'),
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

      // Has active filters?
      //
      if (oPairs.hasOwnProperty('filter')) {
        initFilters(oPairs);
      }

    }    

  }catch(e){
    console.log('ERROR', e.message);
  }
}


function initFilters(oPayload) {

  var elFilterPanel = $('.js-filter-panel');

  // reset any applied filters
  // 
  elFilterPanel.find('input[type="checkbox"]')
    .removeAttr('checked')
    .prop('checked', false);

  elFilterPanel.find('.dropdown-item-selection').html('');

  // loop through available payloads
  // and apply their values
  // 
  Object.keys(oPayload)
  .filter(function(sFilter){
    // only check for valid filters
    return ['year', 'management', 'category', 'tenure', 'geography', 'org_unit'].indexOf(sFilter) > -1;
  })
  .forEach(function(sFilter){

    // if year
    // find filter item, check it
    var elInput = elFilterPanel.find('input[type="checkbox"][value="'+ sFilter +'"]'),
    oItem = elInput.parent(),
    elSubMenu = oItem.parent().find('.dropdown-menu--submenu');

    // check it
    //oItem.prop('checked', 'checked');
    
    // also check its given values
    // 
    var sValue = oPayload[sFilter],
    aValues = sValue.split('|');

    aValues.forEach(function(sFilterValue){
      // find the sub-menut item and click it
      // 
      elSubMenu.find('input[type="checkbox"][value="'+sFilterValue+'"]')
        .trigger('click');
    });

  });
  
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

    // check if item is disabled
    // 
    if (!$(this).hasClass('disabled')) {
		  dispatch.call('getPanelSettings');
    }else{
      e.preventDefault();
    }

	});

  // Checkbox reset for Breakdown By panel
  // 
  $('.js-md-cb-reset').on('click', function(e){

    //e.stopPropagation();

    $(this).siblings('input[type="radio"]')
      .prop('checked', false)
      .removeAttr('checked');

  });


	// Dispatch Events
	// 

	dispatch.on('getPanelSettings', function(){
		console.log(getActiveFilters());
    setTimeout(function(){
      dispatch.apply('filter', null, [getActiveFilters()]);
    }, 1);
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