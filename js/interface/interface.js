let Interface = function (app) {
    this.app = app

    this.dimensionsMap = new Map()

    this.updateDimensions()
}

Interface.prototype.updateDimensions = function () {
    let _this = this
    let groupBy = this.app.groupBy
    let keys = this.app.keys
    let extras = this.app.extras
    let elementsExtras = document.getElementById("extras")

    d3.selectAll(".extra").remove()

    keys.forEach(function (key) {
        if (!_this.dimensionsMap.has(key)) {
            _this.dimensionsMap.set(key, [...new Set(_this.app.data.map(d => d[key]))].map(d => ({ content: d, show: true })))
        }

        let dimension = _this.createDimensionElement(key)

        dimension.addEventListener("dragstart", function (event) {
            _this.onDragStart(event)
        })

        elementsExtras.appendChild(dimension)
    });

    let elementGroupBy = document.getElementById("group-by")

    elementGroupBy.addEventListener("dragover", function (event) {
        _this.onDragOver(event)
    })

    elementGroupBy.addEventListener("drop", function (event) {
        _this.onDrop(event)
    })

    let elementGroupDump = [...document.getElementsByClassName("group-dump")][0]
    elementGroupDump.addEventListener("dragover", function (event) {
        _this.onDragOverDump(event)
    })

    elementGroupDump.addEventListener("drop", function (event) {
        _this.onDropDump(event)
    })

    groupBy.forEach(function (key) {
        const defaultGroup = _this.createDimensionElement(key)

        defaultGroup.addEventListener("dragstart", function (event) {
            _this.onDragStart(event)
        })

        defaultGroup.classList.add("as-group");

        _this.invertColorFilter(defaultGroup)

        const dropZone = document.getElementById("group-by");
        dropZone.appendChild(defaultGroup);
    })
}

Interface.prototype.addDimensionDropdown = function (divElement, keyName) {
    const _this = this
    const dropdownList = this.dimensionsMap.get(keyName)
    const selection = d3.select(divElement)
    const dropdownContentId = `dropdown-dimension-content-${keyName}`

    const imageUrl = {
        arrowDown: "./static/arrow_drop_down_black_24dp.svg",
        arrowRight: "./static/arrow_right_black_24dp.svg"
    }

    const button = selection.append("div")
        .attr("class", "dropdown-button")

    const buttonImg = button.append("img").attr("class", "dropdown-button-arrow").attr("src", imageUrl.arrowRight)

    const buttonText = button.append("span").html(`${keyName}: ${this.app.dimensionCounts.get(keyName)}`)

    selection
        .append("div")
        .attr("id", dropdownContentId)
        .attr("class", ` dropdown-dimension-content dropdown-dimension-content-none`)
        .selectAll("span")
        .data(dropdownList, d => d.val)
        .join(enter => enter
            .append("span")
            .attr("class", `${dropdownContentId}`)
            .style("color", d => d.show === true ? "#111" : "#bbb")
            .html(d => d.content)
            .on("click", function (event, d) {
                const past = d.past ? d.past : 0
                const now = new Date().getTime()
                const waited = now - past

                if (waited < 300) {
                    clearTimeout(d.triggerClick)
                } else {
                    d.triggerClick = setTimeout(() => {
                        d.show = !d.show
                        // d3.select(this).style("color", d.show === true ? "#111" : "#bbb")
                        d3.selectAll(`.${dropdownContentId}`).style("color", d => d.show === true ? "#111" : "#bbb")
                        _this.app.updateDocumentExcluded(event.type, keyName, d.content, d.show)
                    }, 300)
                }

                d.past = now
            })
            .on("dblclick", function (event, d) {
                if (d.triggered !== true) {
                    _this.dimensionsMap.get(keyName).forEach(k => {
                        k.show = k.content === d.content ? true : false
                    })
                    _this.app.updateDocumentExcluded(event.type, keyName, d.content, d.show)
                    d3.selectAll(`.${dropdownContentId}`).attr("", function () {
                        d.triggered = false
                    })
                    d.triggered = true
                } else {
                    _this.dimensionsMap.get(keyName).forEach(k => {
                        k.show = true
                    })
                    _this.app.updateDocumentExcluded(event.type + "-cleared", keyName, d.content, d.show)
                    d.triggered = false
                }
                d3.selectAll(`.${dropdownContentId}`).style("color", d => d.show === true ? "#111" : "#bbb")
            })
        )

    button.on("click", function (event, d) {
        event.preventDefault()
        const dropdownButton = d3.select(this)
        const buttonImg = dropdownButton.select(".dropdown-button-arrow")
        const dropdownContents = selection.select(`#dropdown-dimension-content-${keyName}`)
        if (this.selected === true) {
            dropdownContents.classed("dropdown-dimension-content-none", true)
            dropdownButton.style("border-radius", "2px")
            buttonImg.attr("src", imageUrl.arrowRight)
            this.selected = false
        } else {
            dropdownContents.style("width", `${this.getBoundingClientRect().width - 10}px`)
                .classed("dropdown-dimension-content-none", false)
            dropdownButton.style("border-radius", "2px 2px 0px 0px")
            buttonImg.attr("src", imageUrl.arrowDown)
            this.selected = true
        }
    })
}

