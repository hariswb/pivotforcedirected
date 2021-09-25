let TreeGraph = function (pivotChart, mainGraph) {
    this.pivotChart = pivotChart
    this.app = pivotChart.app
    this.data = pivotChart.app.data
    this.mainGraph = mainGraph

    this.layout = pivotChart.layout
    this.groupBy = pivotChart.app.groupBy
    this.clusterMap = pivotChart.clusterMap

    this.treePositions = {
        show: false,
        rootX: 0,
        rootY: 0,
        radius: 0,
    }

    this.treeColors = d3.scaleOrdinal().range(d3.schemeCategory10);
    this.treeLinks = [];
    this.treeNodes = [];
}

TreeGraph.prototype.addTree = function () {
    this.treeLink = this.pivotChart.layerMain.append("g")
        .attr("id", "tree-line")
        .selectAll("line");

    this.treeNode = this.pivotChart.layerMain.append("g")
        .attr("id", "tree-node")
        .selectAll("circle");

    this.treeLabel = this.pivotChart.layerMain.append("g")
        .attr("id", "tree-label-text")
        .selectAll("foreignObject");
}

TreeGraph.prototype.addSimulation = function () {
    let treeNodes = this.treeNodes
    this.simulation = d3.forceSimulation(treeNodes);
}

TreeGraph.prototype.startSimulation = function () {
    let _this = this

    this.simulation.on("tick", treeTick);

    function treeTick(e) {
        const groupBy = _this.app.groupBy
        const ShowOrder = new Map(
            groupBy.map((d, i) => ([d, 0.125 - (i) * 0.025]))
        )

        const leaves = []
        const alpha = _this.simulation.alpha()
        if (alpha < 0.5 && _this.treePositions.show === false) {
            _this.treeNode
                .attr("x", (d) => {
                    if (d.group === "fakeRoot") {
                        _this.treePositions.rootX = d.x
                        _this.treePositions.rootY = d.y
                    } else {
                        leaves.push([d.x, d.y])
                    }
                })
            _this.treePositions.show = true
            const largestRadius = d3.max(leaves
                .map(([x, y]) => Math.sqrt((x - _this.treePositions.rootX) ** 2 + (y - _this.treePositions.rootY) ** 2))
            )
            _this.treePositions.radius = largestRadius
        }

        _this.mainGraph.simulation
            .force(
                "positiion-x",
                _this.mainGraph.isolateForce(
                    _this.mainGraph.posX(function (d) {
                        return getFociTree(_this.pivotChart.app.groupBy, d).x
                    }).strength(0.1),
                    "main"
                )
            )
            .force(
                "positiion-y",
                _this.mainGraph.isolateForce(
                    _this.mainGraph.posY(function (d) {
                        return getFociTree(_this.pivotChart.app.groupBy, d).y
                    }).strength(0.1),
                    "main"
                )
            );

        _this.treeLink
            .attr("x1", (d) => (d.source.type === "leaf" ? d.source.cx : d.source.x))
            .attr("y1", (d) => (d.source.type === "leaf" ? d.source.cy : d.source.y))
            .attr("x2", (d) => (d.target.type === "leaf" ? d.target.cx : d.target.x))
            .attr("y2", (d) => (d.target.type === "leaf" ? d.target.cy : d.target.y))
            .style("display", l => displayOrder(l.target.group, l.target.type))

        _this.treeNode
            .attr("cx", (d) => (d.type === "leaf" ? d.cx : d.x))
            .attr("cy", (d) => (d.type === "leaf" ? d.cy : d.y))
            .style("display", d => displayOrder(d.group, d.type))

        _this.treeLabel
            .attr("x", (d) => d.x - _this.baseTriangle(d.r))
            .attr("y", (d) => d.y - _this.baseTriangle(d.r))
            .style("display", d => displayOrder(d.group, d.type))

        function displayOrder(nodeGroup, nodeType) {
            let display = "none"
            if (nodeType === "label" && nodeGroup === "fakeRoot" && alpha < 0.5) {
                display = "block"
            } else if (nodeType === "label" && alpha < ShowOrder.get(nodeGroup)) {
                display = "block"
            } else if (nodeType === "leaf" && alpha < ShowOrder.get(nodeGroup) - 0.025) {
                display = "block"
            } else if (nodeType === "leaf" && alpha < [...ShowOrder.values()][ShowOrder.size - 1] - 0.025) {
                display = "block"
            }
            return display
        }
        console.log()

        _this.mainGraph.node.style("display", d => displayOrder("none", "leaf"))
        _this.mainGraph.nodeImage.style("display", d => displayOrder("none", "leaf"))
        _this.mainGraph.mainHulls.style("display", d => displayOrder("none", "leaf"))

        function getFociTree(groupBy, node) {
            return _this.pivotChart.clusterMap.get(groupBy.map((k) => node[k]).join("-") + "-leaf");
        }
    }
}

