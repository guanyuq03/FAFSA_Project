/*********************************************
 * Tooltip and Global Variables
 *********************************************/
const tooltip = d3.select("body").append("div").attr("class", "tooltip");
let globalData = [];
let selectedQuarter = "Q1";

/*********************************************
 * Clear Visualization Containers
 *********************************************/
function clearContainer(id) {
  d3.select(id).selectAll("*").remove();
}

/*********************************************
 * Chart 1: Bar Chart — Top 10 Institutions by FAFSA Applications
 *********************************************/
function drawBarChart(q) {
  clearContainer("#viz1");
  const col = "Quarterly Total_" + q;

  const data = [...globalData]
    .sort((a, b) => d3.descending(+a[col], +b[col]))
    .slice(0, 10);

  const margin = { top: 40, right: 20, bottom: 80, left: 60 },
        width = 600 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#viz1").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(data.map(d => d.School))
    .range([0, width])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => +d[col])])
    .nice()
    .range([height, 0]);

  svg.append("g")
    .call(d3.axisLeft(y));

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  svg.selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", d => x(d.School))
    .attr("y", d => y(+d[col]))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(+d[col]))
    .attr("fill", "#5DADE2")
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1)
        .html(`<strong>${d.School}</strong><br/>${q} Applications: ${d[col]}`);
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
 * Chart 2: Choropleth Map — FAFSA Applications by State
 *********************************************/
function drawMap(q) {
  clearContainer("#viz2");
  const col = "Quarterly Total_" + q;

  const stateRollup = d3.rollups(
    globalData,
    v => d3.sum(v, d => +d[col]),
    d => d.State
  );
  const stateTotals = Object.fromEntries(stateRollup);

  const width = 800, height = 500;
  const svg = d3.select("#viz2")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const projection = d3.geoAlbersUsa().scale(1000).translate([width / 2, height / 2]);
  const path = d3.geoPath().projection(projection);

  const colorScale = d3.scaleQuantize()
    .domain([0, d3.max(Object.values(stateTotals))])
    .range(d3.schemeBlues[7]);

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
      .attr("fill", d => {
        const abbr = stateIdMap[d.id.toString().padStart(2, "0")];
        return colorScale(stateTotals[abbr] || 0);
      })
      .attr("stroke", "#fff")
      .on("mouseover", (event, d) => {
        const abbr = stateIdMap[d.id.toString().padStart(2, "0")];
        const total = stateTotals[abbr] || 0;
        tooltip.style("opacity", 1)
          .html(`<strong>${abbr}</strong><br/>${q} Total: ${total}`);
      })
      .on("mousemove", (event) => {
        tooltip.style("left", event.pageX + 10 + "px").style("top", event.pageY + "px");
      })
      .on("mouseout", () => tooltip.style("opacity", 0));
  });
}

/*********************************************
 * Chart 3: Scatter Plot — Dependent vs Independent
 *********************************************/
function drawScatterChart(q) {
  clearContainer("#viz3");

  const depCol = "Dependent Students_" + q;
  const indCol = "Independent Students_" + q;

  const data = globalData.filter(d => d[depCol] && d[indCol]);

  const margin = { top: 40, right: 30, bottom: 50, left: 60 },
        width = 600 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#viz3").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([0, d3.max(data, d => +d[depCol])]).nice().range([0, width]);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => +d[indCol])]).nice().range([height, 0]);

  svg.append("g").call(d3.axisLeft(y));
  svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));

  svg.selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => x(+d[depCol]))
    .attr("cy", d => y(+d[indCol]))
    .attr("r", 4)
    .attr("fill", "#2E86C1")
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1)
        .html(`<strong>${d.School}</strong><br/>Dep: ${d[depCol]}<br/>Ind: ${d[indCol]}`);
    })
    .on("mousemove", (event) => {
      tooltip.style("left", event.pageX + 10 + "px").style("top", event.pageY + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0));
}

/*********************************************
 * Altair Embeds will be handled via HTML injection
 *********************************************/
function loadAltairCharts(q) {
  document.getElementById("altair_scatter").src = `altair_scatter_q${q}.html`;
  document.getElementById("altair_histogram").src = `altair_histogram_q${q}.html`;
}

/*********************************************
 * Update all charts when quarter changes
 *********************************************/
function updateAllCharts(q) {
  drawBarChart(q);
  drawMap(q);
  drawScatterChart(q);
  loadAltairCharts(q);
}

/*********************************************
 * MAIN
 *********************************************/
d3.csv("cleaned.csv").then(data => {
  globalData = data;
  updateAllCharts(selectedQuarter);

  d3.selectAll(".tab-button").on("click", function() {
    d3.selectAll(".tab-button").classed("active", false);
    d3.select(this).classed("active", true);
    selectedQuarter = d3.select(this).attr("data-quarter");
    updateAllCharts(selectedQuarter);
  });
});
