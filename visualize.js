let selectedQuarter = "Q1";
let globalData = [];
const tooltip = d3.select("body").append("div").attr("class", "tooltip");

function clearContainer(id) {
  d3.select(id).selectAll("*").remove();
}

function updateTabs(q) {
  d3.selectAll(".tab-button")
    .classed("active", false)
    .filter(function() { return this.dataset.quarter === q; })
    .classed("active", true);
}

function drawBarChart(q) {
  clearContainer("#viz1");
  const col = `Quarterly Total_${q}`;
  const data = [...globalData].filter(d => !isNaN(+d[col]));
  const top10 = data.sort((a, b) => d3.descending(+a[col], +b[col])).slice(0, 10);

  const margin = { top: 30, right: 20, bottom: 100, left: 60 };
  const width = 600, height = 400;
  const svg = d3.select("#viz1").append("svg")
    .attr("class", "chart-svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3.scaleBand()
    .domain(top10.map(d => d.School))
    .range([margin.left, width - margin.right])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(top10, d => +d[col])])
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-40)")
    .style("text-anchor", "end");

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  svg.selectAll("rect")
    .data(top10)
    .join("rect")
    .attr("x", d => x(d.School))
    .attr("y", d => y(+d[col]))
    .attr("width", x.bandwidth())
    .attr("height", d => height - margin.bottom - y(+d[col]))
    .attr("fill", "#76a5af")
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1)
             .html(`${d.School}<br>${q}: ${d[col]}`);
    })
    .on("mousemove", event => {
      tooltip.style("left", event.pageX + 10 + "px").style("top", event.pageY + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0));
}

function drawMap(q) {
  clearContainer("#viz2");
  const col = `Quarterly Total_${q}`;
  const width = 960, height = 600;

  const stateRollup = d3.rollups(
    globalData,
    v => d3.sum(v, d => +d[col]),
    d => d.State
  );
  const stateTotals = Object.fromEntries(stateRollup);

  const svg = d3.select("#viz2").append("svg")
    .attr("class", "chart-svg")
    .attr("width", width)
    .attr("height", height);

  const projection = d3.geoAlbersUsa().translate([width / 2, height / 2]).scale(1000);
  const path = d3.geoPath().projection(projection);
  const color = d3.scaleQuantize().domain([0, d3.max(Object.values(stateTotals))]).range(d3.schemeBlues[9]);

  const fipsToState = {
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

  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then(us => {
    svg.selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
      .join("path")
      .attr("d", path)
      .attr("fill", d => {
        const abbr = fipsToState[d.id.toString().padStart(2, "0")];
        return color(stateTotals[abbr] || 0);
      })
      .attr("stroke", "#fff")
      .on("mouseover", (event, d) => {
        const abbr = fipsToState[d.id.toString().padStart(2, "0")];
        tooltip.style("opacity", 1).html(`${abbr}<br>${q}: ${stateTotals[abbr] || 0}`);
      })
      .on("mousemove", event => {
        tooltip.style("left", event.pageX + 10 + "px").style("top", event.pageY + "px");
      })
      .on("mouseout", () => tooltip.style("opacity", 0));
  });
}

function updateCharts(q) {
  updateTabs(q);
  drawBarChart(q);
  drawMap(q);
  // Optional: Update Altair by iframe reload
  document.getElementById("viz4").innerHTML = `<iframe src="altair_scatter_${q}.html" width="100%" height="400"></iframe>`;
  document.getElementById("viz5").innerHTML = `<iframe src="altair_histogram_${q}.html" width="100%" height="400"></iframe>`;
}

d3.csv("cleaned.csv").then(data => {
  globalData = data;
  updateCharts(selectedQuarter);

  d3.selectAll(".tab-button").on("click", function() {
    selectedQuarter = this.dataset.quarter;
    updateCharts(selectedQuarter);
  });
});
