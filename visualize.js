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
 * Utility to clear container
 *********************************************/
function clearContainer(id) {
  d3.select(id).selectAll("*").remove();
}

/*********************************************
 * Chart 1: Bar Chart (Top 10 Schools by FAFSA Applications)
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

  const svg = d3.select("#viz1").append("svg")
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
     .on("mousemove", (event) => {
       tooltip.style("left", event.pageX + 10 + "px")
              .style("top", event.pageY + "px");
     })
     .on("mouseout", () => {
       tooltip.style("opacity", 0);
     });
}

/*********************************************
 * Chart 2: Map (Choropleth by State)
 *********************************************/
function drawMap(q) {
  clearContainer("#viz2");
  const col = "Quarterly Total_" + q;

  const rollup = d3.rollups(
    globalData,
    v => d3.sum(v, d => +d[col]),
    d => d.State
  );
  const stateTotals = Object.fromEntries(rollup);

  const width = 960, height = 600;
  const svg = d3.select("#viz2").append("svg")
    .attr("class", "chart-svg")
    .attr("width", width)
    .attr("height", height);

  const projection = d3.geoAlbersUsa().translate([width / 2, height / 2]).scale(1000);
  const path = d3.geoPath().projection(projection);

  const color = d3.scaleQuantize()
    .domain([0, d3.max(Object.values(stateTotals))])
    .range(d3.schemeBlues[9]);

  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then(us => {
    const stateMap = {
      "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", "10": "DE",
      "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN", "19": "IA",
      "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
      "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH", "34": "NJ", "35": "NM",
      "36": "NY", "37": "NC", "38": "ND", "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
      "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
      "54": "WV", "55": "WI", "56": "WY"
    };

    svg.selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
      .join("path")
      .attr("d", path)
      .attr("fill", d => {
        let abbr = stateMap[d.id.toString().padStart(2, "0")];
        return color(stateTotals[abbr] || 0);
      })
      .attr("stroke", "#fff")
      .on("mouseover", (event, d) => {
        let abbr = stateMap[d.id.toString().padStart(2, "0")];
        tooltip.style("opacity", 1)
               .html(`State: ${abbr}<br>${q} Total: ${stateTotals[abbr] || 0}`);
      })
      .on("mousemove", (event) => {
        tooltip.style("left", event.pageX + 10 + "px")
               .style("top", event.pageY + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });
  });
}

/*********************************************
 * Chart 3: Scatter (Dep vs Ind)
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

  const svg = d3.select("#viz3").append("svg")
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