TreeGraph.prototype.getTreeData = function () {
    let hierarchy = this.pivotChart.app.groupBy;
    let data = this.pivotChart.app.data
    let layout = this.layout

    let combinations = hierarchy
        .map((g) => {
            return Array.from(new Set(data.map((node) => node[g])));
        })
        .reduce((a, b) =>
            a.reduce((r, v) => r.concat(b.map((w) => [].concat(v, w))), [])
        );

    combinations =
        hierarchy.length === 1 ? combinations.map((d) => [d]) : combinations;

    let labelCluster = combinations.map((combination) => {
        return {
            groupNames: hierarchy,
            combination: combination,
            nodes: data.filter((item) => {
                for (let i = 0; i < hierarchy.length; i++) {
                    if (item[hierarchy[i]] !== combination[i]) {
                        return false;
                    }
                }
                return true;
            }),
        };
    }).filter((d) => d.nodes.length > 0);;

    let treeLinks = [...new Set(labelCluster.map((c) => c.combination[0]))]
        .map((d) => {
            return {
                source: "fakeRoot",
                target: d,
                distance: layout.extraNodeRadius * 5,
            };
        });

    const treeLabelScale = d3
        .scaleLinear()
        .domain([0, 1])
        .range([layout.labelRadius, 10 * layout.labelRadius]);

    let treeNodes = Array.from(
        labelCluster
            .map((c) => {
                let arr = [];
                for (let i = 0; i < c.combination.length; i++) {
                    let combo = c.combination.slice(0, i + 1);
                    let groupNames = c.groupNames.slice(0, combo.length);

                    const subNodes = data.filter((item) => {
                        for (let i = 0; i < groupNames.length; i++) {
                            if (item[groupNames[i]] !== combo[i]) {
                                return false;
                            }
                        }
                        return true;
                    });

                    arr.push({
                        id: combo.join("-"),
                        name: combo[i],
                        groupNames: combo,
                        level: i + 1,
                        group: hierarchy[i],
                        type: "label",
                        r: treeLabelScale(subNodes.length / data.length),
                    });
                    if (i === c.combination.length - 1)
                        arr.push({
                            id: combo.join("-") + "-leaf",
                            name: combo.join("-") + "-leaf",
                            groupNames: combo.concat("leaf"),
                            level: i + 1,
                            group: hierarchy[i],
                            type: "leaf",
                            clusterSize: subNodes.length,
                            r:
                                Math.ceil(Math.sqrt(subNodes.length)) *
                                layout.nodeRadius *
                                1.5,
                            nodes: subNodes,
                        });
                }
                for (let j = 0; j < arr.length - 1; j++) {
                    treeLinks.push({
                        source: arr[j].id,
                        target: arr[j + 1].id,
                        type: "tree",
                        distance: arr[j].r + arr[j + 1].r,
                    });
                }
                return arr;
            })
            .flat()
    ).concat({
        id: "fakeRoot",
        name: [...new Set(this.app.data.map(d => d.search_query))][0],
        groupNames: ["fakeRoot"],
        level: 0,
        group: "fakeRoot",
        type: "label",
        r: layout.treeRootRadius,
    });

    let uniqueTreeNodes = [];
    treeNodes.forEach((k) => {
        if (!uniqueTreeNodes.map((d) => d.id).includes(k.id))
            uniqueTreeNodes.push(k);
    });

    return [uniqueTreeNodes, treeLinks];
}

TreeGraph.prototype.getTreeLinks = function () {
    const map = new Map(this.treeNodes.map((d) => [d.id, d]));
    return this.treeLinks.map((l) => {
        return {
            source: map.get(l.source),
            target: map.get(l.target),
            type: l.type,
            distance: l.distance,
        };
    });
}

