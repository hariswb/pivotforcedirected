let Interface = function (app) {
    this.app = app

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
        let extra = document.createElement("div")
        extra.id = `extra-${key}`
        extra.className = "draggable extra"
        extra.innerHTML = `${key}: ${_this.app.dimensionCounts.get(key)}`
        extra.draggable = "true"
        extra.setAttribute("value", key)
        extra.addEventListener("dragstart", function (event) {
            _this.onDragStart(event)
        })

        // extra.addEventListener("click", function (event) {
        //     if (_this.app.extras.includes(key)) {
        //         document.getElementById(`extra-${key}`).classList.remove("active");
        //     } else if (!_this.app.extras.includes(key)) {
        //         document.getElementById(`extra-${key}`).classList.add("active");
        //     }

        //     _this.app.setExtras(key)
        // })

        elementsExtras.appendChild(extra)
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

    groupBy.forEach(function (group) {
        const defaultGroup = document
            .getElementById("extra-" + group)
            .cloneNode(true);

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

Interface.prototype.onDrop = function (event) {
    let _this = this
    const id = event.dataTransfer.getData("text");
    const draggableElement = document.getElementById(id).cloneNode(true);
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
        dimension: draggableElement.getAttribute("value")
    }

    let newGrouping = dropZoneChildren.filter(d => d.dimension !== newChild.dimension)

    newGrouping.push(newChild)

    newGrouping = newGrouping.sort((a, b) => (a.centerX > b.centerX) ? 1 : ((b.centerX > a.centerX) ? -1 : 0)).map(d => d.dimension)

    draggableElement.addEventListener("dragstart", function (event) {
        _this.onDragStart(event)
    })


    if (
        draggableElement.classList.contains("as-group") &&
        dropZone.children.length > 1
    ) {
        dropZone.removeChild(document.getElementById(id));
        dropZone.appendChild(draggableElement);

        reorderGrouping(dropZone, newGrouping)
        this.app.updateGroupBy(newGrouping);
    }

    const currentGroups = dropZoneChildren.map(d => d.dimension)
    if (!currentGroups.includes(newChild.dimension)) {
        draggableElement.classList.add("as-group");

        dropZone.appendChild(draggableElement);
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