const fs = require("fs");
const path = require("path");

const username = process.env.GITHUB_USERNAME || "RainandWae";
const token = process.env.GITHUB_TOKEN;
const outputDir = path.join(process.cwd(), "dist");
const outputFile = path.join(outputDir, "starry-night-contributions.svg");

const palette = {
  empty: "#0b1020",
  grid: "#23283a",
  levels: {
    NONE: "#161b2d",
    FIRST_QUARTILE: "#073b82", 
    SECOND_QUARTILE: "#1767c2",
    THIRD_QUARTILE: "#4aa7ff",
    FOURTH_QUARTILE: "#9bdcff",
  },
  starMid: "#c99a35",
  glow: "#fff4b8",
  text: "#fff0b3",
  muted: "#b7a777",
  legendText: "#9aa6b2",
};

const query = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
              weekday
            }
          }
        }
      }
    }
  }
`;

async function fetchCalendar() {
  if (!token) {
    return demoCalendar();
  }

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "user-agent": "starry-night-profile-readme",
    },
    body: JSON.stringify({ query, variables: { login: username } }),
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (payload.errors) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }

  return payload.data.user.contributionsCollection.contributionCalendar;
}

function demoCalendar() {
  const weeks = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 52 * 7);

  for (let week = 0; week < 53; week += 1) {
    const contributionDays = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + week * 7 + weekday);
      const wave = Math.sin((week + weekday) / 4) + Math.cos(week / 7);
      const count = Math.max(0, Math.round((wave + 1.5) * Math.random() * 3));
      contributionDays.push({
        date: date.toISOString().slice(0, 10),
        contributionCount: count,
        contributionLevel: levelForCount(count),
        weekday,
      });
    }
    weeks.push({ contributionDays });
  }

  return {
    totalContributions: weeks.flatMap((week) => week.contributionDays)
      .reduce((sum, day) => sum + day.contributionCount, 0),
    weeks,
  };
}

function levelForCount(count) {
  if (count <= 0) return "NONE";
  if (count <= 2) return "FIRST_QUARTILE";
  if (count <= 4) return "SECOND_QUARTILE";
  if (count <= 7) return "THIRD_QUARTILE";
  return "FOURTH_QUARTILE";
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function randomUnit(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function renderMonthLabels(weeks, left, top, cell, gap) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const labels = [];
  let previousMonth = null;

  weeks.forEach((week, weekIndex) => {
    const firstDay = week.contributionDays[0];
    if (!firstDay) return;

    const month = new Date(`${firstDay.date}T00:00:00Z`).getUTCMonth();
    if (month !== previousMonth) {
      labels.push(`<text x="${left + weekIndex * (cell + gap)}" y="${top - 9}">${monthNames[month]}</text>`);
      previousMonth = month;
    }
  });

  return labels.join("\n    ");
}

function renderWeekdayLabels(left, top, cell, gap) {
  return [
    `<text x="${left - 24}" y="${top + 1 * (cell + gap) + 9}">Mon</text>`,
    `<text x="${left - 24}" y="${top + 3 * (cell + gap) + 9}">Wed</text>`,
    `<text x="${left - 24}" y="${top + 5 * (cell + gap) + 9}">Fri</text>`,
  ].join("\n    ");
}

function renderMovingStars(weeks, left, top, cell, gap) {
  const starCount = 6;
  const positionsPerStar = 10;
  const starCells = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  const fadeInSeconds = 1;
  const holdSeconds = 3;
  const fadeOutSeconds = 1;
  const segmentSeconds = fadeInSeconds + holdSeconds + fadeOutSeconds;
  const duration = positionsPerStar * segmentSeconds;
  const innerColumns = Math.max(1, weeks.length - 2);
  const innerRows = 5;
  const totalInnerCells = innerColumns * innerRows;
  const stars = [];

  for (let starIndex = 0; starIndex < starCount; starIndex += 1) {
    const begin = (-1 * randomUnit((starIndex + 1) * 557) * duration).toFixed(2);

    for (let positionIndex = 0; positionIndex < positionsPerStar; positionIndex += 1) {
      const pulseStart = (positionIndex * segmentSeconds) / duration;
      const pulseLit = (positionIndex * segmentSeconds + fadeInSeconds) / duration;
      const pulseHold = (positionIndex * segmentSeconds + fadeInSeconds + holdSeconds) / duration;
      const pulseEnd = ((positionIndex + 1) * segmentSeconds) / duration;
      const cellIndex = Math.floor(randomUnit((starIndex + 1) * 1009 + (positionIndex + 1) * 9176) * totalInnerCells);
      const weekIndex = 1 + (cellIndex % innerColumns);
      const weekday = 1 + (Math.floor(cellIndex / innerColumns) % innerRows);
      const peakOpacity = (0.76 + randomUnit((starIndex + 1) * 353 + (positionIndex + 1) * 1471) * 0.2).toFixed(2);
      const keyTimes = [];
      const opacityValues = [];

      if (pulseStart > 0) {
        keyTimes.push("0", pulseStart.toFixed(4));
        opacityValues.push("0", "0");
      } else {
        keyTimes.push("0");
        opacityValues.push("0");
      }

      keyTimes.push(pulseLit.toFixed(4), pulseHold.toFixed(4), pulseEnd.toFixed(4));
      opacityValues.push(peakOpacity, peakOpacity, "0");

      if (pulseEnd < 1) {
        keyTimes.push("1");
        opacityValues.push("0");
      }

      const plusRects = starCells.map(([columnOffset, rowOffset]) => {
        const isCenter = columnOffset === 0 && rowOffset === 0;
        const x = left + (weekIndex + columnOffset) * (cell + gap);
        const y = top + (weekday + rowOffset) * (cell + gap);
        const fill = isCenter ? palette.glow : "#ffe08a";
        const armOpacity = isCenter ? "1" : "0.88";

        return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${fill}" opacity="${armOpacity}" />`;
      }).join("\n        ");

      stars.push(`
      <g opacity="0" pointer-events="none">
        ${plusRects}
        <animate attributeName="opacity" values="${opacityValues.join(";")}" keyTimes="${keyTimes.join(";")}" dur="${duration}s" begin="${begin}s" repeatCount="indefinite" calcMode="linear" />
      </g>`);
    }
  }

  return stars.join("\n");
}

