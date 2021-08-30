let DocumentList = function (app) {
    this.app = app
    this.setUp()
    this.render(["1", "2", "3", "6", "5", "5"])
}

DocumentList.prototype.setUp = function () {
    let _this = this
    this.list = d3.select("#document-list")
    this.ul = this.list.append("ul").attr("class", "document-elements")
    this.layout()
}

DocumentList.prototype.layout = function (params) {
    this.layout = {}
    let interface = d3.select("#interface").node().getBoundingClientRect()

    this.list
        .style("top", `${interface.bottom + 20}px`)
        .style("left", "50px")
    this.ul
        .style("height", `${window.innerHeight - interface.bottom - 150}px`)

}

DocumentList.prototype.render = function (data) {
    this.ul.selectAll("li")
        .data(data, d => d)
        .join(
            enter => enter.append("li").html(d => d),
            update => update
        )
}

DocumentList.prototype.elementLayout = function (title) {
    return `
    <div>
        <h4>${title}</h4>
        </div>
    `
}