Interface.prototype.invertColorFilter = function (divElement) {
    d3.select(divElement).select("img").style("filter", function (d) {
        return divElement.classList.contains("as-group") ? "invert(1)" : "invert(0)"
    })
}

Interface.prototype.onDragStart = function (event) {
    event.dataTransfer.setData("text/plain", event.target.id);
    if (event.target.parentNode.id === "group-by") {
        $(".group-dump").css("display", "block");
    }
}

Interface.prototype.onDragOver = function (event) {
    event.preventDefault();
}

Interface.prototype.createDimensionElement = function (keyName) {
    const element = document.createElement("div")
    element.classList.add("extra")
    element.classList.add("draggable")
    element.id = "extra-" + keyName
    element.draggable = "true"
    element.setAttribute("value", keyName)

    this.addDimensionDropdown(element, keyName)

    return element
}

Interface.prototype.onDrop = function (event) {
    let _this = this
    const id = event.dataTransfer.getData("text");

    const draggableElement = document.getElementById(id).cloneNode(true);
    const keyName = draggableElement.getAttribute("value")

    const clonedElement = this.createDimensionElement(keyName)

    if (draggableElement.classList.contains("as-group")) {
        clonedElement.classList.add("as-group")
        _this.invertColorFilter(clonedElement)
    }

    const dropZone = event.currentTarget;

    let dropZoneChildren = Array.from(dropZone.children).map(a => {
        const child = {}
        const rect = a.getBoundingClientRect()
        child.centerX = rect.left + rect.width / 2
        child.centerY = rect.bottom + rect.height / 2
        child.dimension = a.getAttribute("value")
        return child
    })

    const newChild = {
        centerX: event.clientX,
        centerY: event.clientY,
        dimension: clonedElement.getAttribute("value")
    }

    let newGrouping = dropZoneChildren.filter(d => d.dimension !== newChild.dimension)

    newGrouping.push(newChild)

    newGrouping = newGrouping.sort((a, b) => (a.centerX > b.centerX) ? 1 : ((b.centerX > a.centerX) ? -1 : 0)).map(d => d.dimension)

    clonedElement.addEventListener("dragstart", function (event) {
        _this.onDragStart(event)
    })

    if (
        clonedElement.classList.contains("as-group") &&
        dropZone.children.length > 1
    ) {
        dropZone.removeChild(document.getElementById(id));
        dropZone.appendChild(clonedElement);

        reorderGrouping(dropZone, newGrouping)
        this.app.updateGroupBy(newGrouping);
    }

    const currentGroups = dropZoneChildren.map(d => d.dimension)

    if (!currentGroups.includes(newChild.dimension)) {
        clonedElement.classList.add("as-group");
        this.invertColorFilter(clonedElement)

        dropZone.appendChild(clonedElement);
        reorderGrouping(dropZone, newGrouping)

        this.app.updateGroupBy(newGrouping);

        event.dataTransfer.clearData();
    }

    $(".group-dump").css("display", "none");

    function reorderGrouping(dropZone, childrenOrder) {
        const children = Array.from(dropZone.children)

        Array.from(dropZone.children).forEach(childName => {
            dropZone.removeChild(childName)
        })

        childrenOrder.forEach(childName => {
            dropZone.appendChild(children.filter(d => d.getAttribute("value") === childName)[0])
        })
    }
}

Interface.prototype.onDragOverDump = function (event) {
    event.preventDefault();
}

Interface.prototype.updateInterfaceColor = function (colors) {
    let inputGroups = document.getElementsByClassName("as-group")
    for (let item of inputGroups) {
        item.style.backgroundColor = colors(item.getAttribute("value"))
    }
}

Interface.prototype.onDropDump = function (event) {
    const id = event.dataTransfer.getData("text");
    const draggableElement = document.getElementById(id); //.cloneNode(true);
    const parentDragable = document.getElementById("group-by");

    if (
        draggableElement.classList.contains("as-group") &&
        parentDragable.children.length > 1
    ) {
        parentDragable.removeChild(draggableElement);
        this.app.removeGroupBy(draggableElement.getAttribute("value"));
    }

    $(".group-dump").css("display", "none");
}