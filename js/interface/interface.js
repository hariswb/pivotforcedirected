let Interface = function (app) {
    this.app = app

    this.updateDimensions()
}

Interface.prototype.addDimensionDropdown = function (divElement, keyId) {
    const _this = this

    this.handleClickTimeout = new Date()

    const dropdownList = this.dimensionsMap.get(keyId)

    const selection = d3.select(divElement)

    const dropdownContentId = `dropdown-dimension-content-${keyId}`

    const dropdownListElements = selection
        .append("div")
        .attr("id", dropdownContentId)
        .attr("class", ` dropdown-dimension-content dropdown-dimension-content-none`)
        .selectAll("span")
        .data(dropdownList, d => d.val)
        .join(enter => enter
            .append("span")
            .attr("class", `${dropdownContentId}`)
            .on("click", function (event, d) {
                const past = this.past ? this.past : 0
                const now = new Date().getTime()
                const waited = now - past

                if (waited < 300) {
                    clearTimeout(this.triggerClick)
                } else {
                    this.triggerClick = setTimeout(() => {
                        d.show = !d.show
                        d3.select(this).style("color", d.show === true ? "#111" : "#bbb")
                        _this.app.updateDocumentExclusion(event.type, keyId, d.content, d.show)
                    }, 300)
                }
                this.past = now
            })
            .on("dblclick", function (event, d) {
                const _that = this

                _this.dimensionsMap.get(keyId).forEach(k => {
                    k.show = k.content === d.content ? true : false
                    if (_that.triggered === true) {
                        k.show = true
                    }
                })

                if (this.triggered !== true) {
                    _this.app.updateDocumentExclusion(event.type, keyId, d.content, d.show)
                    this.triggered = true
                } else {
                    _this.app.updateDocumentExclusion(event.type + "-cleared", keyId, d.content, d.show)
                    this.triggered = false
                }

                d3.selectAll(`.${dropdownContentId}`).style("color", d => d.show === true ? "#111" : "#bbb")

            })
            .style("color", "#111")
            .html(d => d.content))

    selection.select(".dropdown-button").on("click", function (event, d) {
        const dropdownButton = d3.select(this)
        const dropdownContents = d3.select(`#dropdown-dimension-content-${keyId}`)
        if (this.selected === true) {
            dropdownContents.classed("dropdown-dimension-content-none", true)
            this.selected = false
        } else {
            dropdownContents.style("width", `${this.getBoundingClientRect().width - 10}px`).classed("dropdown-dimension-content-none", false)
            dropdownButton.style("border-radius", "2px 2px 0px 0px")
            this.selected = true
        }
    })

    const elementWidth = divElement.getBoundingClientRect().width
}

Interface.prototype.updateDimensions = function () {
    let _this = this
    let groupBy = this.app.groupBy
    let keys = this.app.keys
    let extras = this.app.extras
    let elementsExtras = document.getElementById("extras")
    this.dimensionsMap = new Map()

    d3.selectAll(".extra").remove()

    keys.forEach(function (key) {
        _this.dimensionsMap.set(key, [...new Set(_this.app.data.map(d => d[key]))].map(d => ({ content: d, show: true })))

        let dimension = _this.createDimensionElement(key)

        _this.addDimensionDropdown(dimension, key)

        dimension.addEventListener("dragstart", function (event) {
            _this.onDragStart(event)
        })

        dimension.addEventListener("click", function (event) {
            // if (_this.app.extras.includes(key)) {
            //     document.getElementById(`extra-${key}`).classList.remove("active");
            // } else if (!_this.app.extras.includes(key)) {
            //     document.getElementById(`extra-${key}`).classList.add("active");
            // }

            // _this.app.setExtras(key)
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
        const dropZone = document.getElementById("group-by");
        dropZone.appendChild(defaultGroup);
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

    const dropdownButton = document.createElement("div")
    dropdownButton.classList.add("dropdown-button")

    dropdownButton.innerHTML = `${keyName}: ${this.app.dimensionCounts.get(keyName)}`
    element.appendChild(dropdownButton)
    return element
}

Interface.prototype.onDrop = function (event) {
    let _this = this
    const id = event.dataTransfer.getData("text");

    const draggableElement = document.getElementById(id).cloneNode(true);
    const keyName = draggableElement.getAttribute("value")

    const clonedElement = [...draggableElement.classList].includes("as-group") === true ?
        draggableElement :
        this.createDimensionElement(keyName)

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