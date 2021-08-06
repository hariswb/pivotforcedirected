let BarChart = function (app) {
  this.layout = {}
  this.app = app
  this.data = [];
  this.dataRolled = []

  this.setLayout()
  this.setData()

  this.draw()
}

BarChart.prototype.addBg = function () {
  this.layerBarChart
    .append("rect")
    .attr("id", "barchart-bg")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", this.layout.width)
    .attr("height", this.layout.height)
    .attr("fill", this.layout.bgColor);
}

BarChart.prototype.addBars = function () {
  let _this = this
  this.layerBarChart
    .append("g")
    .attr("id", "bars")
    .attr("fill", "steelblue")
    .attr("fill-opacity", 0.8)
    .selectAll("rect")
    .data([...this.dataRolled])
    .join("rect")
    .attr("fill", this.layout.barFill)
    .attr("x", function (d) {
      return _this.layout.margin.left + _this.x(d[0]) - _this.barWidth / 2
    })
    .attr("y", function (d) {
      return _this.layout.margin.top + _this.y1(d[1].length)
    })
    .attr("width", this.barWidth)
    .attr("height", function (d) {
      return _this.y1(0) - _this.y1(d[1].length);
    })
}

BarChart.prototype.addLine = function () {
  let _this = this
  const line = d3
    .line()
    .x(function (d) {
      return _this.x(d[0]) + _this.layout.margin.left;
    })
    .y((d) => {
      return _this.y2(d[1].closing_price) + _this.layout.margin.top;
    });


  this.layerBarChart
    .append("path")
    .attr("fill", "none")
    .attr("stroke", this.layout.lineStroke)
    .attr("stroke-miterlimit", 1)
    .attr("stroke-width", 2)
    .attr("d", line([...this.dataRolled].sort((a, b) => a[0] - b[0])));
}



BarChart.prototype.draw = function () {
  let _this = this

  console.log(this.dataRolled, this.data)

  this.layerBarChart = this.app.svg.append("g").attr("id", "bar-chart");

  this.transform()

  this.addBg()

  this.setCounts()
  this.setClosingPrice()

  this.createScales()

  this.setBarWidth()

  this.addXAxis()

  this.addY1Axis()

  this.addY2Axis()

  this.addBars()

  this.addLine()

  this.addDataFilter()

  this.layerBarChart
    .append("g")
    .attr("id", "barchart-title")
    .append("foreignObject")
    .attr("width", this.layout.width - this.layout.margin.left - this.layout.margin.right)
    .attr("height", this.layout.margin.top)
    .attr("x", this.layout.margin.left)
    .attr("y", 0)
    .style("font-size", 16)
    .append("xhtml:div")
    .attr("class", "bar-chart-title")
    .append("span")
    .attr("class", "bar-chart-title-span")
    .style("color", this.layout.textColor)
    .html("Daily Document Volume With Closing Share Price (ADIL)");

}

BarChart.prototype.addDataFilter = function () {
  console.log(this)
  let _this = this
  let brush = d3.brushX()
    .extent([[0, this.layout.height - this.layout.margin.bottom],
    [this.layout.width - this.layout.margin.right - this.layout.margin.left, this.layout.height - this.layout.margin.bottom + 30]])
    .on("end", brushended);

  this.layerBarChart.append("g").call(brush).attr(
    "transform",
    `translate(${this.layout.margin.left},${0})`
  )

  let interval = d3.timeHour.every(24)

  function brushended(event) {
    const selection = event.selection;
    if (!event.sourceEvent || !selection) return;

    const [x0, x1] = selection.map(d => interval.round(_this.x.invert(d)));

    console.log(x0, x1)

    d3.select(this)
      .transition()
      .call(brush.move, x1 > x0 ? [x0, x1].map(_this.x) : null);
  }

}

BarChart.prototype.transform = function () {
  this.layerBarChart.attr(
    "transform",
    `translate(${window.innerWidth * 0.55},${0})`
  );
}

BarChart.prototype.setCounts = function () {
  this.counts = [...this.dataRolled.values()].map((d) => d.length);
}

BarChart.prototype.setClosingPrice = function () {
  this.closingPrice = [...this.dataRolled.values()].map((d) => d.closing_price);
}

