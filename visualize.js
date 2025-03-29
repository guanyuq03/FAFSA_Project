/*********************************************
 * Global Variables & Tooltip
 *********************************************/
const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip");

let globalData = [];
let selectedQuarter = "Q1";

const quarterColor = {
  Q1: "#69b3a2",
  Q2: "#ff7f0e",
  Q3: "#1f77b4",
  Q4: "#2ca02c",
  Q5: "#d62728"
};

/*********************************************
 * Clear container
 *********************************************/
function clearContainer(id) {
  d3.select(id).selectAll("*").remove();
}

/*********************************************
 * Chart 1: Bar Chart (Top 10 Schools)
 *********************************************/
function drawBarChart(q) {
  clearContainer("#viz1");
  const col = "Quarterly Total_" + q;

  const data = [...globalData]
    .sort((a, b) => d3.descending(+a[col], +b[col]))
    .slice(0, 10);

  const margin = { top: 30, right: 30, bottom: 100, left: 80 },
        width = 600 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#viz1")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(data.map(d => d.School))
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => +d[col])])
    .range([height, 0]);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  svg.append("g").call(d3.axisLeft(y));

  svg.selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", d => x(d.School))
    .attr("y", height)
    .attr("width", x.bandwidth())
    .attr("height", 0)
    .attr("fill", quarterColor[q])
    .transition()
    .duration(800)
    .delay((d, i) => i * 50)
    .attr("y", d => y(+d[col]))
    .attr("height", d => height - y(+d[col]));

  svg.selectAll("rect")
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1)
             .html(`School: ${d.School}<br>${q} Total: ${d[col]}`);
    })
    .on("mousemove", event => {
      tooltip.style("left", event.pageX + 10 + "px")
             .style("top", event.pageY + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0));
}


/*********************************************
 * Main Runner
 *********************************************/
function updateCharts(q) {
  drawBarChart(q);
  drawMap(q);
  drawScatterChart(q);
}

d3.csv("cleaned.csv").then(data => {
  globalData = data;
  updateCharts(selectedQuarter);

  d3.selectAll(".tab-button").on("click", function () {
    d3.selectAll(".tab-button").classed("active", false);
    d3.select(this).classed("active", true);
    selectedQuarter = d3.select(this).attr("data-quarter");
    updateCharts(selectedQuarter);
  });
});
