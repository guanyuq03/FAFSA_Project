let currentQuarter = "Q1";
let globalData = [];

document.addEventListener("DOMContentLoaded", function () {
  d3.csv("cleaned_final.csv").then(data => {
    globalData = data;
    populateStateDropdown("stateDropdown");
    populateStateDropdown("altairStateDropdown");
    updateCharts(currentQuarter);
  });

  document.getElementById("cutoffRange").addEventListener("input", function () {
    document.getElementById("cutoffValue").textContent = this.value;
    embedAltairScatter(currentQuarter);
  });

  document.getElementById("altairStateDropdown").addEventListener("change", () => {
    embedAltairScatter(currentQuarter);
  });

  document.getElementById("stateDropdown").addEventListener("change", () => {
    updateCharts(currentQuarter);
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

function populateStateDropdown(id) {
  const dropdown = document.getElementById(id);
  if (!dropdown) return;
  const states = Array.from(new Set(globalData.map(d => d.State).filter(s => s)));
  states.sort();
  dropdown.innerHTML = '<option value="ALL">ALL</option>';
  states.forEach(state => {
    if (state.trim()) {
      const option = document.createElement("option");
      option.value = state;
      option.textContent = state;
      dropdown.appendChild(option);
    }
  });
}

function updateCharts(quarter) {
  drawBarChart(quarter);
  drawScatterPlot(quarter);
  drawMapPlotly(quarter);
  embedAltairScatter(quarter);
  embedAltairHistogram(quarter);
}

function drawBarChart(quarter) {
  const col = "Quarterly Total_" + quarter;
  const data = globalData.filter(d => d[col] && !isNaN(+d[col])).sort((a, b) => +b[col] - +a[col]).slice(0, 10);

  d3.select("#bar-chart").html("");
  const svg = d3.select("#bar-chart").append("svg").attr("width", 800).attr("height", 400);
  const x = d3.scaleBand().domain(data.map(d => d.School)).range([60, 750]).padding(0.3);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => +d[col])]).range([350, 50]);

  svg.append("g").attr("transform", "translate(0,350)").call(d3.axisBottom(x)).selectAll("text")
    .attr("transform", "rotate(-40)").style("text-anchor", "end");
  svg.append("g").attr("transform", "translate(60,0)").call(d3.axisLeft(y));

  svg.selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", d => x(d.School))
    .attr("y", d => y(+d[col]))
    .attr("width", x.bandwidth())
    .attr("height", d => 350 - y(+d[col]))
    .attr("fill", "#76a7a7")
    .on("mouseover", function (event, d) {
      d3.select(this).attr("fill", "steelblue");
    })
    .on("mouseout", function () {
      d3.select(this).attr("fill", "#76a7a7");
    })
    .append("title")
    .text(d => `${d.School} : ${+d[col]}`);
}

function drawScatterPlot(quarter) {
  const depCol = "Dependent Students_" + quarter;
  const indCol = "Independent Students_" + quarter;
  const selectedState = document.getElementById("stateDropdown").value;
  let data = globalData.filter(d => d[depCol] && d[indCol]);

  if (selectedState !== "ALL") {
    data = data.filter(d => d.State === selectedState);
  }

  d3.select("#scatter-plot").html("");
  const svg = d3.select("#scatter-plot").append("svg").attr("width", 800).attr("height", 400);
  const x = d3.scaleLinear().domain([0, d3.max(data, d => +d[depCol])]).range([60, 750]);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => +d[indCol])]).range([350, 50]);

  svg.append("g").attr("transform", "translate(0,350)").call(d3.axisBottom(x));
  svg.append("g").attr("transform", "translate(60,0)").call(d3.axisLeft(y));

  svg.selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => x(+d[depCol]))
    .attr("cy", d => y(+d[indCol]))
    .attr("r", 4)
    .attr("fill", "#1f77b4");
}

function drawMapPlotly(quarter) {
  const col = "Quarterly Total_" + quarter;
  const stateData = {};

  globalData.forEach(d => {
    const state = d.State;
    if (!stateData[state]) stateData[state] = 0;
    stateData[state] += +d[col] || 0;
  });

  const states = Object.keys(stateData);
  const values = states.map(s => stateData[s]);

  const data = [{
    type: 'choropleth',
    locationmode: 'USA-states',
    locations: states,
    z: values,
    colorscale: 'Blues',
    colorbar: { title: `${quarter} Total` }
  }];

  const layout = {
    geo: { scope: 'usa' },
    margin: { t: 0, b: 0 }
  };

  Plotly.newPlot('map', data, layout);
}

function embedAltairScatter(quarter) {
  const cutoff = +document.getElementById("cutoffRange").value;
  const selectedState = document.getElementById("altairStateDropdown").value;
  const field = `Quarterly Total_${quarter}`;
  const filters = [
    `datum["${field}"] >= ${cutoff}`
  ];
  if (selectedState !== "ALL") {
    filters.push(`datum.State == "${selectedState}"`);
  }

  const chart = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    data: { url: "cleaned_final.csv" },
    transform: [{ filter: filters.join(" && ") }],
    mark: "point",
    width: 600,
    height: 400,
    encoding: {
      x: { field: `Dependent Students_${quarter}`, type: "quantitative" },
      y: { field: `Independent Students_${quarter}`, type: "quantitative" },
      tooltip: [
        { field: "School", type: "nominal" },
        { field: field, type: "quantitative" }
      ]
    }
  };

  vegaEmbed("#altair-scatter", chart, { actions: false });
}

function embedAltairHistogram(quarter) {
  const chart = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    data: { url: "cleaned_final.csv" },
    mark: "bar",
    width: 600,
    height: 400,
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