BarChart.prototype.createScales = function () {
  this.x = d3
    .scaleTime()
    .domain([d3.min(this.dataRolled.keys()), d3.max(this.dataRolled.keys())])
    .rangeRound([0, this.layout.width - this.layout.margin.right - this.layout.margin.left]);

  this.y1 = d3
    .scaleLinear()
    .domain([0, d3.max(this.counts)])
    .range([this.layout.height - this.layout.margin.top - this.layout.margin.bottom, 0]);

  this.y2 = d3
    .scaleLinear()
    .domain([d3.min(this.closingPrice), d3.max(this.closingPrice)])
    .range([this.layout.height - this.layout.margin.top - this.layout.margin.bottom, 0]);
}

BarChart.prototype.setBarWidth = function () {
  const oneDay = 24 * 60 * 60 * 1000;
  const dateDiffMs = d3.max(this.dataRolled.keys()) - d3.min(this.dataRolled.keys());
  const dateNumDiff = Math.round(Math.abs(dateDiffMs / oneDay));
  this.barWidth =
    (this.layout.width - this.layout.margin.left - this.layout.margin.right) / dateNumDiff;
  this.barPadding = 0.2 * this.barWidth
  this.barWidth = this.barWidth - this.barPadding
}

BarChart.prototype.addXAxis = function () {
  this.xAxis = d3.axisBottom(this.x).ticks(6).tickFormat(d3.timeFormat("%b/%d"));

  this.layerBarChart
    .append("g")
    .attr("id", "xAxis")
    .call(this.xAxis)
    .attr(
      "transform",
      `translate(${this.layout.margin.left},${this.layout.height - this.layout.margin.bottom})`
    )
    .style("color", this.layout.textColor);
}


BarChart.prototype.addY1Axis = function () {

  this.y1Axis = d3.axisLeft(this.y1);
  this.layerBarChart
    .append("g")
    .attr("id", "y1Axis")
    .call(this.y1Axis)
    .attr(
      "transform",
      `translate(${this.layout.margin.left - this.barWidth / 2 - this.barPadding},${this.layout.margin.top
      })`
    )
    .style("color", this.layout.textColor)
    .call((g) => g.select(".domain").remove());
}

BarChart.prototype.addY2Axis = function () {

  this.y2Axis = d3.axisRight(this.y2).tickFormat(formatTickY2Axis);

  function formatTickY2Axis(d) {
    return this.parentNode.nextSibling ? `\xa0${d}` : `$${d}`;
  }

  this.layerBarChart
    .append("g")
    .attr("id", "y2Axis")
    .call(this.y2Axis)
    .attr(
      "transform",
      `translate(${this.layout.width - this.layout.margin.left + this.barWidth / 2 + this.barPadding
      },${this.layout.margin.top})`
    )
    .style("color", this.layout.textColor)
    .call((g) => g.select(".domain").remove());

}



BarChart.prototype.setData = function () {
  let _this = this

  this.app.data.forEach(function (d) {
    const obj = d;
    const date = new Date(d.publish_date);
    obj.date_published = date;
    obj.date_string = date.toDateString();

    _this.data.push(obj);
  });

  this.dataRolled = d3.rollup(
    this.data,
    (v) => {
      const random_num = 1 + Math.random() * 2;
      return {
        length: v.length,
        closing_price: random_num.toFixed(2),
        bundle: v,
      };
    },
    (d) => new Date(d.date_string)
  );
}

BarChart.prototype.updateDarkMode = function () {
  d3.select("#xAxis").style("color", this.layout.textColor)
  d3.select("#y1Axis").style("color", this.layout.textColor)
  d3.select("#y2Axis").style("color", this.layout.textColor)
  d3.select("#barchart-bg").attr("fill", this.layout.bgColor)
  d3.select(".bar-chart-title-span").style("color", this.layout.textColor)

}

BarChart.prototype.setLayout = function () {
  let _this = this
  this.layout = {
    height: 200,
    width: 500,
    margin: {
      top: 50,
      bottom: 30,
      left: 50,
      right: 50,
    },
    barFill: function () { return _this.app.darkMode ? "#aaa" : "#ccc" },
    lineStroke: function () { return _this.app.darkMode ? "#3978e6" : "#3978e6" },
    bgColor: function () { return _this.app.darkMode ? "#222" : "#fff" },
    textColor: function () { return _this.app.darkMode ? "#fff" : "#111" },
  };

}
