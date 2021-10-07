let BarChart = function (app) {
  this.layout = {}
  this.app = app

  this.constants = {
    TIME: "time",
    ORDINAL: "ordinal",
    LINEAR: "linear"
  }

  this.dimensionScales = new Map()

  this.selectedDimension = ""
  this.selectedScale = ""

  this.setup()
  this.draw()
}

BarChart.prototype.setup = function () {
  let _this = this

  this.setLayout()
  this.layerBarChart = this.app.svg2.append("g").attr("id", "bar-chart");

  this.addBg()

  // this.addChartTitle()
  this.barchartDropdowns = d3.select(".barchart-selections-dropdowns")

  this.bars = this.layerBarChart.append("g")
  this.maskBars = this.layerBarChart.append("g")

  this.xAxis = this.layerBarChart.append("g")
  this.yAxis = this.layerBarChart.append("g")

  this.radioSelection = this.layerBarChart.append("g").attr("class", "radioselection")
  this.brushFilter = this.layerBarChart.append("g")
  this.brushTip = this.layerBarChart.append("g")

  this.getDimensionScales()
  this.addBarDimensionSelection()
}

BarChart.prototype.draw = function () {
  this.setScale()
  this.setData()

  this.addBars()

  this.addFilterTools()

  this.addTransform()
}

BarChart.prototype.addFilterTools = function () {
  this.brushFilter.select("g").remove()
  this.brushTip.selectAll("text").remove()
  this.radioSelection.selectAll("foreignObject").remove()

  switch (this.selectedScale) {
    case this.constants.TIME:
      this.addBrushFilter()
      this.addBrushTip()
      this.addIntervalFilter()
      break;
    case this.constants.LINEAR:
      this.addBrushFilter()
      this.addBrushTip()
      break;

    default:
      break;
  }
}

BarChart.prototype.getDimensionScales = function () {
  const _this = this
  this.app.keys.forEach(key => {
    const scales = [_this.constants.ORDINAL]
    const numberTest = [_this.constants.LINEAR, _this.app.rawData.every(d => checkNumber(d[key]))]
    const dateTest = [_this.constants.TIME, _this.app.rawData.every(d => checkDate(d[key]))]
    const tests = [numberTest, dateTest]

    tests.forEach(([scale, testResult]) => {
      if (testResult === true) {
        scales.push(scale)
      }
    })

    _this.dimensionScales.set(key, scales)
  });


  if ([...this.dimensionScales.keys()].includes("publish_date")) {
    this.selectedDimension = "publish_date"
    this.selectedScale = this.constants.TIME

  } else {
    this.selectedDimension = [...this.dimensionScales.keys()][0]
    this.selectedScale = this.dimensionScales.get(this.selectedDimension)[0]


  }

  function checkDate(val) {
    const date = new Date(val)
    return date instanceof Date && !isNaN(date)
  }

  function checkNumber(val) {
    return !isNaN(val) && !isNaN(parseFloat(val))
  }
}


