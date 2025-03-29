/*********************************************
 * Global Variables & Tooltip
 *********************************************/
const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip");

let globalData = [];     // from cleaned.csv
let selectedQuarter = "Q1"; // default quarter

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

  // Sort descending and take top 10
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
     .attr("fill", "#69b3a2")
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
  // Clear container
  d3.select("#viz2").selectAll("*").remove();

  // Sum across all rows for Q1..Q5
  const sumQ1 = d3.sum(globalData, d => +d["Quarterly Total_Q1"]);
  const sumQ2 = d3.sum(globalData, d => +d["Quarterly Total_Q2"]);
  const sumQ3 = d3.sum(globalData, d => +d["Quarterly Total_Q3"]);
  const sumQ4 = d3.sum(globalData, d => +d["Quarterly Total_Q4"]);
  const sumQ5 = d3.sum(globalData, d => +d["Quarterly Total_Q5"]);

  const data2 = [
    { quarter: 1, total: sumQ1 },
    { quarter: 2, total: sumQ2 },
    { quarter: 3, total: sumQ3 },
    { quarter: 4, total: sumQ4 },
    { quarter: 5, total: sumQ5 },
  ];

  const margin2 = { top: 30, right: 30, bottom: 50, left: 60 },
        width2  = 600 - margin2.left - margin2.right,
        height2 = 400 - margin2.top - margin2.bottom;

  const svg2 = d3.select("#viz2")
    .append("svg")
    .attr("class", "chart-svg")
    .attr("width", width2 + margin2.left + margin2.right)
    .attr("height", height2 + margin2.top + margin2.bottom)
    .append("g")
    .attr("transform", `translate(${margin2.left},${margin2.top})`);

  const x2 = d3.scaleLinear()
    .domain([1, 5])
    .range([0, width2]);

  const y2 = d3.scaleLinear()
    .domain([0, d3.max(data2, d => d.total) || 0])
    .range([height2, 0]);

  svg2.append("g")
      .attr("transform", `translate(0,${height2})`)
      .call(d3.axisBottom(x2).ticks(5).tickFormat(d => `Q${d}`));

  svg2.append("g").call(d3.axisLeft(y2));

  const line2 = d3.line()
    .x(d => x2(d.quarter))
    .y(d => y2(d.total));

  svg2.append("path")
      .datum(data2)
      .attr("fill", "none")
      .attr("stroke", "#ff7f0e")
      .attr("stroke-width", 2)
      .attr("d", line2);

  // Circles for each quarter
  svg2.selectAll("circle")
      .data(data2)
      .join("circle")
      .attr("cx", d => x2(d.quarter))
      .attr("cy", d => y2(d.total))
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
    ind: +d[indCol],
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

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.dep) || 0])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.ind) || 0])
    .range([height, 0]);

  svg.append("g")
     .attr("transform", `translate(0,${height})`)
     .call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y));

  svg.selectAll("circle")
     .data(data)
     .join("circle")
     .attr("cx", d => x(d.dep))
     .attr("cy", d => y(d.ind))
     .attr("r", 5)
     .attr("fill", "#1f77b4")
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

  const rollup = d3.rollups(
    globalData,
    v => d3.sum(v, d => +d[col]),
    d => d["School Type"]
  );
  const data = rollup.map(([type, total]) => ({ type, total }));

  const margin = 20,
        width = 400,
        height = 400,
        radius = Math.min(width, height) / 2 - margin;

  const svg = d3.select("#viz4")
    .append("svg")
    .attr("class", "chart-svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);

  const color = d3.scaleOrdinal(d3.schemeCategory10);

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
 * Chart 5: Stacked Bar (Dep vs. Ind for Q1..Q5)
 *********************************************/
function drawStackedBarOnce() {
  // Summed Dep vs. Ind for Q1..Q5
  const depQ1 = d3.sum(globalData, d => +d["Dependent Students_Q1"]);
  const indQ1 = d3.sum(globalData, d => +d["Independent Students_Q1"]);
  const depQ2 = d3.sum(globalData, d => +d["Dependent Students_Q2"]);
  const indQ2 = d3.sum(globalData, d => +d["Independent Students_Q2"]);
  const depQ3 = d3.sum(globalData, d => +d["Dependent Students_Q3"]);
  const indQ3 = d3.sum(globalData, d => +d["Independent Students_Q3"]);
  const depQ4 = d3.sum(globalData, d => +d["Dependent Students_Q4"]);
  const indQ4 = d3.sum(globalData, d => +d["Independent Students_Q4"]);
  const depQ5 = d3.sum(globalData, d => +d["Dependent Students_Q5"]);
  const indQ5 = d3.sum(globalData, d => +d["Independent Students_Q5"]);

  const data5 = [
    { quarter: "Q1", dep: depQ1, ind: indQ1 },
    { quarter: "Q2", dep: depQ2, ind: indQ2 },
    { quarter: "Q3", dep: depQ3, ind: indQ3 },
    { quarter: "Q4", dep: depQ4, ind: indQ4 },
    { quarter: "Q5", dep: depQ5, ind: indQ5 },
  ];

  const subgroups = ["dep", "ind"];
  const groups = data5.map(d => d.quarter);

  const margin5 = { top: 30, right: 30, bottom: 50, left: 60 },
        width5  = 600 - margin5.left - margin5.right,
        height5 = 400 - margin5.top - margin5.bottom;

  const svg5 = d3.select("#viz5")
    .append("svg")
    .attr("class", "chart-svg")
    .attr("width", width5 + margin5.left + margin5.right)
    .attr("height", height5 + margin5.top + margin5.bottom)
    .append("g")
    .attr("transform", `translate(${margin5.left},${margin5.top})`);

  const x5 = d3.scaleBand()
    .domain(groups)
    .range([0, width5])
    .padding(0.2);

  const y5 = d3.scaleLinear()
    .domain([0, d3.max(data5, d => d.dep + d.ind) || 0])
    .range([height5, 0]);

  const color5 = d3.scaleOrdinal(d3.schemeSet2).domain(subgroups);
  const stackedData5 = d3.stack().keys(subgroups)(data5);

  svg5.selectAll("g.layer")
    .data(stackedData5)
    .join("g")
    .attr("class", "layer")
    .attr("fill", d => color5(d.key))
    .selectAll("rect")
    .data(d => d)
    .join("rect")
    .attr("x", d => x5(d.data.quarter))
    .attr("y", d => y5(d[1]))
    .attr("height", d => y5(d[0]) - y5(d[1]))
    .attr("width", x5.bandwidth())
    .on("mouseover", function (event, d) {
      const subgroupName = d3.select(this.parentNode).datum().key;
      const value = d.data[subgroupName];
      tooltip.style("opacity", 1)
             .html(`Quarter: ${d.data.quarter}<br>${subgroupName}: ${value}`);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + "px");
    })
    .on("mouseout", function () {
      tooltip.style("opacity", 0);
    });

  svg5.append("g")
    .attr("transform", `translate(0,${height5})`)
    .call(d3.axisBottom(x5));

  svg5.append("g").call(d3.axisLeft(y5));
}

