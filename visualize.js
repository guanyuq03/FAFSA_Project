let currentQuarter = "Q1";
let globalData = [];
let selectedState = "ALL";

document.addEventListener("DOMContentLoaded", function () {
  d3.csv("cleaned.csv").then(data => {
    if (!data || data.length === 0) {
      console.error("No data loaded or empty dataset");
      return;
    }
    globalData = data;
    populateStateDropdown();
    init();
    updateCharts(currentQuarter);
  }).catch(error => {
    console.error("Error loading CSV:", error);
  });

  document.getElementById("cutoffRange").addEventListener("input", function () {
    document.getElementById("cutoffValue").textContent = this.value;
    embedAltairScatter(currentQuarter);
  });

  document.getElementById("stateDropdown").addEventListener("change", function () {
    selectedState = this.value;
    drawScatterPlot(currentQuarter);
  });

  document.querySelectorAll(".tab-button").forEach(button => {
    button.addEventListener("click", function () {
      document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      currentQuarter = this.getAttribute("data-quarter");
      updateCharts(currentQuarter);
    });
  });
});

function populateStateDropdown() {
  const stateDropdown = document.getElementById("stateDropdown");
  const uniqueStates = Array.from(new Set(globalData.map(d => d.State.trim()).filter(d => d !== "")));

  // Clear existing options
  stateDropdown.innerHTML = "";

  // Add 'ALL' option
  const allOption = document.createElement("option");
  allOption.value = "ALL";
  allOption.textContent = "ALL";
  stateDropdown.appendChild(allOption);

  // Add state options
  uniqueStates.sort().forEach(state => {
    const option = document.createElement("option");
    option.value = state;
    option.textContent = state;
    stateDropdown.appendChild(option);
  });
}


function init() {}

function updateCharts(quarter) {
  drawBarChart(quarter);
  drawMapPlotly(quarter);
  drawScatterPlot(quarter);
  embedAltairScatter(quarter);
  embedAltairHistogram(quarter);
}

