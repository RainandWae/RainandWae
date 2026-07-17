const fs = require("fs");
const path = require("path");

const username = process.env.GITHUB_USERNAME || "RainandWae";
const token = process.env.GITHUB_TOKEN;
const outputDir = path.join(process.cwd(), "dist");
const outputFile = path.join(outputDir, "starry-night-contributions.svg");

const palette = {
  empty: "#171320",
  grid: "#2c2438",
  levels: {
    NONE: "#221b2e",
    FIRST_QUARTILE: "#3a3047",
    SECOND_QUARTILE: "#594070",
    THIRD_QUARTILE: "#7c3aed",
    FOURTH_QUARTILE: "#b14cff",
  },
  glow: "#ead7ff",
  text: "#d9ccf5",
  muted: "#8d7aa8",
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

function starDelay(index, weekday) {
  return ((index * 0.37 + weekday * 0.83) % 18).toFixed(2);
}

function starDuration(index, weekday) {
  return (6.5 + ((index + weekday) % 7) * 0.55).toFixed(2);
}

function renderSvg(calendar) {
  const cell = 11;
  const gap = 4;
  const left = 28;
  const top = 44;
  const weeks = calendar.weeks;
  const width = left * 2 + weeks.length * (cell + gap) - gap;
  const height = 174;

  const stars = [];
  weeks.forEach((week, weekIndex) => {
    week.contributionDays.forEach((day) => {
      const x = left + weekIndex * (cell + gap);
      const y = top + day.weekday * (cell + gap);
      const levelColor = palette.levels[day.contributionLevel] || palette.levels.NONE;
      const delay = starDelay(weekIndex, day.weekday);
      const duration = starDuration(weekIndex, day.weekday);
      const title = `${day.date}: ${day.contributionCount} contribution${day.contributionCount === 1 ? "" : "s"}`;

      stars.push(`
        <g>
          <title>${escapeXml(title)}</title>
          <rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${levelColor}" stroke="${palette.grid}" stroke-width="1">
            <animate attributeName="fill" values="${levelColor};${palette.glow};${levelColor}" begin="${delay}s" dur="${duration}s" repeatCount="indefinite" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" />
            <animate attributeName="opacity" values=".82;1;.82" begin="${delay}s" dur="${duration}s" repeatCount="indefinite" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" />
          </rect>
        </g>`);
    });
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(username)} starry night contribution graph</title>
  <desc id="desc">A GitHub contribution graph using four purple tones with squares that slowly light up and fade like stars.</desc>
  <rect width="${width}" height="${height}" rx="8" fill="${palette.empty}" />
  <text x="${left}" y="24" fill="${palette.text}" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="15" font-weight="600">RainandWae / starry night</text>
  <text x="${width - left}" y="24" text-anchor="end" fill="${palette.muted}" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="12">${calendar.totalContributions} contributions</text>
  <g shape-rendering="geometricPrecision">
    ${stars.join("\n")}
  </g>
  <g transform="translate(${left}, 154)" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="10" fill="${palette.muted}">
    <text x="0" y="0">desaturated</text>
    <rect x="76" y="-9" width="10" height="10" rx="2" fill="${palette.levels.FIRST_QUARTILE}" />
    <rect x="92" y="-9" width="10" height="10" rx="2" fill="${palette.levels.SECOND_QUARTILE}" />
    <rect x="108" y="-9" width="10" height="10" rx="2" fill="${palette.levels.THIRD_QUARTILE}" />
    <rect x="124" y="-9" width="10" height="10" rx="2" fill="${palette.levels.FOURTH_QUARTILE}" />
    <text x="142" y="0">saturated</text>
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