BarChart.prototype.addBarDimensionSelection = function () {
  const _this = this

  this.barDimensionDropdown = d3.select(".barchart-dimension-dropdown")
  this.barDimensionDropdown.selectAll("div").remove()

  this.barScaleDropdown = d3.select(".barchart-scale-dropdown")
  this.barScaleDropdown.selectAll("div").remove()

  this.barDimensionButton = this.barDimensionDropdown.append("div").attr("class", "dropdown-button barchart-dropdown-button")
    .on("click", function (event) {
      _this.barDimensionOptions.classed("hide", !_this.barDimensionOptions.node().classList.contains("hide"))
    })
  const imageUrl = { arrowDown: "./static/arrow_drop_down_black_24dp.svg", arrowRight: "./static/arrow_right_black_24dp.svg" }
  const buttonImg = this.barDimensionButton.append("img").attr("class", "dropdown-button-arrow").attr("src", imageUrl.arrowRight)
  const buttonText = this.barDimensionButton.append("div").attr("class", "dropdown-button-text").html(this.selectedDimension)

  this.barDimensionOptions = this.barDimensionDropdown.append("div")
    .attr("class", "dropdown-dimension-content barchart-dropdown-contents")
    .classed("hide", true)
  this.barDimensionOptions
    .selectAll("span")
    .data([...this.dimensionScales.keys()], d => d)
    .join(enter => enter.append("span")
      .html(d => d)
      .style("cursor", "pointer")
      .on("click", function (event, d) {
        _this.selectedDimension = d
        _this.addBarDimensionSelection()

        const scales = _this.dimensionScales.get(_this.selectedDimension)
        _this.selectedScale = scales.some(d => d !== _this.constants.ORDINAL) ? scales.filter(d => d !== _this.constants.ORDINAL)[0] : _this.constants.ORDINAL

        createScaleOptions()
        _this.draw()
        _this.app.updateApp()
      })
    )

  createScaleOptions()

  function createScaleOptions() {
    _this.barScaleDropdown.selectAll("div").remove()
    _this.barScaleButton = _this.barScaleDropdown.append("div").attr("class", "dropdown-button barchart-dropdown-button")
      .on("click", function (event) {
        _this.barScaleOptions.classed("hide", !_this.barScaleOptions.node().classList.contains("hide"))
      })
    const imageUrl = { arrowDown: "./static/arrow_drop_down_black_24dp.svg", arrowRight: "./static/arrow_right_black_24dp.svg" }
    const buttonImg = _this.barScaleButton.append("img").attr("class", "dropdown-button-arrow").attr("src", imageUrl.arrowRight)
    const buttonText = _this.barScaleButton.append("div").attr("class", "dropdown-button-text").html(_this.selectedScale)

    _this.barScaleOptions = _this.barScaleDropdown.append("div")
      .attr("class", "dropdown-dimension-content barchart-dropdown-contents")
      .classed("hide", true)

    _this.barScaleOptions
      .selectAll("span")
      .data(_this.dimensionScales.get(_this.selectedDimension), d => d)
      .join(enter => enter.append("span").style("cursor", "pointer").html(d => d)
        .on("click", function (event, d) {
          _this.selectedScale = d
          _this.draw()
          _this.app.updateApp()
        })
        .each(function (d) {
          if (d === _this.selectedScale) {
            d3.select(this).attr("selected", "")
          }
        }, update => update
          ,
          exit => exit.remove())
      )
  }

}


BarChart.prototype.setScale = function () {
  const _this = this
  switch (this.selectedScale) {
    case this.constants.TIME:
      this.scaleTime(this.selectedDimension)
      break;
    case this.constants.ORDINAL:
      this.scaleOrdinal(this.selectedDimension)
      break;
    case this.constants.LINEAR:
      this.scaleLinear(this.selectedDimension)
      break;
    default:
      this.scaleOrdinal(this.selectedDimension)
      break;
  }
}


BarChart.prototype.scaleTime = function (keyDimension) {
  this.dataRange = {
    start: d3.min(this.app.rawData.map(d => {
      return new Date(new Date(d[keyDimension]).toDateString())
    })),
    end: d3.max(this.app.rawData.map(d => {
      return new Date(new Date(d[keyDimension]).toDateString())
    })),
  }

  this.rollupKey = (d) => {
    const date = new Date(d[keyDimension]).toDateString()
    return new Date(date)
  }
  this.brushFilterInterval = d3.timeHour.every(24).round
  this.brushTipFormat = d3.timeFormat("%b/%d")
  this.createScale = (allDataKeys) => d3
    .scaleTime()
    .domain([d3.min(allDataKeys), d3.max(allDataKeys)])
  this.getBarwidth = () => 2
  this.getBaroffset = () => this.barWidth / 4
}

BarChart.prototype.scaleLinear = function (keyDimension) {
  this.dataRange = {
    start: d3.min(this.app.rawData.map(d => d[keyDimension])),
    end: d3.max(this.app.rawData.map(d => d[keyDimension]))
  }

  this.rollupKey = (d) => d[keyDimension]
  this.brushFilterInterval = (d) => Math.floor(d)
  this.brushTipFormat = d => d
  this.createScale = (allDataKeys) => d3
    .scaleLinear()
    .domain([d3.min(allDataKeys), d3.max(allDataKeys)])
  this.getBarwidth = () => 2
  this.getBaroffset = () => this.barWidth / 4
}

BarChart.prototype.scaleOrdinal = function (keyDimension) {
  const _this = this
  this.dataRange = {
    start: d3.min(this.app.rawData.map(d => d[keyDimension])),
    end: d3.max(this.app.rawData.map(d => d[keyDimension]))
  }

  this.rollupKey = (d) => d[keyDimension]
  // this.brushFilterInterval = d3.timeHour.every(24)
  // this.brushTipFormat = d3.timeFormat("%b/%d")
  this.createScale = (allDataKeys) => d3
    .scaleBand()
    .domain(allDataKeys)
    .paddingInner(0.2)
    .paddingOuter(0.2)

  this.getBarwidth = () => {
    return _this.x.bandwidth()
  }

  this.getBaroffset = () => 0
}

