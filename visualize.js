/*********************************************
 * Global Variables & Tooltip
 *********************************************/
const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip");

let globalData = [];     // from cleaned.csv
let selectedQuarter = "Q1"; // default quarter

// Color map for each quarter
const quarterColor = {
  Q1: "#69b3a2",
  Q2: "#ff7f0e",
  Q3: "#1f77b4",
  Q4: "#2ca02c",
  Q5: "#d62728"
};

/*********************************************
 * Clear a container by ID
 *********************************************/
function clearContainer(id) {
  d3.select(id).selectAll("*").remove();
}

/*********************************************
 * Chart 1: Bar Chart (Top 10 Schools by Selected Quarter)
 *********************************************/
function drawBarChart(q) {
  clearContainer("#viz1");
  const col = "Quarterly Total_" + q;

  const data = [...globalData]
    .sort((a, b) => d3.descending(+a[col], +b[col]))
    .slice(0, 10);

  const margin = { top: 30, right: 30, bottom: 100, left: 80 },
        width  = 600 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#viz1")
    .append("svg")
    .attr("class", "chart-svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(data.map(d => d.School))
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => +d[col]) || 0])
    .range([height, 0]);

  svg.append("g")
     .attr("transform", `translate(0,${height})`)
     .call(d3.axisBottom(x))
     .selectAll("text")
     .attr("transform", "translate(0,10)rotate(-45)")
     .style("text-anchor", "end");

  svg.append("g").call(d3.axisLeft(y));

  svg.selectAll("rect")
     .data(data)
     .join("rect")
     .attr("x", d => x(d.School))
     .attr("y", d => y(+d[col]))
     .attr("width", x.bandwidth())
     .attr("height", d => height - y(+d[col]))
     .attr("fill", quarterColor[q])
     .on("mouseover", (event, d) => {
       tooltip.style("opacity", 1)
              .html(`School: ${d.School}<br>${q} Total: ${d[col]}`);
     })
     .on("mousemove", (event) => {
       tooltip.style("left", event.pageX + 10 + "px")
              .style("top", event.pageY + "px");
     })
     .on("mouseout", () => {
       tooltip.style("opacity", 0);
     });
}

/*********************************************
 * Chart 2: Line Chart (Aggregated Q1–Q5)
 *********************************************/
function drawLineChartOnce() {
  d3.select("#viz2").selectAll("*").remove();

  const data2 = ["Q1", "Q2", "Q3", "Q4", "Q5"].map(q => ({
    quarter: +q[1],
    total: d3.sum(globalData, d => +d[`Quarterly Total_${q}`])
  }));

  const margin = { top: 30, right: 30, bottom: 50, left: 60 },
        width  = 600 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#viz2")
    .append("svg")
    .attr("class", "chart-svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([1, 5]).range([0, width]);
  const y = d3.scaleLinear().domain([0, d3.max(data2, d => d.total)]).range([height, 0]);

  svg.append("g")
     .attr("transform", `translate(0,${height})`)
     .call(d3.axisBottom(x).ticks(5).tickFormat(d => `Q${d}`));
  svg.append("g").call(d3.axisLeft(y));

  svg.append("path")
     .datum(data2)
     .attr("fill", "none")
     .attr("stroke", "#ff7f0e")
     .attr("stroke-width", 2)
     .attr("d", d3.line().x(d => x(d.quarter)).y(d => y(d.total)));

  svg.selectAll("circle")
     .data(data2)
     .join("circle")
     .attr("cx", d => x(d.quarter))
     .attr("cy", d => y(d.total))
     .attr("r", 4)
     .attr("fill", "#ff7f0e")
     .on("mouseover", (event, d) => {
       tooltip.style("opacity", 1)
              .html(`Quarter: Q${d.quarter}<br>Total: ${d.total}`);
     })
     .on("mousemove", (event) => {
       tooltip.style("left", event.pageX + 10 + "px")
              .style("top", event.pageY + "px");
     })
     .on("mouseout", () => {
       tooltip.style("opacity", 0);
     });
}

/*********************************************
 * Chart 3: Scatter Plot (Dep vs. Ind for selected quarter)
 *********************************************/
function drawScatterChart(q) {
  clearContainer("#viz3");
  const depCol = "Dependent Students_" + q;
  const indCol = "Independent Students_" + q;

  const data = globalData.map(d => ({
    dep: +d[depCol],
    ind: +d[indCol]
  })).filter(d => !isNaN(d.dep) && !isNaN(d.ind));

  const margin = { top: 30, right: 30, bottom: 50, left: 60 },
        width  = 600 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#viz3")
    .append("svg")
    .attr("class", "chart-svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([0, d3.max(data, d => d.dep)]).range([0, width]);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.ind)]).range([height, 0]);

  svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y));

  svg.selectAll("circle")
     .data(data)
     .join("circle")
     .attr("cx", d => x(d.dep))
     .attr("cy", d => y(d.ind))
     .attr("r", 5)
     .attr("fill", quarterColor[q])
     .on("mouseover", (event, d) => {
       tooltip.style("opacity", 1)
              .html(`Dependent: ${d.dep}<br>Independent: ${d.ind}`);
     })
     .on("mousemove", (event) => {
       tooltip.style("left", event.pageX + 10 + "px")
              .style("top", event.pageY + "px");
     })
     .on("mouseout", () => {
       tooltip.style("opacity", 0);
     });
}

