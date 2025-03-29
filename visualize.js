const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip");

let globalData = [];
let selectedQuarter = "Q1";

// Utility to clear chart areas
function clearContainer(id) {
  d3.select(id).selectAll("*").remove();
}

// Draw Bar Chart
function drawBarChart(quarter) {
  clearContainer("#viz1");
  const col = "Quarterly Total_" + quarter;
  const data = [...globalData]
    .filter(d => !isNaN(+d[col]))
    .sort((a, b) => d3.descending(+a[col], +b[col]))
    .slice(0, 10);

  const margin = { top: 40, right: 30, bottom: 100, left: 60 };
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#viz1").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(data.map(d => d.School))
    .range([0, width]).padding(0.3);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => +d[col]) || 0])
    .range([height, 0]);

  svg.append("g").attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x)).selectAll("text")
    .attr("transform", "rotate(-45)").style("text-anchor", "end");

  svg.append("g").call(d3.axisLeft(y));

  svg.selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", d => x(d.School))
    .attr("width", x.bandwidth())
    .attr("y", d => y(+d[col]))
    .attr("height", d => height - y(+d[col]))
    .attr("fill", "#69b3a2");
}

// Map
function drawMap(quarter) {
  clearContainer("#viz2");
  const col = "Quarterly Total_" + quarter;
  const stateTotals = d3.rollups(globalData, v => d3.sum(v, d => +d[col]), d => d.State);
  const totalsObj = Object.fromEntries(stateTotals);

  const width = 960, height = 500;
  const svg = d3.select("#viz2").append("svg")
    .attr("width", width).attr("height", height);

  const projection = d3.geoAlbersUsa().scale(1000).translate([width / 2, height / 2]);
  const path = d3.geoPath().projection(projection);
  const color = d3.scaleQuantize().domain([0, d3.max(Object.values(totalsObj))])
    .range(d3.schemeBlues[9]);

  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then(us => {
    const stateIdMap = {
      "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT",
      "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL",
      "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD",
      "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE",
      "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
      "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
      "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV",
      "55": "WI", "56": "WY"
    };

    svg.selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
      .join("path")
      .attr("d", path)
      .attr("fill", d => color(totalsObj[stateIdMap[d.id.padStart(2, "0")]] || 0))
      .attr("stroke", "#fff")
      .on("mouseover", function (event, d) {
        const abbr = stateIdMap[d.id.padStart(2, "0")];
        tooltip.style("opacity", 1).html(`State: ${abbr}<br>Total: ${totalsObj[abbr] || 0}`);
      })
      .on("mousemove", event => {
        tooltip.style("left", event.pageX + 10 + "px").style("top", event.pageY + "px");
      })
      .on("mouseout", () => tooltip.style("opacity", 0));
  });
}

// D3 Scatter Plot
function drawScatterPlot(quarter) {
  clearContainer("#viz3");
  const dep = "Dependent Students_" + quarter;
  const ind = "Independent Students_" + quarter;

  const data = globalData.map(d => ({
    x: +d[dep], y: +d[ind]
  })).filter(d => !isNaN(d.x) && !isNaN(d.y));

  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#viz3").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([0, d3.max(data, d => d.x)]).range([0, width]);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.y)]).range([height, 0]);

  svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y));

  svg.selectAll("circle").data(data).join("circle")
    .attr("cx", d => x(d.x)).attr("cy", d => y(d.y)).attr("r", 4).attr("fill", "steelblue");
}

// Hook for quarter buttons
function updateCharts(quarter) {
  selectedQuarter = quarter;
  drawBarChart(quarter);
  drawMap(quarter);
  drawScatterPlot(quarter);

  document.getElementById("altair-scatter").src = `altair_scatter_${quarter}.html`;
  document.getElementById("altair-histogram").src = `altair_histogram_${quarter}.html`;
}

d3.csv("cleaned.csv").then(data => {
  globalData = data;
  updateCharts(selectedQuarter);
  d3.selectAll(".quarter-btn").on("click", function () {
    d3.selectAll(".quarter-btn").classed("active", false);
    d3.select(this).classed("active", true);
    updateCharts(d3.select(this).attr("data-q"));
  });
});