// Scale coupled components

BarChart.prototype.setData = function () {
  this.rolledData = d3.rollup(
    this.app.rawData,
    (v) => {
      const random_num = 1 + Math.random() * 2;
      return {
        length: v.length,
        bundle: v,
      };
    },
    (d) => this.rollupKey(d)
  )
  this.data = this.rolledData
}

BarChart.prototype.addIntervalFilter = function (params) {
  const _this = this

  const latest = d3.max(this.rolledData.keys())//new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayInMiliseconds = 1000 * 60 * 60 * 24

  this.dateIntervals = {
    DAILY: {
      name: "1D",
      start: new Date(latest.getTime() - 1 * dayInMiliseconds),
      end: latest
    },
    WEEKLY: {
      name: "7D",
      start: new Date(latest.getTime() - 6 * dayInMiliseconds),
      end: latest
    },
    MONTHLY: {
      name: "30D",
      start: new Date(latest.getTime() - 29 * dayInMiliseconds),
      end: latest
    },
    ALL: {
      name: "ALL",
      start: d3.min(this.rolledData.keys()),
      end: latest
    }
  }

  const radioFo = this.radioSelection.selectAll("foreignObject")
    .data(Object.entries(this.dateIntervals), ([key, val]) => key)
    .join(
      enter => enter.append("foreignObject")
        .attr("class", "radio-selection-fo")
        .style("cursor", "pointer")
        .attr("width", 40)
        .attr("height", 25)
        .attr("x", 5)
        .attr("y", (_, i) => i * 20)
        .on("click", function (event, [key, val]) {
          _this.dataRange.start = val.start
          _this.dataRange.end = val.end

          d3.selectAll(".radio-selection-fo").attr("x", 5)
          d3.select(this).attr('x', 0)

          // _this.draw()
          _this.addBrushFilter()
          _this.updateBrushTip()
          _this.app.updateApp()
        })

        .append("xhtml:div")
        .attr("class", "date-interval")
        .style("color", _this.layout.textColor)
        .style("font-size", "14px")
      ,
      update => update,
      exit => exit.remove())

  radioFo.append("img").attr("class", "date-selection-icon")
    .attr("src", "./static/west_black_24dp.svg").attr("width", 14)
    .style("filter", this.layout.imageFilter)
  radioFo.append("text").text(([key, val]) => val.name)
}

