let BarChart = function (app) {
  this.layout = {}
  this.app = app

  this.setup()
  this.render()
}

BarChart.prototype.setup = function () {
  let _this = this

  this.setLayout()
  this.layerBarChart = this.app.svg2.append("g").attr("id", "bar-chart");

  this.addBg()

  this.addChartTitle()

  this.bars = this.layerBarChart.append("g")
  this.maskBars = this.layerBarChart.append("g")

  this.xAxis = this.layerBarChart.append("g")
  this.yAxis = this.layerBarChart.append("g")

  this.radioSelection = this.layerBarChart.append("g").attr("class", "radioselection")
  this.brushFilter = this.layerBarChart.append("g")
  this.brushTip = this.layerBarChart.append("g")
}

BarChart.prototype.render = function () {
  this.setRolledData()
  this.setData()
  this.setCounts()
  this.setClosingPrice()

  this.addScales()
  this.setBarWidth()

  this.addXAxis()
  this.addYAxis()

  this.addMaskBars()
  this.addBars()

  this.addBrushFilter()
  this.addBrushTip()

  this.addInterfalFilter()

  this.transform()
}

BarChart.prototype.setData = function () {
  // const newData = []
  // const start = this.app.dataRange.start

  // for (let key of this.rolledData.keys()) {
  //   if (start && key.getTime() > start.getTime()) {
  //     newData.push([key, this.rolledData.get(key)])
  //   }
  // }

  this.data = this.rolledData
}

BarChart.prototype.setRolledData = function () {
  this.rolledData = d3.rollup(
    this.app.rawData,
    (v) => {
      const random_num = 1 + Math.random() * 2;
      return {
        length: v.length,
        closing_price: random_num.toFixed(2),
        bundle: v,
      };
    },
    (d) => new Date(d.date_string)
  )
}

BarChart.prototype.addBg = function () {
  this.layerBarChart
    .append("rect")
    .attr("id", "barchart-bg")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", this.layout.width)
    .attr("height", this.layout.height)
    .attr("fill", this.layout.bgColor)
    .attr("opacity", 0.2)
}

BarChart.prototype.addBars = function () {
  let _this = this
  this.bars
    .attr("id", "bars")
    .selectAll("rect")
    .data([...this.data], (d) => d[0])
    .join("rect")
    .attr("id", "bars")
    .attr("fill", this.layout.barFill)
    .attr("x", (d) => _this.x(d[0]))
    .attr("y", function (d) {
      return _this.layout.margin.top + _this.y(d[1].length)
    })
    .attr("width", this.barWidth)
    .attr("height", function (d) {
      return _this.y(0) - _this.y(d[1].length);
    })
}

BarChart.prototype.addMaskBars = function () {
  this.maskBarsClip = this.maskBars.append("clipPath").attr("id", "maskBars").append("rect")
    .attr("width", this.layout.width - this.layout.margin.left - this.layout.margin.right)
    .attr("height", this.layout.height - this.layout.margin.top - this.layout.margin.bottom)
    .attr("x", 0)
    .attr("y", this.layout.margin.top)

  this.bars
    .attr("clip-path", "url(#maskBars)")
}

BarChart.prototype.addChartTitle = function () {
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
    .style("text-align", "center")
    .attr("class", "bar-chart-title")
    .append("span")
    .style('width', "100%")
    .attr("class", "bar-chart-title-span")
    .style("color", this.layout.textColor)
    .html("Document Volume")
}

BarChart.prototype.addInterfalFilter = function (params) {
  const _this = this

  const now = new Date()
  const latest = d3.max(this.rolledData.keys())//new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayInMiliseconds = 1000 * 60 * 60 * 24

  const intervals = {
    DAILY: {
      name: "1D",
      date: new Date(latest.getTime() - 1 * dayInMiliseconds)
    },
    WEEKLY: {
      name: "7D",
      date: new Date(latest.getTime() - 6 * dayInMiliseconds)
    },
    MONTHLY: {
      name: "30D",
      date: new Date(latest.getTime() - 29 * dayInMiliseconds)
    },
    ALL: {
      name: "ALL",
      date: d3.min(this.rolledData.keys())
    }
  }

  this.radioSelection.selectAll("foreignObject")
    .data(Object.entries(intervals), ([key, val]) => key)
    .join(
      enter => enter.append("foreignObject")
        .style("cursor", "pointer")
        .attr("width", 40)
        .attr("height", 25)
        .attr("x", this.layout.width - this.layout.margin.right + 20)
        .attr("y", (_, i) => i * 20 + _this.layout.height / 3)
        .append("xhtml:div")
        .style("font-size", 18)
        .style("color", "white")
        .append("span").html(([key, val]) => val.name)
        .on("click", (event, [key, val]) => {
          _this.app.dataRange.start = val.date
          _this.app.dataRange.end = latest

          _this.render()
          _this.app.updateApp()
        })
      ,
      update => update,
      exit => exit.remove())

}