function drawBarChart(quarter) {
  const col = "Quarterly Total_" + quarter;
  const data = globalData
    .filter(d => d[col] && !isNaN(parseInt(d[col].replace(/,/g, ''))))
    .sort((a, b) => parseInt(b[col].replace(/,/g, '')) - parseInt(a[col].replace(/,/g, '')))
    .slice(0, 10);

  d3.select("#bar-chart").html("");

  const width = 950;
  const height = 720;  // more height for label space
  const marginBottom = 280;  // significantly more space

  const svg = d3.select("#bar-chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3.scaleBand()
    .domain(data.map(d => d.School))
    .range([70, width - 50])
    .padding(0.3);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => parseInt(d[col].replace(/,/g, '')))])
    .range([height - marginBottom, 50]);

  svg.append("g")
    .attr("transform", `translate(0, ${height - marginBottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-65)")  // more rotation
    .style("text-anchor", "end")
    .style("font-size", "12px")
    .attr("dy", "1.2em")
    .attr("dx", "-0.9em");

  svg.append("g")
    .attr("transform", "translate(70,0)")
    .call(d3.axisLeft(y));

  const tooltip = d3.select("#bar-chart").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  svg.selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", d => x(d.School))
    .attr("y", d => y(parseInt(d[col].replace(/,/g, ''))))
    .attr("width", x.bandwidth())
    .attr("height", d => height - marginBottom - y(parseInt(d[col].replace(/,/g, ''))))
    .attr("fill", "#69b3a2")
    .on("mouseover", function (event, d) {
      d3.select(this).attr("fill", "#4287f5");
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(`${d.School}: ${d[col]}`)
        .style("left", (event.pageX - 80) + "px")
        .style("top", (event.pageY - 50) + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("fill", "#69b3a2");
      tooltip.transition().duration(200).style("opacity", 0);
    });
}


function drawMapPlotly(quarter) {
  const col = "Quarterly Total_" + quarter;
  const stateData = {};

  globalData.forEach(d => {
    const val = parseInt(d[col]?.replace(/,/g, ''));
    if (!isNaN(val)) {
      stateData[d.State] = (stateData[d.State] || 0) + val;
    }
  });

  const states = Object.keys(stateData);
  const rawValues = states.map(s => stateData[s]);
  const logValues = rawValues.map(v => Math.log10(v + 1)); // log transform to reduce skew

  const data = [{
    type: 'choropleth',
    locationmode: 'USA-states',
    locations: states,
    z: logValues,
    text: states.map((s, i) => `${s}<br>${rawValues[i].toLocaleString()} applications`),
    hoverinfo: 'text',
    colorscale: 'YlGnBu',           
    reversescale: true,            
    colorbar: {
      title: `Log FAFSA Apps (${quarter})`,
      tickvals: [0, 1, 2, 3, 4, 5, 6],
      ticktext: ['1', '10', '100', '1k', '10k', '100k', '1M']
    }
  }];

  const layout = {
    geo: {
      scope: 'usa',
    },
    margin: { t: 0, b: 0 }
  };

  Plotly.newPlot('map', data, layout);
}




function drawScatterPlot(quarter) {
  const depCol = `Dependent Students_${quarter}`;
  const indCol = `Independent Students_${quarter}`;

  let data = globalData.filter(d => d[depCol] && d[indCol]);
  
  // Filter by selected state if not "ALL"
  if (selectedState !== "ALL") {
    data = data.filter(d => d.State === selectedState);
  }

  d3.select("#scatter-plot").html("");
  const svg = d3.select("#scatter-plot")
    .append("svg")
    .attr("width", 800)
    .attr("height", 400);

  const margin = { top: 20, right: 30, bottom: 50, left: 60 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => +d[depCol].replace(/,/g, ''))])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => +d[indCol].replace(/,/g, ''))])
    .range([height, 0]);

  // Axes
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  g.append("g")
    .call(d3.axisLeft(y));

  // Scatter points
  g.selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => x(+d[depCol].replace(/,/g, '')))
    .attr("cy", d => y(+d[indCol].replace(/,/g, '')))
    .attr("r", 4)
    .attr("fill", "#1f77b4");

  const xVals = data.map(d => +d[depCol].replace(/,/g, ''));
  const yVals = data.map(d => +d[indCol].replace(/,/g, ''));

  // compute linear regression using least squares
  const n = xVals.length;
  const sumX = d3.sum(xVals);
  const sumY = d3.sum(yVals);
  const sumXY = d3.sum(xVals.map((x, i) => x * yVals[i]));
  const sumX2 = d3.sum(xVals.map(x => x * x));

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  
  const xMin = d3.min(xVals);
  const xMax = d3.max(xVals);
  const yMin = slope * xMin + intercept;
  const yMax = slope * xMax + intercept;

  // draw the line
  g.append("line")
    .attr("x1", x(xMin))
    .attr("y1", y(yMin))
    .attr("x2", x(xMax))
    .attr("y2", y(yMax))
    .attr("stroke", "red")
    .attr("stroke-width", 2);
}

function drawStateSideBySideBarChart(quarter) {
  const depCol = `Dependent Students_${quarter}`;
  const indCol = `Independent Students_${quarter}`;

  const parsed = globalData
    .filter(d => d[depCol] && d[indCol])
    .map(d => ({
      state: d.State,
      dependent: +d[depCol].replace(/,/g, ''),
      independent: +d[indCol].replace(/,/g, '')
    }));

  const stateAgg = d3.rollups(
    parsed,
    v => ({
      dependent: d3.sum(v, d => d.dependent),
      independent: d3.sum(v, d => d.independent)
    }),
    d => d.state
  ).map(([state, values]) => ({ state, ...values }));

  // Select TOP 10 States
  const topStates = stateAgg
    .sort((a, b) => (b.dependent + b.independent) - (a.dependent + a.independent))
    .slice(0, 10);

  d3.select("#state-bar-chart").html("");

  const margin = { top: 30, right: 30, bottom: 70, left: 60 },
        width = 800 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#state-bar-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x0 = d3.scaleBand()
    .domain(topStates.map(d => d.state))
    .range([0, width])
    .padding(0.2);

  const x1 = d3.scaleBand()
    .domain(["Dependent", "Independent"])
    .range([0, x0.bandwidth()])
    .padding(0.05);

  const y = d3.scaleLinear()
    .domain([0, d3.max(topStates, d => Math.max(d.dependent, d.independent))])
    .nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal()
    .domain(["Dependent", "Independent"])
    .range(["#1f77b4", "#ff7f0e"]);

  // X Axis
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x0))
    .selectAll("text")
    .attr("transform", "rotate(-40)")
    .style("text-anchor", "end");

  // Y Axis
  svg.append("g")
    .call(d3.axisLeft(y));

  // Bars
  svg.append("g")
    .selectAll("g")
    .data(topStates)
    .join("g")
    .attr("transform", d => `translate(${x0(d.state)},0)`)
    .selectAll("rect")
    .data(d => [
      { key: "Dependent", value: d.dependent },
      { key: "Independent", value: d.independent }
    ])
    .join("rect")
    .attr("x", d => x1(d.key))
    .attr("y", d => y(d.value))
    .attr("width", x1.bandwidth())
    .attr("height", d => height - y(d.value))
    .attr("fill", d => color(d.key));

  // Legend
  const legend = svg.append("g")
    .attr("transform", `translate(${width - 100}, -20)`);

  ["Dependent", "Independent"].forEach((key, i) => {
    const legendRow = legend.append("g")
      .attr("transform", `translate(0, ${i * 20})`);

    legendRow.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color(key));

    legendRow.append("text")
      .attr("x", 20)
      .attr("y", 10)
      .text(key)
      .attr("text-anchor", "start")
      .style("alignment-baseline", "middle");
  });
}

function updateCharts(quarter) {
  drawBarChart(quarter);
  drawMapPlotly(quarter);
  drawScatterPlot(quarter);
  drawStateSideBySideBarChart(quarter);  
  embedAltairScatter(quarter);
  embedAltairHistogram(quarter);
}

function embedAltairScatter(quarter) {
  const cutoff = +document.getElementById("cutoffRange").value;
  const field = `Quarterly Total_${quarter}`;

  const chart = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    description: "Altair Scatter Plot with Cutoff",
    data: { url: "cleaned.csv" },
    transform: [
      { filter: `datum["${field}"] != null && toNumber(datum["${field}"]) >= ${cutoff}` }
    ],
    mark: "point",
    encoding: {
      x: { field: `Dependent Students_${quarter}`, type: "quantitative" },
      y: { field: `Independent Students_${quarter}`, type: "quantitative" },
      tooltip: [{ field: "School", type: "nominal" }]
    }
  };

  vegaEmbed("#altair-scatter", chart, { actions: false });
}

function embedAltairHistogram(quarter) {
  const chart = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    description: "Altair Histogram",
    data: { url: "cleaned.csv" },
    mark: "bar",
    encoding: {
      x: {
        field: `Quarterly Total_${quarter}`,
        bin: true,
        type: "quantitative",
        title: `FAFSA Total Applications (${quarter})`
      },
      y: { aggregate: "count", type: "quantitative" }
    }
  };
  vegaEmbed("#altair-histogram", chart, { actions: false });
}