TreeGraph.prototype.renderTreeNode = function () {
    let _this = this
    this.treeNode = this.treeNode
        .data(this.treeNodes, (d) => d.id)
        .join(enter => enter.append("circle"),
            update => update,
            exit => exit.remove())
        .attr("r", (d) => d.r)
        .attr("class", (d) => d.name)
        .attr("fill", function (d) {
            return _this.pivotChart.brighten(_this.treeColors(d.group))
        })
        .style("cursor", "pointer")
        .attr("stroke", this.layout.labelCircleStroke)
        .attr("stroke-width", this.layout.labelStrokeWidth)
        .attr("opacity", (d) => (d.type === "leaf" ? 0 : 1))
        .on("click", function (event, d) {
            _this.handleClick(d)
            _this.app.updateDocumentList({ group: d.group, groupNames: d.groupNames })
        })


    this.treeNode.append("title").text(function (d) {
        return d.name;
    });
}

TreeGraph.prototype.handleClick = function (node) {
    const _this = this
    this.treeNode.attr("stroke-width", function (d) {
        return d.id === node.id ? _this.layout.labelStrokeWidthHighlighted : _this.layout.labelStrokeWidth
    })
}

TreeGraph.prototype.clearColoring = function () {
    this.treeNode.attr("stroke-width", this.layout.labelStrokeWidth)
}

TreeGraph.prototype.renderTreeLink = function () {
    let layout = this.layout
    let groupBy = this.groupBy
    let treeLinks = this.treeLinks
    let _this = this

    this.treeLink = this.treeLink
        .data(treeLinks, (l) => [l.source, l.target])
        .join("line")
        .attr("id", "link")
        .attr("stroke", function (l) {
            return _this.treeColors(l.target.group)
        })
        .attr("stroke-width", (l) => (2 * (groupBy.length + 1)) / l.target.level)
        .attr("opacity", layout.lineopacity);
}

TreeGraph.prototype.baseTriangle = function (radius) {
    return Math.cos(Math.PI / 4) * radius;
}

TreeGraph.prototype.renderTreeLabel = function () {
    let treeNodes = this.treeNodes
    let _this = this

    this.treeLabel = this.treeLabel
        .data(treeNodes.filter((d) => d.type === "label"))
        .join("foreignObject")
        .attr("id", (d, i) => "treelabel-" + d.id)
        .style("pointer-events", "none")
        .attr("width", function (d) {
            return _this.baseTriangle(d.r) * 2
        })
        .attr("height", function (d) {
            return _this.baseTriangle(d.r) * 2
        })
        .style("font-size", (d) => {
            const multiplier = Math.floor(d.name.length / 18) + 1;
            return `${d.r / (2.5 * multiplier)}px`;
        });
}

TreeGraph.prototype.updateTree = function () {
    let _this = this
    let treeLinks = this.treeLinks
    let height = this.pivotChart.height

    this.treePositions.show = false

    this.simulation
        .force(
            "treeLink",
            d3.forceLink(treeLinks)
                .id((d) => d.id)
                .distance((d) => d.distance)
                .strength(2.3)
        )
        .force(
            "tree-charge",
            d3.forceManyBody().strength((d) => {
                return -80 * d.r
            })
        )
        .force("x", d3.forceX(0))
        .force("y", d3.forceY(0));

    let [newtreeNodes, newtreeLinks] = this.getTreeData();

    this.treeNodes = newtreeNodes;
    this.treeLinks = newtreeLinks;
    this.treeLinks = this.getTreeLinks();
    this.renderTreeNode()
    this.renderTreeLink()
    this.renderTreeLabel()

    d3.selectAll(".mainlabeldiv").remove();

    this.treeLabelSpan = this.treeLabel
        .append("xhtml:div")
        .attr("class", "mainlabeldiv")
        .append("span")
        .style("color", "white")
        .html((d) => {
            if (d.name !== undefined) {
                return d.name.length > 0 ? d.name : "undefined";
            }
        });

    this.pivotChart.addClusterMap(this.treeNodes)

    // documentCounts();

    // const inputsGroups = d3.selectAll(".as-group");
    // inputsGroups.each(function () {
    //     const thisGroup = this.getAttribute("value");
    //     d3.select(this).style("background-color", treeColors(thisGroup));
    // });

    this.simulation.force("treeLink").links(this.treeLinks);

    this.simulation.nodes(this.treeNodes);

    this.simulation.alpha(1).restart();
    // this.simulation.alphaDecay(0.01).velocityDecay(0.95);

    // this.simulation.alphaDecay(0)//.velocityDecay(0.6);
}

