let currentQuarter = "Q1";
let globalData = [];

document.addEventListener("DOMContentLoaded", function () {
  d3.csv("cleaned.csv").then(data => {
    globalData = data;
    init();
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

  document.getElementById("cutoffRange").addEventListener("input", function () {
    document.getElementById("cutoffValue").textContent = this.value;
    embedAltairScatter(currentQuarter);
  });

  document.getElementById("stateSelector").addEventListener("change", function () {
    drawScatterPlot(currentQuarter);
  });
});

function init() {
  const dropdown = document.getElementById("stateSelector");
  const states = Array.from(new Set(globalData.map(d => d.State).filter(Boolean))).sort();
  dropdown.innerHTML = "";
  dropdown.innerHTML = '<option value="ALL">ALL</option>';
  states.forEach(state => {
    if (state.trim()) {
      const option = document.createElement("option");
      option.value = state;
      option.text = state;
      dropdown.appendChild(option);
    }
  });
}

function updateCharts(quarter) {
  drawBarChart(quarter);
  drawMapPlotly(quarter);
  drawScatterPlot(quarter);
  embedAltairScatter(quarter);
  embedAltairHistogram(quarter);
}

function drawBarChart(quarter) {
  const col = "Quarterly Total_" + quarter;
  const data = globalData.filter(d => d[col] && !isNaN(+d[col]));
  const top10 = data.sort((a, b) => +b[col] - +a[col]).slice(0, 10);

  d3.select("#bar-chart").html("");
  const svg = d3.select("#bar-chart").append("svg").attr("width", 800).attr("height", 400);

  const x = d3.scaleBand().domain(top10.map(d => d.School)).range([60, 750]).padding(0.3);
  const y = d3.scaleLinear().domain([0, d3.max(top10, d => +d[col])]).range([350, 50]);

  svg.append("g").attr("transform", "translate(0,350)").call(d3.axisBottom(x)).selectAll("text")
    .attr("transform", "rotate(-40)").style("text-anchor", "end");
  svg.append("g").attr("transform", "translate(60,0)").call(d3.axisLeft(y));

  const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

  svg.selectAll("rect")
    .data(top10)
    .join("rect")
    .attr("x", d => x(d.School))
    .attr("y", d => y(+d[col]))
    .attr("width", x.bandwidth())
    .attr("height", d => 350 - y(+d[col]))
    .attr("fill", "#69b3a2")
    .on("mouseover", function (event, d) {
      d3.select(this).attr("fill", "#4682b4");
      tooltip.transition().duration(200).style("opacity", .9);
      tooltip.html(`${d.School}: ${d[col]}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("fill", "#69b3a2");
      tooltip.transition().duration(500).style("opacity", 0);
    });
}

function drawScatterPlot(quarter) {
  const depCol = "Dependent Students_" + quarter;
  const indCol = "Independent Students_" + quarter;
  const selectedState = document.getElementById("stateSelector").value;

  const data = globalData.filter(d =>
    d[depCol] && d[indCol] &&
    (selectedState === "ALL" || d.State === selectedState)
  );

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
    .attr("r", 3)
    .attr("fill", "#1f77b4")
    .attr("opacity", 0.7);
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
    colorbar: {
      title: `${quarter} Total`,
    },
  }];

  const layout = {
    geo: { scope: 'usa' },
    margin: { t: 0, b: 0 },
  };

  Plotly.newPlot('map', data, layout);
}

function embedAltairScatter(quarter) {
  const cutoff = +document.getElementById("cutoffRange").value;
  document.getElementById("cutoffValue").textContent = cutoff;

  const field = `Quarterly Total_${quarter}`;
  const chart = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: 800,
    height: 400,
    description: "Altair Scatter Plot with Cutoff",
    data: { url: "cleaned.csv" },
    transform: [{ filter: `datum["${field}"] >= ${cutoff}` }],
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
    width: 800,
    height: 400,
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
      y: {
        aggregate: "count",
        type: "quantitative",
        title: "Count of Records"
      }
    }
  };
  vegaEmbed("#altair-histogram", chart, { actions: false });
}
