function getFilteredData(dataStore) {
  dataStore.struct.collapseTree( 100, 1 );
  var clusters = dataStore.struct.getClusters();

  //dataStore.struct.getClusters2();

  //dataStore.struct.flattenTree( 100, 0 );
  //var flat = dataStore.struct.getFlat();
  dataStore.struct.collapseTree( 100, 0 );
  var flat = dataStore.struct.getFilteredTree();

  //dataStore.struct.flattenTree( 100, 0 );
  //var cats = dataStore.struct.getCats();
  dataStore.struct.collapseTree( 100, 1 );
  var cats = dataStore.struct.getFilteredTree();

  dataStore.struct.collapseTree( 100, CUTOFF );
  var tree = dataStore.struct.getFilteredTree();
  
  var data = {
    'struct': tree,
    'flat': flat,
    'cats': cats,
    'clusters': clusters,
    'pats': dataStore.pats,
    'phenos': dataStore.phenos,
    'cohortMap': dataStore.cohortMap,
    'hpMap': dataStore.hpMap
  };

  return data;
}

function uiUpdateDescription(hp, patient, phenotype, hpMap) {
  _frequencyLabels.updateDescription(hp, patient, phenotype, hpMap);
}

function uiRedraw() {
  // Draw PhenoBlocks width with no collapsing
  drawPhenoblocks( 10, 15 );

  var data = getFilteredData(_dataStore);
  _frequencyLabels.draw(data);  // Sort patients first
  var ret = d3.phylogram.draw(data, options);

  // Refresh search input
  //searchListLeafNodes = utils.getLeafNodes( data.struct, 'children' );
  searchListLeafNodes = utils.getLeafNodes( ret.nodes[0], 'children' );
  $('#search-input').trigger('input');

  // $('use.icon:not(.tooltipstered)').tooltipster({
  //   'animation': 'fade',
  //   'offsetX': -4,
  //   'offsetY': -7,
  //   'speed': 250,
  //   'delay': 250,
  //   'position': 'top-left'
  // });

  // $('circle.node:not(.tooltipstered)').tooltipster({
  //   'animation': 'fade',
  //   'offsetX': -4,
  //   'offsetY': -7,
  //   'speed': 250,
  //   'delay': 250,
  //   'position': 'top-left'
  // });
}

function uiSortTree( sort ) {
  SORT=sort;
  uiRedraw();
}

function uiSortCohort( sort ) {
  SORTPAT=sort;
  uiRedraw();
}

function uiCutoffTree( cutoff ) {
  CUTOFF = cutoff;
  _dataStore.struct.collapseTree( DENSITY, CUTOFF );
  uiRedraw();
}

function uiDensityTree( density ) {
  DENSITY=density;
  _dataStore.struct.collapseTree( DENSITY, CUTOFF );
  uiRedraw();
}

function uiFrequencyIC( density ) {
  FREQUENCYIC=density;
  uiRedraw();
}

function uiSearchQuery( query ) {
  $('#search-input').val( query );
  $('#search-input').trigger('input'); 
}

function uiCollapseNode( node ) {
  _dataStore.struct.collapseNode(node.uuid, !node.fltr.override);
  uiRedraw();
}

function uiLayout( layout ) {
  options.layoutType = layout;
  uiRedraw();
}

function uiToggleFilterEmpty() {
  FILTEREMPTY = !FILTEREMPTY;
  uiRedraw();
}

function setActiveDropdownItem( item, menu ) {
  var name = item.text();
  menu.find("span.active-text").text(name);
}

function initLayout() {
  // TODO: Address 1px borders around elements
  var pstyle = 'border:0; background: #eee;';

  $('#layout').w2layout({
      name: 'layout',
      panels: [
          { type: 'left', size: 360 },
          { type: 'main', overflow: 'hidden' },
          { type: 'right', size: 240 }
      ]
  });

  w2ui['layout'].load('left', 'inc/left_panel.html');
  w2ui['layout'].load('main', 'inc/main_panel.html');
  w2ui['layout'].load('right', 'inc/right_panel.html');

  // Hack -- need to detect when main_panel and right_panel finish loading
  setTimeout(initSettings, 500);
}

function setSortPhenotypes( el, sort ) {
  setActiveDropdownItem(el, $("#button-sort-hp")); uiSortTree( sort );
}
function setSortCohorts( el, sort ) {
  setActiveDropdownItem(el, $("#button-sort-cohort")); uiSortCohort( sort );
}
function setLayout( el, sort ) {
  setActiveDropdownItem(el, $("#button-layout")); uiLayout( sort );
}