BarChart.prototype.addBrushFilter = function () {
  let _this = this
  let brushSize = {
    x1: this.x(this.dataRange.start),
    x2: this.x(this.dataRange.end),
    y1: this.layout.height - this.layout.margin.bottom,
    y2: this.layout.height - this.layout.margin.bottom + 30
  }

  let brush = d3.brushX()
    .extent([[brushSize.x1, brushSize.y1], [brushSize.x2, brushSize.y2]])
    .on("end", brushing);

  this.brushFilter.select("g").remove()
  this.brushFilter.attr("class", "brush-filter").append("g")
    .call(brush)
    .call(brush.move, [brushSize.x1, brushSize.x2]).attr(
      "transform", `translate(${0},${0})`
    )

  function brushing(event) {
    const selection = event.selection;
    const interval = _this.brushFilterInterval

    if (!event.sourceEvent || !selection) return;

    const [x0, x1] = selection.map(d => interval(_this.x.invert(d)));

    d3.select(this)
      .transition()
      .call(brush.move, x1 > x0 ? [x0, x1].map(_this.x) : null);

    _this.dataRange.start = x0
    _this.dataRange.end = x1

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

  this.brushTipTexts = this.brushTip
    .selectAll("text")
    .data(this.x.domain())
    .join("text")
    .text(function (d) {
      return _this.brushTipFormat(d)
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
  let newDates = [this.dataRange.start, this.dataRange.end]

  this.brushTipTexts
    .data(newDates)
    .join("text")
    .text(function (d) {
      return _this.brushTipFormat(d)
    })
    .attr("x", function (d) {
      let textLength = this.getComputedTextLength()
      return _this.x(d) - textLength / 2
    })

}

BarChart.prototype.addBars = function () {
  const _this = this

  this.counts = [...this.data.values()].map((d) => d.length);

  const allDataKeys = [...this.data.keys()]
  this.x = this.createScale(allDataKeys)
    .range([0, this.layout.width - this.layout.margin.right - this.layout.margin.left]);

  this.y = d3
    .scaleLinear()
    .domain([0, d3.max(this.counts)])
    .range([this.layout.height - this.layout.margin.top - this.layout.margin.bottom, 0]);


  this.barWidth = this.getBarwidth()
  this.barOffset = this.getBaroffset()

  const axisBottom = d3.axisBottom(this.x).ticks(6)//.tickFormat(d3.timeFormat("%b/%d"));
  const axisLeft = d3.axisLeft(this.y).ticks(4);

  this.xAxis
    .attr("id", "xAxis")
    .call(axisBottom)
    .style("color", this.layout.textColor);

  this.yAxis
    .attr("id", "yAxis")
    .call(axisLeft)
    .style("color", this.layout.textColor)
    .call((g) => g.select(".domain").remove());

  this.addMaskBars()

  this.bars
    .attr("id", "bars")
    .selectAll("rect")
    .data([...this.data], (d) => d[0])
    .join("rect")
    .attr("id", "bars")
    .attr("fill", this.layout.barFill)
    .attr("x", ([key, val]) => _this.x(key) - _this.barOffset)
    .attr("y", function ([key, val]) {
      return _this.layout.margin.top + _this.y(val.length)
    })
    .attr("width", _this.barWidth)
    .attr("height", function ([key, val]) {
      return _this.y(0) - _this.y(val.length);
    })

}

// Scale dependent component


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

BarChart.prototype.addMaskBars = function () {
  this.maskBarsClip = this.maskBars.append("clipPath").attr("id", "maskBars").append("rect")
    .attr("width", this.layout.width - this.layout.margin.left - this.layout.margin.right + this.barWidth)
    .attr("height", this.layout.height - this.layout.margin.top - this.layout.margin.bottom)
    .attr("x", -this.barWidth / 2)
    .attr("y", this.layout.margin.top)

  this.bars
    .attr("clip-path", "url(#maskBars)")
}

BarChart.prototype.addTransform = function () {
  this.app.svg2.attr("transform", `translate(${window.innerWidth * 0.55},${20})`);
  this.barchartDropdowns
    .style("top", `${this.layout.margin.top * 0.2}px`)
    .style("left", `${window.innerWidth * 0.55}px`)
  this.bars.attr("transform", `translate(${this.layout.margin.left},${0})`)
  this.xAxis.attr("transform", `translate(${this.layout.margin.left},${this.layout.height - this.layout.margin.bottom})`)
  this.yAxis.attr("transform", `translate(${this.layout.margin.left * 0.8},${this.layout.margin.top})`)
  this.brushFilter.attr("transform", `translate(${this.layout.margin.left},${0})`)
  this.brushTip.attr("transform", `translate(${this.layout.margin.left},${0})`)
  this.radioSelection.attr("transform", `translate(${this.layout.width - this.layout.margin.right},${this.layout.height / 3})`)

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

BarChart.prototype.addMaskBars = function () {
  this.maskBarsClip = this.maskBars.append("clipPath").attr("id", "maskBars").append("rect")
    .attr("width", this.layout.width - this.layout.margin.left - this.layout.margin.right + this.barWidth)
    .attr("height", this.layout.height - this.layout.margin.top - this.layout.margin.bottom)
    .attr("x", -this.barWidth / 2)
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



BarChart.prototype.updateDarkMode = function () {
  d3.selectAll("#bars").attr("fill", this.layout.barFill)
  d3.select("#xAxis").style("color", this.layout.textColor)
  d3.select("#yAxis").style("color", this.layout.textColor)
  d3.select("#barchart-bg").attr("fill", this.layout.bgColor)
  d3.select(".bar-chart-title-span").style("color", this.layout.textColor)
  d3.selectAll(".brush-tips").attr("fill", this.layout.textColor)
  d3.selectAll(".date-interval").style("color", this.layout.textColor)
  d3.selectAll(".date-selection-icon").style("filter", this.layout.imageFilter)
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
    imageFilter: function () { return _this.app.darkMode ? "invert(1)" : "invert(0)" },
  };
}
