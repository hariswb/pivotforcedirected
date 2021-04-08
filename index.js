d3.json("static/adial-1.json")
  .then(function (data) {
    //Clean nulls
    data.forEach((node, i) => {
      Object.keys(node).forEach((k) => {
        if (node[k] === null) {
          data[i][k] = "null";
        }
        data[i]["type"] = "main";
      });
    });
    //Draw Chart
    DrawChart(data);
  })
  .catch(function (error) {
    console.log(error);
  });

function DrawChart(data) {
  this.groupBy = "site";
  this.extras = [];
  this.data = data;
  this.documentCounts = data.length;

  this.keys = ["entity", "author", "sentiment", "site", "site_type", "topic"]; //Object.keys(data[0]);
  this.setGroupBy = (value) => {
    this.groupBy = value;
    updateChart();
    updateSide();
  };

  this.setExtras = (k) => {
    if (this.extras.includes(k)) {
      this.extras = this.extras.filter((v) => v !== k);
    } else {
      this.extras.push(k);
    }
    updateSide();
  };

  this.foci = [];

  //Static Icons

  manageInputs(this.keys);

  const pathIcon = "./static/icons/";
  const iconUrl = {
    entity: pathIcon + "entity.png",
    author: pathIcon + "author.png",
    sentiment: pathIcon + "sentiment.png",
    site: pathIcon + "site.png",
    site_type: pathIcon + "site_type.png",
    topic: pathIcon + "topic.png",
    document: pathIcon + "document.png",
    suitcase: pathIcon + "suitcase.png",
    search: pathIcon + "search.png",
  };

  //PREPARE Inputs

  //Draw SVG

  this.width = window.innerWidth;
  this.height = window.innerHeight;
  //
  let scrollY = 0;
  let groupBy = this.groupBy;
  let transformScale = 1;
  let transformX = 0;
  let transformY = 0;
  const main = {
    nodeFill: "#eee",
    nodeRadius: 10,
    nodeStroke: "#aaa",
    nodeStrokeWidth: 2,
    legendStroke: "#ddd",
    legendFill: "whitesmoke",
    bgColor: "cornsilk",
    labelRadius: 16,
    labelCircleFill: "white",
    labelCircleStroke: "#aaa",
    imageNodeRatio: 1.3,
  };

  const side = {
    width: 400,
    translateX: 900,
    paddingTop: 100,
    paddingLeft: 50,
    nodeFill: "#eee",
    nodeRadius: 20,
    nodeStroke: "#aaa",
    nodeStrokeWidth: 3,
    bgColor: "azure",
    imageNodeRatio: 1.4,
  };
  const linkLine = {
    stroke: "#ddd",
    strokeWidth: 2,
    strokeHighlight: "#3978e6",
    opacity: 0.4,
    opacityHighlight: 1,
  };

  //
  const dimensionsGroup = getDimensions(this.groupBy);
  this.foci = getFoci(dimensionsGroup);

  //
  let nodesExtras = [];
  //

  const svg = d3
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

  // Document Count
  d3.select("#document-counts").append("text").text(this.documentCounts);
  //Layers

  const layerMainBg = svg.append("g").style("background-color", main.bgColor);
  const layerMain = svg.append("g");
  const layerSideBg = svg.append("g").attr("id", "side-bar");
  const layerSide = svg.append("g");

  //layerMain
  layerMain
    .append("g")
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", this.width)
    .attr("height", this.height)
    .attr("fill", main.bgColor)
    .on("click", (event, d) => {
      d3.select("#tooltip").style("visibility", "hidden");
      node.attr("stroke", side.nodeStroke);
    });

  layerMain.call(
    d3
      .zoom()
      .extent([
        [0, 0],
        [this.width, this.height],
      ])
      .scaleExtent([0, 8])
      .on("zoom", zoomed)
  );

  const hullG = layerMain.append("g").attr("class", "hulls");

  // Labels Main
  let mainLabelLines = layerMain.append("g").selectAll("line");
  let mainLabelCircle = layerMain.append("g").selectAll("circle");
  let mainLabelText = layerMain.append("g").selectAll("foreignObject");

  layerSide.call(
    d3
      .zoom()
      .extent([
        [0, 0],
        [250, this.height],
      ])
      .scaleExtent([0, 8])
      .on("zoom", scrolled)
  );

  layerSide.attr("clip-path", "url(#sideClipPath)");

  layerSide
    .append("rect")
    .attr("class", "rect-side")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", this.width * 0.3)
    .attr("height", this.height)
    .attr("fill", side.bgColor)
    .attr("opacity", 0)
    .attr("transform", `translate(${this.width * 0.7}, 0)`)
    .on("click", () => {
      link.attr("stroke", linkLine.stroke).attr("opacity", linkLine.opacity);
      node.attr("fill", (d) =>
        d.type === "main" ? main.nodeFill : side.nodeFill
      );
      nodeSide.attr("stroke", side.nodeStroke);
    });

  //

  let nodeSide = layerSide.append("g").selectAll("circle");
  let nodeImageSide = layerSide.append("g").selectAll("image");

  //labelSide
  let sideLabels = layerSide.append("g").selectAll("text");
  let sideTitles = layerSide
    .append("g")
    .attr("class", "side-titles")
    .selectAll("text");
  let sideTitleIcons = layerSide
    .append("g")
    .attr("class", "side-titles-icons")
    .selectAll("image");
  //
  //Simulation
  let nodes = initNodes(this.data, this.foci);

  let links = [];

  const charge = d3
    .forceManyBody()
    .strength(-main.nodeRadius * 1.5)
    .distanceMin(main.nodeRadius * 1.2);
  const collide = d3.forceCollide(main.nodeRadius * 1.1);
  const posX = d3.forceX((d) => d.x).strength(0.1);
  const posY = d3.forceY((d) => d.y).strength(0.1);

  const simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(links)
        .id((d) => d.id)
        .strength(0)
    )
    .force("charge", isolateMain(charge))
    .force("collide", isolateMain(collide))
    .force("positiion-x", isolateMain(posX))
    .force("positiion-y", isolateMain(posY));

  let link = layerMain.append("g").attr("id", "links").selectAll("line");

  let node = layerMain
    .append("g")
    .attr("id", "nodes")
    .attr("class", "node")
    .attr("stroke", main.nodeStroke)
    .attr("fill", main.nodeFill)
    .attr("stroke-width", 1.5)
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("id", "mainNodes")
    .attr("r", main.nodeRadius)
    .on("click", (event, d) => {
      if (d.type === "main") {
        handleNodeClick(event, d);
        node.attr("stroke", (node) =>
          node.id === d.id ? "#3978e6" : main.nodeStroke
        );
      }
    });

  let nodeImage = layerMain
    .append("g")
    .attr("id", "node-image")
    .selectAll("image");

  //Hull or cell wrapping the node groups
  const lineHull = d3.line().curve(d3.curveBasisClosed);

  let hulls = hullG.selectAll("path");

  //Tooltip
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("id", "tooltip")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden");

  //
  simulation.on("tick", (e) => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

    const nodeImageShift = (main.nodeRadius * main.imageNodeRatio) / 2;
    const sideImageShift = (side.nodeRadius * side.imageNodeRatio) / 2;

    nodeImage
      .attr("height", (d) =>
        d.type === "main"
          ? main.nodeRadius * main.imageNodeRatio * transformScale
          : side.nodeRadius * side.imageNodeRatio
      )
      .attr("x", (d) =>
        d.type === "main"
          ? d.x - nodeImageShift * transformScale
          : d.x - sideImageShift
      )
      .attr("y", (d) =>
        d.type === "main"
          ? d.y - nodeImageShift * transformScale
          : d.y - sideImageShift
      );

    sideLabels.attr("transform", (d) => `translate{0,${d.y}}`);

    mainLabelLines.attr("x2", (d) => d.label.x2).attr("y2", (d) => d.label.y2);

    hulls.attr("d", (d) => circlePathLabel(d));
  });
  //Scrolls

  simulation.alphaDecay(0).velocityDecay(0.7);

  updateChart();

  function zoomed({ transform }) {
    transformScale = transform.k;
    transformX = transform.x;
    transformY = transform.y;
    simulation.force(
      "charge",
      isolateMain(
        d3
          .forceManyBody()
          .strength(-main.nodeRadius + (1 - transform.k) * main.nodeRadius)
          .distanceMin(main.nodeRadius * transform.k)
      )
    );
    simulation.force(
      "collide",
      isolateMain(d3.forceCollide().radius((main.nodeRadius + 1) * transform.k))
    );
    simulation.force(
      "positiion-x",
      isolateMain(
        d3
          .forceX((d) => foci[d[groupBy]].x * transform.k + transform.x)
          .strength(0.1 / transform.k)
      )
    );
    simulation.force(
      "positiion-y",
      isolateMain(
        d3
          .forceY((d) => foci[d[groupBy]].y * transform.k + transform.y)
          .strength(0.1 / transform.k)
      )
    );

    node.attr("r", (d) =>
      d.type === "main" ? main.nodeRadius * transform.k : side.nodeRadius
    );

    nodeImage.attr("height", (d) => {
      if (d.type === "main") {
        return main.nodeRadius * main.imageNodeRatio * transform.k;
      } else {
        return side.nodeRadius * side.imageNodeRatio;
      }
    });

    mainLabelLines
      .attr("x1", (d) => d.label.x1 * transform.k + transform.x)
      .attr("y1", (d) => d.label.y1 * transform.k + transform.y)
      .attr("x2", (d) => d.label.x2 * transform.k + transform.x)
      .attr("y2", (d) => d.label.y2 * transform.k + transform.y);

    mainLabelCircle
      .attr("cx", (d) => d.label.x1 * transform.k + transform.x)
      .attr("cy", (d) => d.label.y1 * transform.k + transform.y)
      .attr("r", (d) => d.label.r * transform.k);

    mainLabelText
      .attr("width", (d) => baseTriangle(d.label.r) * 2 * transform.k)
      .attr("height", (d) => baseTriangle(d.label.r) * 2 * transform.k)
      .attr(
        "x",
        (d) =>
          (d.label.x1 - baseTriangle(d.label.r)) * transform.k + transform.x
      )
      .attr(
        "y",
        (d) =>
          (d.label.y1 - baseTriangle(d.label.r)) * transform.k + transform.y
      )
      .style(
        "font-size",
        (d) => `${((16 * d.label.r) / 64) * transformScale}px`
      );

    simulation.nodes(nodes);
  }

  function scrolled(event) {
    const sourceEvent = event.sourceEvent;
    const transform = event.transform;
    if (sourceEvent.type == "wheel") {
      nodes = nodes.map((node) => {
        if (node.type === "extra") {
          node.y = node.y + sourceEvent.deltaY;
        }
        return node;
      });

      scrollY += sourceEvent.deltaY;
      layerSide.attr("transform", `translate(0,${scrollY})`);
    }
  }

  //Update Side bar
  function updateSide() {
    nodesExtras = [];

    let checkpoint = 0;
    this.extras.forEach((extra, i) => {
      obj = {};
      getDimensions(extra).forEach((dimension, j) => {
        obj = {
          id: dimension,
          name: dimension,
          extra: extra,
          type: "extra",
          posX: j % 3,
          posY: Math.floor(j / 3) + checkpoint,
        };
        nodesExtras.push(obj);
      });
      checkpoint = obj.posY + 2;
    });
    //console.log(nodesExtras, nodesExtras.length);

    const scaleX = d3.scaleLinear().domain([0, 2]).range([0, 200]);
    const scaleY = d3
      .scaleLinear()
      .domain([0, nodesExtras.map((node) => node.posY)[nodesExtras.length - 1]])
      .range([
        side.nodeRadius * 2,
        (nodesExtras.length + 2) * side.nodeRadius * 2,
      ]);

    nodesExtras = nodesExtras.map((node) => {
      node.x = scaleX(node.posX) + this.width - side.width + side.paddingLeft;
      node.y = scaleY(node.posY) + side.paddingTop;
      return node;
    });

    //
    // Create links to main chart
    //

    const foci = getFoci(getDimensions(this.groupBy));

    nodes = simulation.nodes();

    links = [];
    nodesExtras
      .map((nodeSource) => {
        return nodes
          .filter(
            (nodeTarget) => nodeTarget[nodeSource.extra] === nodeSource.id
          )
          .map((nodeTarget) => {
            return {
              source: nodeTarget[nodeSource.extra],
              target: nodeTarget.id,
            };
          });
      })
      .forEach((arr) => {
        links = links.concat(arr);
      });

    nodes = updateNodes(nodes, this.foci)
      .filter((node) => node.type === "main")
      .concat(nodesExtras);

    node = node
      .data(nodes, (d) => d.id)
      .join("circle")
      .attr("fill", main.nodeFill);

    scrollY = 0;

    layerSide.attr("transform", `translate(${0},${scrollY})`);

    nodeSide = nodeSide.data(nodesExtras, (d) => d.id).join("circle");

    nodeSide
      .attr("r", side.nodeRadius)
      .attr("fill", side.nodeFill)
      .attr("stroke", side.nodeStroke)
      .attr("stroke-width", side.nodeStrokeWidth)
      .attr("class", "node")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y + scrollY)
      .on("click", (event, d) => {
        link
          .attr("stroke", (l) =>
            l.source.id === d.id ? linkLine.strokeHighlight : linkLine.stroke
          )
          .attr("opacity", (l) =>
            l.source.id === d.id ? linkLine.opacityHighlight : linkLine.opacity
          );

        const targetIds = links
          .filter((l) => l.source.id === d.id)
          .map((l) => l.target.id);

        node.attr("fill", (node) =>
          targetIds.includes(node.id) ? linkLine.strokeHighlight : side.stroke
        );

        nodeSide.attr("stroke", (node) =>
          node.id === d.id ? linkLine.strokeHighlight : side.nodeStroke
        );
      });
    link = link.data(links, (l) => [l.source, l.target]).join("line");

    link
      .attr("id", "link")
      .attr("stroke", linkLine.stroke)
      .attr("stroke-width", linkLine.strokeWidth)
      .attr("opacity", linkLine.opacity);

    //

    simulation.nodes(nodes);

    simulation.force("link").links(links);

    nodeImageSide = nodeImageSide
      .data(nodesExtras)
      .join("image")
      .style("pointer-events", "none")
      .attr("href", function (d) {
        return iconUrl[d.extra];
      })
      .attr("height", (d) => side.nodeRadius * side.imageNodeRatio)
      .attr("x", (d) => d.x - (side.nodeRadius * side.imageNodeRatio) / 2)
      .attr(
        "y",
        (d) => d.y - (side.nodeRadius * side.imageNodeRatio) / 2 + scrollY
      );

    //      Side Titles

    const labelsYPos = Array.from(new Set(nodesExtras.map((d) => d.posY)));

    let sideTitlesPos = this.extras.length > 0 ? [-1] : [];

    for (let i = 0; i < labelsYPos[labelsYPos.length - 1]; i++) {
      if (labelsYPos.indexOf(i) == -1) {
        sideTitlesPos.push(i);
      }
    }

    sideTitlesPos = sideTitlesPos.map((d, i) => {
      return { posY: d + 1, extra: this.extras[i] };
    });

    d3.selectAll(".side-title-icon").remove();
    d3.selectAll(".side-title").remove();

    sideTitles
      .data(sideTitlesPos)
      .join("text")
      .attr("class", "side-title")
      .style("font-size", 16)
      .style("font-weight", "bold")
      .text((d) => d.extra)
      .attr("x", this.width * 0.7)
      .attr("y", (d) => scaleY(d.posY));

    sideTitleIcons
      .data(sideTitlesPos)
      .join("image")
      .attr("href", (d) => iconUrl[d.extra])
      .attr("class", "side-title-icon")
      .attr("height", side.nodeRadius * 2)
      .attr("x", this.width * 0.7 - side.nodeRadius * 2.3)
      .attr("y", (d) => scaleY(d.posY) - side.nodeRadius - 8);

    // Side Labels

    d3.selectAll(".sideLabel").remove();

    sideLabels
      .data(nodes.filter((node) => node.type === "extra"))
      .join("text")
      .attr("id", (d, i) => "text-" + d.extra + i)
      .attr("class", "sideLabel")
      .style("pointer-events", "none")
      .style("font-size", 12)
      .text((d) => d.id)
      .attr("transform", (d, i) => {
        return `translate(${d.x},${d.y - side.nodeRadius - 10})`;
      })
      .call(wrap, 40);
  }

  //Update Chart
  //

  function updateChart() {
    const dimensionsGroup = getDimensions(this.groupBy);
    groupBy = this.groupBy;
    this.foci = getFoci(dimensionsGroup);

    simulation.force(
      "positiion-x",
      isolateMain(
        d3
          .forceX((d) => this.foci[d[groupBy]].x * transformScale + transformX)
          .strength(0.1)
      )
    );
    simulation.force(
      "positiion-y",
      isolateMain(
        d3
          .forceY((d) => this.foci[d[groupBy]].y * transformScale + transformY)
          .strength(0.1)
      )
    );

    simulation.nodes(updateNodes(nodes, this.foci));

    nodeImage = nodeImage
      .data(nodes)
      .join("image")
      .style("pointer-events", "none")
      .attr("href", function (d) {
        if (d.type === "main") {
          return iconUrl.document;
        }
      });

    hulls = hulls
      .data(
        dimensionsGroup.map((g) => {
          return {
            cluster: g,
            nodes: node.filter((d) => d[this.groupBy] === g),
          };
        }),
        (d) => d.cluster
      )
      .join("path")
      .attr("d", (d) => {
        return circlePathLabel(d);
      })
      .attr("fill", main.legendFill)
      .attr("stroke", main.legendStroke)
      .attr("stroke-width", 2 * transformScale)
      .attr("opacity", 1);

    mainLabelLines = mainLabelLines
      .data(dimensionsGroup.map((d) => this.foci[d]))
      .join("line")
      .attr("x1", (d) => d.label.x1 * transformScale + transformX)
      .attr("y1", (d) => d.label.y1 * transformScale + transformY)
      .attr("x2", (d) => d.label.x2 * transformScale + transformX)
      .attr("y2", (d) => d.label.y2 * transformScale + transformY)
      .attr("stroke", "#aaa");

    mainLabelCircle = mainLabelCircle
      .data(dimensionsGroup.map((d) => foci[d]))
      .join("circle")
      .attr("cx", (d) => d.label.x1 * transformScale + transformX)
      .attr("cy", (d) => d.label.y1 * transformScale + transformY)
      .attr("r", (d) => d.label.r * transformScale)
      .attr("stroke", main.labelCircleStroke)
      .attr("fill", main.labelCircleFill);

    mainLabelText = mainLabelText
      .data(dimensionsGroup.map((d) => foci[d]))
      .join("foreignObject")
      .attr("id", (d, i) => "mainlabel-" + d.extra + i)
      .style("pointer-events", "none")
      .attr("width", (d) => baseTriangle(d.label.r) * 2 * transformScale)
      .attr("height", (d) => baseTriangle(d.label.r) * 2 * transformScale)
      .attr(
        "x",
        (d) =>
          (d.label.x1 - baseTriangle(d.label.r)) * transformScale + transformX
      )
      .attr(
        "y",
        (d) =>
          (d.label.y1 - baseTriangle(d.label.r)) * transformScale + transformY
      )
      .style(
        "font-size",
        (d) => `${((16 * d.label.r) / 64) * transformScale}px`
      );

    d3.selectAll(".mainlabeldiv").remove();
    const mainLabelSpan = mainLabelText
      .append("xhtml:div")
      .attr("class", "mainlabeldiv")
      .append("span")
      .html((d) => (d.name.length > 0 ? d.name : "undefined"));
  }

  function circlePathLabel(data) {
    let nodesPos = [];

    data.nodes.each((node) => {
      nodesPos = nodesPos.concat({ x: node.x, y: node.y });
    });

    const cx =
      nodesPos.map((node) => node.x).reduce((sum, x) => sum + x) /
      nodesPos.length;

    const cy =
      nodesPos.map((node) => node.y).reduce((sum, y) => sum + y) /
      nodesPos.length;

    //SideEffect
    //
    this.foci[data.cluster].label.x2 = cx;
    this.foci[data.cluster].label.y2 = cy;
    //
    //

    const maxR = d3.max(
      nodesPos.map((node) => distance(node.x - cx, node.y - cy))
    );

    const r = maxR + main.nodeRadius * 1.5;

    const p = d3.path();

    p.arc(cx, cy, r, 0, Math.PI * 2);

    return p;
  }

  function distance(xLength, yLength) {
    return Math.sqrt(xLength * xLength + yLength * yLength);
  }

  function baseTriangle(radius) {
    return Math.cos(Math.PI / 4) * radius;
  }

  function getDimensions(groupName) {
    return Array.from(new Set(data.map((node) => node[groupName])));
  }

  function initNodes(nodes, foci) {
    return nodes.map((node, index) => {
      obj = node;
      if (node.type === "main") {
        obj.id = index;
        obj.x = foci[node[this.groupBy]].x + Math.random();
        obj.y = foci[node[this.groupBy]].y + Math.random();
        obj.radius = 5;
      }
      return obj;
    });
  }

  function updateNodes(nodes, foci) {
    let old = simulation.nodes();
    return old.map((node, index) => {
      obj = node;
      if (node.type === "main") {
        obj.id = index;
      }
      return obj;
    });
  }

  function getFoci(dimensions) {
    const foci = {};
    const foci_num = dimensions.length;
    const chart_radius = (this.height / 2) * 0.8;
    const center = [this.height / 2, this.height / 2];
    const centerRadius = (Math.min(this.width, this.height) / 2) * 0.8;

    const sorted = dimensions
      .map((k) => {
        const elementCounts = this.data.filter((node) => node[groupBy] === k)
          .length;
        return {
          key: k,
          counts: elementCounts,
        };
      })
      .sort((a, b) => a.counts - b.counts);

    sorted.forEach(function (dimension, i) {
      const key = dimension.key;
      let angle = (2 * Math.PI * i) / foci_num;
      foci[key] = {
        name: key,
        counts: dimension.counts,
        x: center[0] + centerRadius * Math.cos(angle),
        y: center[1] + centerRadius * Math.sin(angle),
        label: {
          x: center[0] + (centerRadius - chart_radius / 3) * Math.cos(angle),
          y: center[1] + (centerRadius - chart_radius / 3) * Math.sin(angle),
          x1:
            center[0] +
            ((centerRadius * 0.25 * angle) / Math.PI) * Math.cos(angle),
          y1:
            center[1] +
            ((centerRadius * 0.25 * angle) / Math.PI) * Math.sin(angle),
          x2: center[0] + (centerRadius - chart_radius * 0) * Math.cos(angle),
          y2: center[1] + (centerRadius - chart_radius * 0) * Math.sin(angle),
          r: 1,
        },
      };
      foci;
    });

    sorted.reverse().forEach((dimension, i) => {
      if (i < sorted.length - 1) {
        const pX = foci[sorted[i].key].label.x1;
        const pY = foci[sorted[i].key].label.y1;
        const qX = foci[sorted[i + 1].key].label.x1;
        const qY = foci[sorted[i + 1].key].label.y1;

        const c = Math.sqrt(Math.pow(pX - qX, 2) + Math.pow(pY - qY, 2));

        foci[dimension.key].label.r = c / 2;
      } else {
        foci[dimension.key].label.r = foci[sorted[i - 1].key].label.r / 1.1;
      }
    });
    return foci;
  }

  function wrap(text, width) {
    text.each(function () {
      var text = d3.select(this),
        words = text.text().split(/[\s.]/),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y);

      while ((word = words.pop())) {
        line.push(word);
        tspan.text(line.join(" "));

        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text
          .append("tspan")
          .attr("id", (d, i) => {
            const wordCleaned =
              word.match(/\w+/i) !== null ? word.match(/\w+/i)[0] : "";
            const tspanId = "tspan" + wordCleaned + i;
            return tspanId;
          })
          .attr("x", 0)
          .attr("y", lineNumber * lineHeight + "em")
          .text(word)
          .attr("x", (d, i) => {
            const wordCleaned =
              word.match(/\w+/i) !== null ? word.match(/\w+/i)[0] : "";
            const tspanId = "#tspan" + wordCleaned + i;
            const tspanWidth = d3
              .select(tspanId)
              .node()
              .getComputedTextLength();
            return -tspanWidth / 2;
          });

        --lineNumber;
      }
    });
  }

  //tooltip function
  //
  function handleNodeClick(event, d) {
    const dateString = new Date(d.published).toDateString();
    d3.select("#tooltip").style("visibility", "visible").html(`
      <ul>
        <li class="tooltip-title">${d.title}</li>
        <li class="tooltip-date">${dateString}</li>
        <li class="tooltip-author">By: ${d.author}</li>
        <li class="tooltip-url"><a href="${d.url}" target="_blank">Source</a></li>
      </ul>
      `);
    tooltipPosition(event);
  }

  function tooltipPosition(event) {
    let ttid = "#tooltip";
    let xOffset = 20;
    let yOffset = 10;
    let toolTipW = $(ttid).width();
    let toolTipeH = $(ttid).height();
    let windowY = $(window).scrollTop();
    let windowX = $(window).scrollLeft();
    let curX = event.pageX;
    let curY = event.pageY;
    let ttleft =
      curX < $(window).width() / 2
        ? curX - toolTipW - xOffset * 2
        : curX + xOffset;
    if (ttleft < windowX + xOffset) {
      ttleft = windowX + xOffset;
    } else {
      ttleft = curX - windowX - toolTipW;
    }

    let tttop =
      curY - windowY + yOffset * 2 + toolTipeH > $(window).height()
        ? curY - toolTipeH - yOffset * 2
        : curY + yOffset;
    if (tttop < windowY + yOffset) {
      tttop = curY + yOffset;
    }
    $(ttid)
      .css("top", tttop + 30 + "px")
      .css("left", ttleft + "px");
  }

  //Isolate Force To Certain Node
  function isolateMain(force) {
    let initialize = force.initialize;
    force.initialize = function () {
      initialize.call(
        force,
        nodes.filter((node) => node.type === "main")
      );
    };
    return force;
  }
  // Hull Cluster Cells
  //
  function hullPoints(data) {
    let pointArr = [];
    const padding = main.nodeRadius * transformScale;
    data.each((d) => {
      const pad = d.radius + padding;
      pointArr = pointArr.concat([
        [d.x - pad, d.y - pad],
        [d.x - pad, d.y + pad],
        [d.x + pad, d.y - pad],
        [d.x + pad, d.y + pad],
      ]);
    });
    return pointArr;
  }
}