BarChart.prototype.addBrushFilter = function () {
  let _this = this
  let brushSize = {
    x1: this.x(this.app.dataRange.start),
    x2: this.x(this.app.dataRange.end),
    y1: this.layout.height - this.layout.margin.bottom,
    y2: this.layout.height - this.layout.margin.bottom + 30
  }

  let brush = d3.brushX()
    .extent([[brushSize.x1, brushSize.y1], [brushSize.x2, brushSize.y2]])
    .on("end", brushing);

  this.brushFilter
    .call(brush)
    .call(brush.move, [brushSize.x1, brushSize.x2]).attr(
      "transform", `translate(${0},${0})`
    )

  function brushing(event) {
    const selection = event.selection;
    const interval = d3.timeHour.every(24)

    if (!event.sourceEvent || !selection) return;

    const [x0, x1] = selection.map(d => interval.round(_this.x.invert(d)));

    d3.select(this)
      .transition()
      .call(brush.move, x1 > x0 ? [x0, x1].map(_this.x) : null);

    _this.app.dataRange.start = x0
    _this.app.dataRange.end = x1

    _this.updateBrushTip()
    _this.app.updateApp()
  }
}

BarChart.prototype.addBrushTip = function () {
  let _this = this

  this.brushTip.attr("class", "brush-tip").attr(
    "transform",
    `translate(${0},${0})`
  )

  let format = d3.timeFormat("%b/%d")

  let dates = this.x.domain()

  this.brushTipTexts = this.brushTip
    .selectAll("text")
    .data(dates)
    .join("text")
    .text(function (d) {
      return format(d)
    })
    .attr("class", "brush-tips")
    .style("font-size", 10)
    .attr("x", function (d) {
      let textLength = this.getComputedTextLength()
      return _this.x(d) - textLength / 2
    })
    .attr("y", this.layout.height + 20)
    .attr("fill", this.layout.textColor)

}

BarChart.prototype.updateBrushTip = function () {
  let _this = this
  let newDates = [this.app.dataRange.start, this.app.dataRange.end]

  let format = d3.timeFormat("%b/%d")

  this.brushTipTexts
    .data(newDates)
    .join("text")
    .text(function (d) {
      return format(d)
    })
    .attr("x", function (d) {
      let textLength = this.getComputedTextLength()
      return _this.x(d) - textLength / 2
    })

    .attr("x", function (d) {
      let textLength = this.getComputedTextLength()
      return _this.x(d) - textLength / 2
    })

}


BarChart.prototype.transform = function () {
  this.app.svg2.attr(
    "transform",
    `translate(${window.innerWidth * 0.55},${0})`
  );

  this.bars.attr("transform", `translate(${this.layout.margin.left},${0})`)
  this.xAxis.attr("transform", `translate(${this.layout.margin.left},${this.layout.height - this.layout.margin.bottom})`)
  this.yAxis.attr("transform", `translate(${this.layout.margin.left},${this.layout.margin.top})`)
  this.brushFilter.attr("transform", `translate(${this.layout.margin.left},${0})`)
  this.brushTip.attr("transform", `translate(${this.layout.margin.left},${0})`)
  // this.brushTipTexts.attr("transform", `translate(${this.layout.margin.left},${0})`)

}

BarChart.prototype.setCounts = function () {
  this.counts = [...this.data.values()].map((d) => d.length);
}

BarChart.prototype.setClosingPrice = function () {
  this.closingPrice = [...this.data.values()].map((d) => d.closing_price);
}

BarChart.prototype.addScales = function () {
  this.x = d3
    .scaleTime()
    .domain([this.app.dataRange.start, this.app.dataRange.end])
    .range([0, this.layout.width - this.layout.margin.right - this.layout.margin.left]);

  this.y = d3
    .scaleLinear()
    .domain([0, d3.max(this.counts)])
    .range([this.layout.height - this.layout.margin.top - this.layout.margin.bottom, 0]);
}

BarChart.prototype.setBarWidth = function () {
  this.barWidth = (this.layout.width - this.layout.margin.left - this.layout.margin.right) / this.data.size * 0.5
  this.barWidth = 5
}

BarChart.prototype.addXAxis = function () {
  const axisBottom = d3.axisBottom(this.x).ticks(6).tickFormat(d3.timeFormat("%b/%d"));

  this.xAxis
    .attr("id", "xAxis")
    .call(axisBottom)

    .style("color", this.layout.textColor);
}


BarChart.prototype.addYAxis = function () {
  const axisLeft = d3.axisLeft(this.y).ticks(4);
  this.yAxis
    .attr("id", "yAxis")
    .call(axisLeft)
    .attr(
      "transform",
      `translate(${0},${this.layout.margin.top
      })`
    )
    .style("color", this.layout.textColor)
    .call((g) => g.select(".domain").remove());
}



BarChart.prototype.updateDarkMode = function () {
  d3.selectAll("#bars").attr("fill", this.layout.barFill)
  d3.select("#xAxis").style("color", this.layout.textColor)
  d3.select("#yAxis").style("color", this.layout.textColor)
  d3.select("#barchart-bg").attr("fill", this.layout.bgColor)
  d3.select(".bar-chart-title-span").style("color", this.layout.textColor)
  d3.selectAll(".brush-tips").attr("fill", this.layout.textColor)
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
    barFill: function () { return _this.app.darkMode ? "#aaa" : "#333" },
    lineStroke: function () { return _this.app.darkMode ? "#3978e6" : "#3978e6" },
    bgColor: function () { return _this.app.darkMode ? "#222" : "#fff" },
    textColor: function () { return _this.app.darkMode ? "#fff" : "#111" },
  };
}
