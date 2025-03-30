let currentQuarter = "Q1";
let globalData = [];
let selectedState = "ALL";

document.addEventListener("DOMContentLoaded", function () {
  d3.csv("cleaned.csv").then(data => {
    globalData = data;
    populateStateDropdown();
    init();
    updateCharts(currentQuarter);
  });

  document.getElementById("cutoffRange").addEventListener("input", function () {
    document.getElementById("cutoffValue").textContent = this.value;
    embedAltairScatter(currentQuarter);
  });

  document.getElementById("stateDropdown").addEventListener("change", function () {
    selectedState = this.value;
    embedAltairScatter(currentQuarter);
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
  const dropdown = document.getElementById("stateDropdown");
  const uniqueStates = Array.from(new Set(globalData.map(d => d.State.trim()).filter(Boolean))).sort();

  dropdown.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "ALL";
  allOption.textContent = "ALL";
  dropdown.appendChild(allOption);

  uniqueStates.forEach(state => {
    const opt = document.createElement("option");
    opt.value = state;
    opt.textContent = state;
    dropdown.appendChild(opt);
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

// drawBarChart, drawMapPlotly, drawScatterPlot remain unchanged ...

function embedAltairScatter(quarter) {
  const cutoff = +document.getElementById("cutoffRange").value;
  const stateFilter = selectedState !== "ALL" ? `datum.State == '${selectedState}' &&` : "";
  const field = `Quarterly Total_${quarter}`;

  const chart = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    description: "Altair Scatter Plot with State Filter and Cutoff",
    data: { url: "cleaned.csv" },
    transform: [
      {
        filter: `${stateFilter} datum["${field}"] != null && toNumber(datum["${field}"]) >= ${cutoff}`
      }
    ],
    mark: "point",
    encoding: {
      x: { field: `Dependent Students_${quarter}`, type: "quantitative" },
      y: { field: `Independent Students_${quarter}`, type: "quantitative" },
      tooltip: [
        { field: "School", type: "nominal" },
        { field: "State", type: "nominal" },
        { field: field, type: "quantitative" }
      ]
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
    width: 700,
    height: 350,
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
