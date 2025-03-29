let globalData = [];
let selectedQuarter = "Q1";

document.addEventListener("DOMContentLoaded", function () {
  d3.csv("cleaned.csv").then(data => {
    globalData = data;
    updateAllCharts(selectedQuarter);

    document.querySelectorAll(".tab-button").forEach(btn => {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        selectedQuarter = this.getAttribute("data-quarter");
        updateAllCharts(selectedQuarter);
      });
    });
  });
});

function updateAllCharts(q) {
  drawBarChart(q);
  drawMap(q);
  drawScatterPlot(q);
  embedAltairScatter(q);
  embedAltairHistogram(q);
}

function drawBarChart(quarter) {
  const col = "Quarterly Total_" + quarter;
  const data = [...globalData]
    .filter(d => d[col])
    .sort((a, b) => +b[col] - +a[col])
    .slice(0, 10);

  d3.select("#bar-chart").html("");
  const svg = d3.select("#bar-chart").append("svg").attr("width", 800).attr("height", 400);

  const x = d3.scaleBand().domain(data.map(d => d.School)).range([60, 750]).padding(0.3);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => +d[col])]).range([350, 50]);

  svg.append("g").attr("transform", "translate(0,350)").call(d3.axisBottom(x))
    .selectAll("text").attr("transform", "rotate(-40)").style("text-anchor", "end");

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

function drawScatterPlot(quarter) {
  const depCol = "Dependent Students_" + quarter;
  const indCol = "Independent Students_" + quarter;
  const data = globalData.filter(d => d[depCol] && d[indCol]);

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

function drawMap(quarter) {
  d3.select("#map").html("");
  const col = "Quarterly Total_" + quarter;
  const stateTotals = d3.rollups(globalData, v => d3.sum(v, d => +d[col]), d => d.State);
  const totalsObj = Object.fromEntries(stateTotals);

  const width = 960, height = 500;
  const svg = d3.select("#map").append("svg").attr("width", width).attr("height", height);

  const projection = d3.geoAlbersUsa().scale(1000).translate([width / 2, height / 2]);
  const path = d3.geoPath().projection(projection);

  const colorScale = d3.scaleQuantize()
    .domain([0, d3.max(Object.values(totalsObj))])
    .range(d3.schemeBlues[7]);

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

  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then(us => {
    svg.selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
      .join("path")
      .attr("d", path)
      .attr("fill", d => {
        const abbr = stateIdMap[d.id.padStart(2, "0")];
        const total = totalsObj[abbr] || 0;
        return colorScale(total);
      })
      .attr("stroke", "#fff")
      .on("mouseover", (event, d) => {
        const abbr = stateIdMap[d.id.padStart(2, "0")];
        const total = totalsObj[abbr] || 0;
        d3.select("body").append("div")
          .attr("class", "tooltip")
          .style("opacity", 1)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + "px")
          .html(`State: ${abbr}<br>${quarter} Applications: ${total}`);
      })
      .on("mousemove", event => {
        d3.select(".tooltip")
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + "px");
      })
      .on("mouseout", () => d3.select(".tooltip").remove());
  });
}

function embedAltairScatter(quarter) {
  const chart = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    description: "Altair Scatter Plot",
    data: { url: "cleaned.csv" },
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
        title: `Applications (${quarter})`
      },
      y: { aggregate: "count", type: "quantitative" }
    }
  };
  vegaEmbed("#altair-histogram", chart, { actions: false });
}