function initSortPhenotypeOptions( compare ) {
  var items = '';
  if (compare) {
    // Two cohorts
    items += '<li><a href="#" id="btn-sort-hp-freq-all">Overall Frequency</a></li>';
    items += '<li><a href="#" id="btn-sort-hp-freq-c1">Cohort 1 Frequency</a></li>';
    items += '<li><a href="#" id="btn-sort-hp-freq-c2">Cohort 2 Frequency</a></li>';
    $("#button-sort-hp-options").append(items);

    $("#btn-sort-hp-freq-all").click(function() { setSortPhenotypes($(this), 'all'); });
    $("#btn-sort-hp-freq-c1").click(function() { setSortPhenotypes($(this), 'c1'); });
    $("#btn-sort-hp-freq-c2").click(function() { setSortPhenotypes($(this), 'c2'); });
  
  } else {
    items += '<li><a href="#" id="btn-sort-hp-freq-all">Frequency</a></li>';
    $("#button-sort-hp-options").append(items);

    $("#btn-sort-hp-freq-all").click(function() { setSortPhenotypes($(this), 'c1'); });
  }
}

function initSortCohortsOptions( options ) {
  for (var i = 0, n = options.length; i < n; i++) {
    var option = options[i];
    var id = "btn-sort-cohort-"+ option.attr;
    var item = '<li><a href="#" id="'+ id +'">'+ option.name +"</a></li>";

    $("#button-sort-cohort-options").append(item);
    $("#"+id).click(
      (function(attr) { return function() { setSortCohorts($(this), attr); }; })(option.attr)
      );
  }
}

function initSettings() {
  // Initialize buttons
  setActiveDropdownItem($("#btn-sort-hp-ic"), $("#button-sort-hp"));
  setActiveDropdownItem($("#btn-sort-cohort-id"), $("#button-sort-cohort"));
  setActiveDropdownItem($("#btn-layout-tree"), $("#button-layout"));

  $("#btn-sort-hp-alpha").click(function() { setSortPhenotypes($(this), 'alpha'); });
  $("#btn-sort-hp-ic").click(function() { setSortPhenotypes($(this), 'ic'); });
/*  $("#btn-sort-hp-cluster").click(function() { setSortPhenotypes($(this), 'cluster'); });*/
  $("#btn-sort-hp-clusterorder").click(function() { setSortPhenotypes($(this), 'clusterorder'); });

  $("#btn-sort-cohort-id").click(function() { setSortCohorts($(this), 'id'); });
  $("#btn-sort-cohort-freq").click(function() { setSortCohorts($(this), 'freq'); });
/*  $("#btn-sort-cohort-cluster").click(function() { setSortCohorts($(this), 'cluster'); });*/
  $("#btn-sort-cohort-clusterorder").click(function() { setSortCohorts($(this), 'clusterorder'); });

  $("#btn-layout-tree").click(function() { setLayout($(this), 'tree'); });
  $("#btn-layout-flat").click(function() { setLayout($(this), 'flat'); });
  $("#btn-layout-cats").click(function() { setLayout($(this), 'cats'); });
  $("#btn-layout-clusters").click(function() { setLayout($(this), 'clusters'); });

  // TODO: Fix this feature
  $("#btn-filter-empty").click(function() { uiToggleFilterEmpty(); });
  
  $("#sld-tree-compress").slider({
      'min': 0,
      'max': 12,
      'value': CUTOFF,
      'precision': 0,
      'step': 1,
      'tooltip': 'hide',
    })
    .on('slide', function(e) {
      $('#sld-tree-compress-value').text(e.value);
    })
    .on('slideStop', function(e) { 
      $('#sld-tree-compress-value').text(e.value);
      uiCutoffTree(e.value);
    })
    ;
  $('#sld-tree-compress-value').text(CUTOFF);

  // $("#sld-tree-duplication").slider({
  //     'min': 1,
  //     'max': 10,
  //     'value': DENSITY,
  //     'precision': 2,
  //     'step': 0.25,
  //     'tooltip': 'hide'
  //   })
  //   .on('slide', function(e) {
  //     $('#sld-tree-duplication-value').text(e.value);
  //   })
  //   .on('slideStop', function(e) {
  //     $('#sld-tree-duplication-value').text(e.value);
  //     uiDensityTree(e.value);
  //   })
  //   ;
  // $('#sld-tree-duplication-value').text(DENSITY);

  $("#sld-tree-frequencyic").slider({
      'min': 0,
      'max': 1,
      'value': FREQUENCYIC,
      'precision': 2,
      'step': 0.1,
      'tooltip': 'hide'
    })
    .on('slide', function(e) {
      $('#sld-tree-frequencyic-value').text(e.value);
    })
    .on('slideStop', function(e) {
      $('#sld-tree-frequencyic-value').text(e.value);
      uiFrequencyIC(e.value);
    })
    ;
  $('#sld-tree-frequencyic-value').text(FREQUENCYIC);

  $('#chart-panel').on("scroll", function(d) {
    var offset = $(this).scrollLeft();
    $('#labels-panel').css('left', -offset);
    $('.labels-headers-main').css('left', -offset);
  });

  // Hide summary type dropdown
  $("#button-summary").hide();

  load();
}
