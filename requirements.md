1.) The key idea is that the data represents a pivot table,
meaning a table of data where columns of data can be interactively grouped by other columns.
In the pictured case, the data is grouped by “Publication”.

2.) Note the controls at the top of the graphic, “Group By” and “Extras”.
They represent some of the data dimensions in the table (your version could display just these dimensions,
but should be able to show any dimension in the data set by changing settings in the code).
These controls can be dragged and dropped and clicked to be activated or de-activated.

3.) Whatever is in “Group By” slot is shown as the first “ring” in the graphic.
A dimension from the “Extras” area could be dragged and dropped on top of “Publications”
to replace it and the chart would update (animated) to show that new dimension as the grouping dimension.
Publications would then appear deactivated in the Extras area.

4.) Toggling the active state of dimensions in the “Extras” area toggles their visibility to the side of the chart.

5.) Hovering over items in the “Extras” to the side of the chart
activates the pictured highlight that shows connections in the data set.
Clicking the item makes the highlight sticky so that the user can hover over other additional items.

6.) In the chart itself, clicking on an item brings up the popup (pictured).
Clicking on “Source” loads the article’s URL in a new window.

7.) Ideally, we’d be able to drag multiple “Group By” items into that area,
and reorder the way they’re grouped, but I’m not quite sure how to represent that in the graphic.