/*********************************************
 * Chart 4: Pie/Donut (School Type by selected quarter)
 *********************************************/
function drawPieChart(q) {
  clearContainer("#viz4");
  const col = "Quarterly Total_" + q;

  const rollup = d3.rollups(globalData, v => d3.sum(v, d => +d[col]), d => d["School Type"]);
  const data = rollup.map(([type, total]) => ({ type, total }));

  const margin = 20, width = 400, height = 400;
  const radius = Math.min(width, height) / 2 - margin;

  const svg = d3.select("#viz4")
    .append("svg")
    .attr("class", "chart-svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);

  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.type))
    .range(d3.schemeTableau10);

  const pie = d3.pie().sort(null).value(d => d.total);
  const arc = d3.arc().innerRadius(70).outerRadius(radius);
  const arcs = pie(data);

  svg.selectAll("path")
     .data(arcs)
     .join("path")
     .attr("d", arc)
     .attr("fill", d => color(d.data.type))
     .on("mouseover", (event, d) => {
       tooltip.style("opacity", 1)
              .html(`Type: ${d.data.type}<br>${q} Total: ${d.data.total}`);
     })
     .on("mousemove", (event) => {
       tooltip.style("left", event.pageX + 10 + "px")
              .style("top", event.pageY + "px");
     })
     .on("mouseout", () => {
       tooltip.style("opacity", 0);
     });

  svg.selectAll("text")
     .data(arcs)
     .join("text")
     .attr("transform", d => `translate(${arc.centroid(d)})`)
     .attr("text-anchor", "middle")
     .style("fill", "#fff")
     .text(d => d.data.type);
}

/*********************************************
 * Update quarter charts
 *********************************************/
function updateCharts(q) {
  drawBarChart(q);
  drawScatterChart(q);
  drawPieChart(q);
}

/*********************************************
 * MAIN: Load data and initialize
 *********************************************/
d3.csv("cleaned.csv").then(data => {
  globalData = data;

  drawLineChartOnce();        // Chart 2
  updateCharts(selectedQuarter);  // Charts 1, 3, 4

  d3.selectAll(".tab-button").on("click", function () {
    d3.selectAll(".tab-button").classed("active", false);
    d3.select(this).classed("active", true);
    selectedQuarter = d3.select(this).attr("data-quarter");
    updateCharts(selectedQuarter);
  });
});
