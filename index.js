let App = function (rawData) {
    this.rawData = rawData
    this.data = null
    this.keys = Object.keys(this.rawData[0]).filter((d) => d !== "type");

    this.groupBy = [this.keys[0],]; // Set default hiearchy attribute

    this.extras = [];

    this.darkMode = true;

    this.firstPaint = false

    this.documentExcluded = []
    this.documentExcludedIds = []

    this.addLoading()

    this.prepareData()
    this.setData()

    this.setDimensionCounts()
    this.addDocumentCounts()

    this.addSvg()

    this.interface = new Interface(this)
    this.pivotChart = new PivotChart(this)
    this.barChart = new BarChart(this)
    this.documentList = new DocumentList(this)

    this.interface.updateInterfaceColor(this.pivotChart.treeGraph.treeColors)
    this.handleDarkMode()
}

App.prototype.addLoading = function () {
    const t = 100
    setTimeout(
        function listenFirstPaint(params) {
            if (this.firstPaint === false) {
                setTimeout(listenFirstPaint, t)
            } else {
                d3.select(".loading-screen").style("display", "none")
            }
        }, t)
}

App.prototype.addSvg = function () {
    this.svg = d3
        .select("#chart")
        .append("svg")
        .attr("class", ".pivot-chart-svg")
        .style("position", "absolute")
        .style("z-index", "-1")
        .style("top", 0)
        .style("left", 0)
        .attr("width", "100%")
        .attr("height", "100%")
        .style("background-color", "white");

    this.svg2 = d3
        .select("#chart2")
        .append("svg")
        .attr("class", ".bar-chart-svg")
        .style("position", "absolute")
        .style("z-index", "-1")
        .style("top", 0)
        .style("left", 0)
        .attr("width", 500)
        .attr("height", 230)
        .style("background-color", "none");
}

App.prototype.removeGroupBy = function (value) {
    this.groupBy = this.groupBy.filter((d) => d !== value);
    this.addDocumentCounts()
    this.pivotChart.updateChart()
    this.interface.updateInterfaceColor(this.pivotChart.treeGraph.treeColors)
};

App.prototype.updateGroupBy = function (groupingDimensions) {
    this.groupBy = groupingDimensions
    this.addDocumentCounts()
    this.pivotChart.updateChart()
    this.interface.updateInterfaceColor(this.pivotChart.treeGraph.treeColors)
}

App.prototype.updateDocumentExcluded = function (type, dimension, val, show) {
    switch (type) {
        case "click":
            if (show === false) {
                this.documentExcluded.push({ dimension: dimension, val: val })
            } else if (show === true) {
                this.documentExcluded = this.documentExcluded.filter(d => !(d.val === val && d.dimension === dimension))
            }
            break;
        case "dblclick":
            const newExcluded = this.interface.dimensionsMap.get(dimension)
                .filter(d => d.content !== val)
                .map(d => ({ dimension: dimension, val: d.content }))

            this.documentExcluded = this.documentExcluded.filter(d => d.dimension !== dimension).concat(newExcluded)
            break;
        case "dblclick-cleared":
            this.documentExcluded = this.documentExcluded.filter(d => d.dimension !== dimension)
            break;
        default:
            break;
    }
    // this.documentExcludedIds = []
    // this.documentExcluded.forEach(({ dimension, val }) => {
    //     this.documentExcludedIds = this.documentExcludedIds.concat(this.data.filter(d => d[dimension] === val).map(d => d.id))
    // })

    this.pivotChart.updateChartExtra()
}

App.prototype.setExtras = function (k) {
    // if (this.extras.includes(k)) {
    //     this.extras = this.extras.filter((v) => v !== k);
    // } else {
    //     this.extras.push(k);
    // }
    // this.pivotChart.updateChartExtra()
};

App.prototype.setData = function () {
    this.data = this.rawData
}

