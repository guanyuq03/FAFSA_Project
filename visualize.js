let globalData = [];
let currentQuarter = "Q1";
let currentCutoff = 0;

// Load data
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

document.getElementById("cutoffSlider").addEventListener("input", function () {
  currentCutoff = +this.value;
  document.getElementById("cutoffValue").innerText = currentCutoff;
  embedAltairScatter(currentQuarter);
});

function init() {
  document.getElementById("cutoffValue").innerText = document.getElementById("cutoffSlider").value;
}

function updateCharts(quarter) {
  drawBarChart(quarter);
  drawMap(quarter);
  drawScatterPlot(quarter);
  embedAltairScatter(quarter);
  embedAltairHistogram(quarter);
}

function drawBarChart(quarter) {
  const col = "Quarterly Total_" + quarter;
  const data = globalData.filter(d => d[col]).sort((a, b) => +b[col] - +a[col]).slice(0, 10);

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
    .attr("fill", "#69b3a2");
}

function drawMap(quarter) {
  const col = "Quarterly Total_" + quarter;
  d3.select("#map").html("");

  const width = 800, height = 500;
  const svg = d3.select("#map").append("svg").attr("width", width).attr("height", height);

  const projection = d3.geoAlbersUsa().translate([width / 2, height / 2]).scale(1000);
  const path = d3.geoPath().projection(projection);

  const totalsByState = {};
  globalData.forEach(d => {
    const state = d.State;
    const val = +d[col];
    if (!isNaN(val)) {
      totalsByState[state] = (totalsByState[state] || 0) + val;
    }
  });

  const color = d3.scaleQuantize()
    .domain([0, d3.max(Object.values(totalsByState))])
    .range(d3.schemeBlues[9]);

  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then(us => {
    const stateIdToAbbr = {
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
        const abbr = stateIdToAbbr[d.id.padStart(2, "0")];
        const val = totalsByState[abbr] || 0;
        return color(val);
      })
      .attr("stroke", "#fff");
  });
}

function drawScatterPlot(quarter) {
  const dep = "Dependent Students_" + quarter;
  const ind = "Independent Students_" + quarter;
  const data = globalData.map(d => ({ x: +d[dep], y: +d[ind] })).filter(d => !isNaN(d.x) && !isNaN(d.y));

  d3.select("#scatter-plot").html("");
  const width = 800, height = 400, margin = 60;

  const svg = d3.select("#scatter-plot").append("svg").attr("width", width).attr("height", height);
  const x = d3.scaleLinear().domain([0, d3.max(data, d => d.x)]).range([margin, width - margin]);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.y)]).range([height - margin, margin]);

  svg.append("g").attr("transform", `translate(0,${height - margin})`).call(d3.axisBottom(x));
  svg.append("g").attr("transform", `translate(${margin},0)`).call(d3.axisLeft(y));

  const brush = d3.brush().extent([[margin, margin], [width - margin, height - margin]])
    .on("brush end", ({ selection }) => {
      if (selection) {
        const [[x0, y0], [x1, y1]] = selection;
        svg.selectAll("circle").attr("fill", d =>
          x(d.x) >= x0 && x(d.x) <= x1 && y(d.y) >= y0 && y(d.y) <= y1 ? "red" : "#1f77b4"
        );
      }
    });

  svg.append("g").call(brush);

  svg.selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => x(d.x))
    .attr("cy", d => y(d.y))
    .attr("r", 4)
    .attr("fill", "#1f77b4");
}

function embedAltairScatter(quarter) {
  const chart = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    description: "Altair Scatter Plot with Cutoff",
    data: { url: "cleaned.csv" },
    transform: [
      { filter: `datum["Quarterly Total_${quarter}"] > ${currentCutoff}` },
      { filter: `datum.State == "CA"` }
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
