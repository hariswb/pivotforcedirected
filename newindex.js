let App = function (data) {
    this.data = data
    this.keys = Object.keys(data[0]).filter((d) => d !== "type");

    this.groupBy = ["site_type", "country"]; // Set default hiearchy attribute
    this.extras = [];

    this.darkMode = null;

    this.setData()

    this.addSvg()

    this.interface = new Interface(this)
    this.pivotChart = new PivotChart(this)
    this.barChart = new BarChart(this)

    this.interface.updateInterfaceColor(this.pivotChart.treeGraph.treeColors)
    this.handleDarkMode()
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
        .style("width", "100%")
        .style("height", "100%")
        .style("background-color", "white");
}

App.prototype.addGroupBy = function (value) {
    this.groupBy.push(value)
    this.pivotChart.updateChart()
    this.interface.updateInterfaceColor(this.pivotChart.treeGraph.treeColors)
}

App.prototype.removeGroupBy = function (value) {
    this.groupBy = this.groupBy.filter((d) => d !== value);
    this.pivotChart.updateChart()

    this.interface.updateInterfaceColor(this.pivotChart.treeGraph.treeColors)
};

App.prototype.setExtras = function (k) {
    if (this.extras.includes(k)) {
        this.extras = this.extras.filter((v) => v !== k);
    } else {
        this.extras.push(k);
    }
    this.pivotChart.updateChartSide()
};

App.prototype.setData = function () {
    let data = this.data
    const keys = this.keys
    data.forEach((node, i) => {
        keys.forEach((k) => {
            if (node[k] === null) {
                data[i][k] = "null";
            } else if (node[k] === undefined) {
                data[i][k] = "null";
            }
            data[i]["type"] = "main";
        });
    });
}

App.prototype.updateData = function () {
    this.data = this.data.slice(0, Math.floor(this.data.length / 2))
}

App.prototype.handleDarkMode = function () {
    let _this = this
    const toggleDark = d3.select("#toggle-dark");
    const localStorage = window.localStorage;

    darkMode =
        localStorage.pivotChartDarkMode === undefined
            ? toggleDark.node().checked
            : localStorage.pivotChartDarkMode;

    this.darkMode = this.darkMode === "true" ? true : false;

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
}


d3.json("static/abt-april.json")
    .then(function (json) {
        var app = new App(json)

    })
    .catch(function (error) {
        console.log(error);
    });