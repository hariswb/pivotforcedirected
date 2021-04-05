function onDragStart(event) {
  event.dataTransfer.setData("text/plain", event.target.id);
}

function onDragOver(event) {
  event.preventDefault();
}

function onDrop(event) {
  const id = event.dataTransfer.getData("text");
  const draggableElement = document.getElementById(id);
  const dropzone = event.currentTarget;

  if (dropzone.childNodes.length > 0) {
    const origin = document.getElementById("extras");
    dropzoneChild = dropzone.childNodes[0];

    //Remove dropzone content and append it to its origin

    dropzoneChild.classList.remove("as-group");
    dropzone.removeChild(dropzoneChild);
    origin.appendChild(dropzoneChild);
  }
  //Add the dragable element to dropzone
  //Change the value attribute in dropzone element

  draggableElement.classList.add("as-group");
  dropzone.appendChild(draggableElement);
  event.dataTransfer.clearData();
  this.setGroupBy(draggableElement.getAttribute("value"));
  if (this.extras.includes(draggableElement.getAttribute("value"))) {
    this.setExtras(draggableElement.getAttribute("value"));
  }
}

function manageInputs(keys) {
  d3.select("#extras")
    .selectAll("div")
    .data(keys)
    .join("div")
    .attr("id", (k) => k)
    .text((k) => k)
    .attr("class", "draggable extra")
    .attr("id", (k) => "extra-" + k)
    .attr("value", (k) => k)
    .attr("draggable", "true")
    .attr("ondragstart", "onDragStart(event)")
    .on("click", (event, k) => {
      if (this.extras.includes(k)) {
        d3.select(`#extra-${k}`).classed("active", false);
      } else {
        d3.select(`#extra-${k}`).classed("active", true);
      }
      this.setExtras(k);
    });

  d3.select("#group-by")
    .attr("ondragover", "onDragOver(event)")
    .attr("ondrop", "onDrop(event)");

  //Set GroupBy default
  //
  const defaultGroup = document.getElementById("extra-" + this.groupBy);
  defaultGroup.classList.add("as-group");
  const dropZone = document.getElementById("group-by");
  dropZone.appendChild(defaultGroup);
}
