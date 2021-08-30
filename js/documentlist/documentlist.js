let DocumentList = function (app) {
    this.app = app
    this.displayState = "none"
    this.setUp()
}

DocumentList.prototype.setUp = function () {
    let _this = this
    this.list = d3.select("#document-list").style("display", this.displayState)
    this.ul = this.list.append("ul").attr("class", "document-elements")

    this.setLayout()
    this.setPosition()
}

DocumentList.prototype.setPosition = function (params) {
    let interface = d3.select("#interface").node().getBoundingClientRect()

    this.list
        .style("top", `${interface.bottom + 20}px`)
        .style("left", "50px")
    this.ul
        .style("height", `${window.innerHeight - interface.bottom - 150}px`)
}

DocumentList.prototype.render = function ({ groupBy, groupNames, data, displayState }) {

    const _this = this
    const searchInput = d3.select("#document-search-input")

    if (displayState === "block") {
        const bindGroup = groupBy.map((d, i) => [d, groupNames[i]])
        const textBindGroup = bindGroup.map(([g, gName]) => `${g}: ${gName}`)
        console.log(bindGroup, textBindGroup)

        d3.select("#doc-list-p").remove()
        d3.select("#doc-list-details")
            .style("background-color", _this.layout.liBgColor())
            .append("p")
            .attr("id", "doc-list-p")
            .text(textBindGroup)
    }

    this.list.style("display", displayState)

    this.ul.selectAll("li")
        .data(data, d => d)
        .join(
            (enter) => enter.append("li")
                .attr("id", (d, i) => `document-li-${i}`)
                .attr('class', "document-li")
                .style("background-color", function () {
                    return _this.layout.liBgColor()
                })
                .html(d => elementHtml(d))
            ,
            update => update
        )

    searchInput.on("keyup", function (e) {
        const rgx = `${searchInput.node().value}`
        const pattern = new RegExp(rgx, "i")
        const list = d3.selectAll(".document-li")
        list.nodes().forEach(element => {
            if (pattern.test(element.innerText)) {
                d3.select(`#${element.id}`).style("display", "block")
            } else {
                d3.select(`#${element.id}`).style("display", "none")
            }
        });
    })

    function elementHtml(title) {
        return `
                <h4>${title}</h4>
            `
    }
}

DocumentList.prototype.setLayout = function () {
    let _this = this
    this.layout = {
        liBgColor: function () { return _this.app.darkMode ? "#eee" : "#eee" }
    }
}


DocumentList.prototype.elementLayout = function (title) {

}