/*********************************************
 * Chart 6: Map Visualization (Choropleth)
 *********************************************/
function drawMap(q) {
  clearContainer("#viz6");
  const col = "Quarterly Total_" + q;

  // Sum by state for the chosen quarter
  const stateRollup = d3.rollups(
    globalData,
    v => d3.sum(v, d => +d[col]),
    d => d.State
  );
  const stateTotals = Object.fromEntries(stateRollup);

  const width = 960, height = 600;
  const svg = d3.select("#viz6")
    .append("svg")
    .attr("class", "chart-svg")
    .attr("width", width)
    .attr("height", height);

  const projection = d3.geoAlbersUsa()
    .translate([width / 2, height / 2])
    .scale(1000);
  const path = d3.geoPath().projection(projection);

  const colorScale = d3.scaleQuantize()
    .domain([0, d3.max(Object.values(stateTotals)) || 0])
    .range(d3.schemeBlues[9]);

  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json")
    .then(us => {
      // FIPS -> abbr
      const stateIdMapping = {
        "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
        "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
        "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
        "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
        "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
        "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
        "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
        "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
        "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
        "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
        "56": "WY"
      };

      svg.selectAll("path")
         .data(topojson.feature(us, us.objects.states).features)
         .join("path")
         .attr("d", path)
         .attr("fill", d => {
           let abbr = stateIdMapping[d.id.toString().padStart(2, "0")];
           let total = stateTotals[abbr] || 0;
           return colorScale(total);
         })
         .attr("stroke", "#fff")
         .on("mouseover", (event, d) => {
           let abbr = stateIdMapping[d.id.toString().padStart(2, "0")];
           let total = stateTotals[abbr] || 0;
           tooltip.style("opacity", 1)
                  .html(`State: ${abbr}<br>${q} Total: ${total}`);
         })
         .on("mousemove", (event) => {
           tooltip.style("left", event.pageX + 10 + "px")
                  .style("top", event.pageY + "px");
         })
         .on("mouseout", () => {
           tooltip.style("opacity", 0);
         });
    })
    .catch(err => {
      console.error("Error loading map JSON:", err);
    });
}

/*********************************************
 * Update Quarter-based Charts
 *********************************************/
function updateCharts(q) {
  drawBarChart(q);
  drawScatterChart(q);
  drawPieChart(q);
  drawMap(q);
}

/*********************************************
 * MAIN: Load cleaned.csv, then draw everything
 *********************************************/
d3.csv("cleaned.csv").then(data => {
  globalData = data;
  console.log("Global cleaned.csv loaded, first row:", globalData[0]);

  // 1) Draw the line chart (Chart 2) once (aggregated Q1..Q5)
  drawLineChartOnce();

  // 2) Draw the stacked bar chart (Chart 5) once
  drawStackedBarOnce();

  // 3) Initialize quarter-based charts with default quarter
  updateCharts(selectedQuarter);

  // Quarter tab listeners
  d3.selectAll(".tab-button").on("click", function() {
    d3.selectAll(".tab-button").classed("active", false);
    d3.select(this).classed("active", true);
    selectedQuarter = d3.select(this).attr("data-quarter");
    console.log("Switching to quarter:", selectedQuarter);
    updateCharts(selectedQuarter);
  });
});