App.prototype.getUniquesBy = function (data, key) {
    let result = []
    for (let d of data) {
        if (!result.map(p => p[key]).includes(d[key])) {
            result.push(d)
        }
    }
    return result
}

App.prototype.prepareData = function () {
    let _this = this

    this.rawData.forEach(function (node, i) {
        _this.keys.forEach((k) => {
            if (node[k] === null) {
                _this.rawData[i][k] = "null";
            } else if (node[k] === undefined) {
                _this.rawData[i][k] = "null";
            }

            const value = _this.rawData[i][k]
            _this.rawData[i][k] = typeof value === "number" ? value.toString() : value

            _this.rawData[i]["type"] = "main";
        });

        // const date = new Date(node.publish_date);
        // _this.rawData[i].date_published = date;
        // _this.rawData[i].date_string = date.toDateString();
    });

    // this.rawData = this.getUniquesBy(this.rawData, "url")
}

App.prototype.updateApp = function () {
    this.data = this.filterByDate(this.rawData, this.barChart.dataRange)

    this.setDimensionCounts()

    this.addDocumentCounts()
    this.interface.updateDimensions()
    this.interface.updateInterfaceColor(this.pivotChart.treeGraph.treeColors)

    this.pivotChart.restartChart()
}

App.prototype.updateDocumentList = function ({ group, groupNames }) {
    const _this = this
    let groupBy = [...this.groupBy]

    const nodeGroupIndex = groupBy.indexOf(group)
    newGroupBy = groupBy.slice(0, nodeGroupIndex + 1)
    newGroupNames = groupNames.slice(0, nodeGroupIndex + 1)

    let filteredData = [...this.data]

    let i = 0
    recurse(newGroupBy)
    function recurse(arr) {
        if (newGroupBy.length > 0) {
            let g = arr.shift()
            filteredData = filteredData.filter((d) => d[g] === newGroupNames[i])
            i++
            recurse(arr)
        }
    }

    const payload = {
        data: filteredData.map(d => ({ url: d.url, title: d.title })),
        displayState: "block"
    }

    this.documentList.render(payload)
}

App.prototype.filterByDate = function (data, range) {
    let start = range.start.getTime()
    let end = range.end.getTime()

    return data.filter(function (d) {
        let nodeDate = new Date(d.publish_date).getTime()
        return start <= nodeDate && nodeDate <= end
    })
}

App.prototype.addDocumentCounts = function () {
    let _this = this

    d3.select("#document-counts text").remove();
    d3.select("#document-counts")
        .append("text")
        .text(function () {
            const groups = ["documents"].concat(_this.groupBy)
            return groups.map(function (g) {
                return `${_this.dimensionCounts.get(g)} ${g}`
            })
                .join(", ");
        });
}

App.prototype.setDimensionCounts = function () {
    let _this = this
    let all = [["documents", this.data.length]]
    const groups = this.keys.map(function (g) {
        return [
            g,
            new Set(_this.data.map((d) => d[g])).size,
        ]
    })

    this.dimensionCounts = new Map(all.concat(groups));
}


App.prototype.handleDarkMode = function () {
    let _this = this
    const toggleDark = d3.select("#toggle-dark");
    const localStorage = window.localStorage;

    if (localStorage.pivotChartDarkMode) {
        const valString = localStorage.pivotChartDarkMode
        if (valString === "true") {
            this.darkMode = true
        } else {
            this.darkMode = false
        }
    }

    toggleDark.node().checked = this.darkMode;

    this.setDarkMode();

    toggleDark.on("click", function (e) {
        _this.darkMode = this.checked;
        window.localStorage.pivotChartDarkMode = _this.darkMode;
        _this.setDarkMode();
    });
}

App.prototype.setDarkMode = function () {
    this.pivotChart.updateDarkMode()
    this.barChart.updateDarkMode()
    this.documentList.updateDarkMode()
}


d3.json("static/test.json")
    .then(function (json) {
        var app = new App(json)
        // console.log(json)
    })
    .catch(function (error) {
    });