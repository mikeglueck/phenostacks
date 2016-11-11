
function drawWordCloud( selector, words, scale ) {
  var fill = d3.scale.category20();

  d3.layout.cloud().size([300, 300])
    .words(words)
      // .words([
      //   ".NET", "Silverlight", "jQuery", "CSS3", "HTML5", "JavaScript", "SQL","C#"].map(function(d) {
      //   return {text: d, size: 10 + Math.random() * 50};
      // }))
      //.rotate(function() { return ~~(Math.random() * 2) * 90; })
      .rotate(0)
      .font("Impact")
      .fontSize(function(d) { return d.size; })
      .on("end", draw)
      .start();

  function draw(words) {
    d3.select(selector).select("svg").remove("*");
    d3.select(selector).append("svg")
        .attr("width", 300)
        .attr("height", 300)
      .append("g")
        .attr("transform", "translate(150,150)")
      .selectAll("text")
        .data(words)
      .enter().append("text")
        .style("font-size", function(d) { return d.size + "px"; })
        .style("font-family", "Impact")
        .style("fill", function(d, i) { return fill(i); })
        .attr("text-anchor", "middle")
        .attr("transform", function(d) {
          return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
        })
        .text(function(d) { return d.text; })
        .on("click", function(d) {
          var query = d.text.slice(0,-1);

          uiSearchQuery( query );
          //uiHighlightHpoByName( query, uiShowSearchResults );
        });
  }
}