function renderSvg(calendar) {
  const cell = 11;
  const gap = 4;
  const left = 46;
  const top = 56;
  const weeks = calendar.weeks;
  const width = left + 28 + weeks.length * (cell + gap) - gap;
  const height = 190;
  const monthLabels = renderMonthLabels(weeks, left, top, cell, gap);
  const weekdayLabels = renderWeekdayLabels(left, top, cell, gap);
  const movingStars = renderMovingStars(weeks, left, top, cell, gap);

  const stars = [];
  weeks.forEach((week, weekIndex) => {
    week.contributionDays.forEach((day) => {
      const x = left + weekIndex * (cell + gap);
      const y = top + day.weekday * (cell + gap);
      const levelColor = palette.levels[day.contributionLevel] || palette.levels.NONE;
      const title = `${day.date}: ${day.contributionCount} contribution${day.contributionCount === 1 ? "" : "s"}`;
      const baseOpacity = day.contributionLevel === "NONE" ? ".42" : ".78";

      stars.push(`
        <g>
          <title>${escapeXml(title)}</title>
          <rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${levelColor}" opacity="${baseOpacity}" stroke="${palette.grid}" stroke-width="1" />
        </g>`);
    });
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(username)} star field contribution graph</title>
  <desc id="desc">A blue GitHub contribution graph with a small number of individual squares that brighten and fade like stars at varied speeds.</desc>
  <rect width="${width}" height="${height}" rx="8" fill="${palette.empty}" />
  <text x="${left}" y="24" fill="${palette.text}" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="15" font-weight="600">RainandWae / star field</text>
  <text x="${width - 28}" y="24" text-anchor="end" fill="${palette.muted}" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="12">${calendar.totalContributions} contributions</text>
  <g font-family="Segoe UI, Inter, Arial, sans-serif" font-size="10" fill="${palette.muted}">
    ${monthLabels}
    ${weekdayLabels}
  </g>
  <g shape-rendering="geometricPrecision">
    ${stars.join("\n")}
  </g>
  <g shape-rendering="geometricPrecision">
    ${movingStars}
  </g>
  <g transform="translate(${width - 190}, 169)" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="10" fill="${palette.legendText}">
    <text x="0" y="9">Less</text>
    <rect x="28" y="0" width="10" height="10" rx="2" fill="${palette.levels.NONE}" stroke="${palette.grid}" stroke-width="1" />
    <rect x="43" y="0" width="10" height="10" rx="2" fill="${palette.levels.FIRST_QUARTILE}" opacity=".78" />
    <rect x="58" y="0" width="10" height="10" rx="2" fill="${palette.levels.SECOND_QUARTILE}" opacity=".78" />
    <rect x="73" y="0" width="10" height="10" rx="2" fill="${palette.levels.THIRD_QUARTILE}" opacity=".78" />
    <rect x="88" y="0" width="10" height="10" rx="2" fill="${palette.levels.FOURTH_QUARTILE}" opacity=".78" />
    <text x="106" y="9">More</text>
  </g>
</svg>
`;
}

async function main() {
  const calendar = await fetchCalendar();
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, renderSvg(calendar), "utf8");
  console.log(`Generated ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
